/**
 * Keyring - Secure key management
 * Manages private keys for signing operations
 */

import { secp256k1 } from '@noble/curves/secp256k1';
import { hexToBytes, bytesToHex, secureWipe } from '../crypto/random';
import { publicKeyToAddress, hashMessage } from '../crypto/hashing';
import { HDWallet, type DerivedAccount } from './hdwallet';
import { AccountType } from './account';

/**
 * Signature components
 */
export interface Signature {
  r: string;
  s: string;
  v: number;
  /** Full signature as hex (r + s + v) */
  serialized: string;
}

/**
 * Transaction data for signing
 */
export interface UnsignedTransaction {
  chainId: number;
  nonce: number;
  to?: string;
  value: bigint;
  data: string;
  gasLimit: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
  type?: number;
}

/**
 * Key entry in the keyring
 */
interface KeyEntry {
  type: AccountType;
  address: string;
  hdIndex?: number;
}

/**
 * Keyring class for managing signing keys
 */
export class Keyring {
  private hdWallet: HDWallet | null = null;
  private importedKeys: Map<string, Uint8Array> = new Map();
  private keyEntries: Map<string, KeyEntry> = new Map();

  /**
   * Initialize keyring with HD wallet
   *
   * @param mnemonic Mnemonic phrase
   * @param passphrase Optional BIP-39 passphrase
   */
  initializeHdWallet(mnemonic: string, passphrase?: string): void {
    this.hdWallet = HDWallet.fromMnemonic(mnemonic, passphrase);
  }

  /**
   * Check if keyring is initialized
   */
  isInitialized(): boolean {
    return this.hdWallet !== null;
  }

  /**
   * Add HD account to keyring
   *
   * @param index HD derivation index
   * @returns Derived account
   */
  addHdAccount(index: number): DerivedAccount {
    if (!this.hdWallet) {
      throw new Error('HD wallet not initialized');
    }

    const account = this.hdWallet.deriveAccount(index);

    this.keyEntries.set(account.address.toLowerCase(), {
      type: AccountType.HD,
      address: account.address,
      hdIndex: index,
    });

    return account;
  }

  /**
   * Import a private key
   *
   * @param privateKey Private key as hex string
   * @returns Account address
   */
  importPrivateKey(privateKey: string): string {
    // Remove 0x prefix if present
    const keyHex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

    if (keyHex.length !== 64) {
      throw new Error('Invalid private key length');
    }

    const keyBytes = hexToBytes(keyHex);

    // Derive address from private key
    const publicKey = secp256k1.getPublicKey(keyBytes, false);
    const address = publicKeyToAddress(publicKey);

    // Store key
    this.importedKeys.set(address.toLowerCase(), keyBytes);
    this.keyEntries.set(address.toLowerCase(), {
      type: AccountType.IMPORTED,
      address,
    });

    return address;
  }

  /**
   * Check if keyring has a specific address
   *
   * @param address Address to check
   * @returns True if address is in keyring
   */
  hasAddress(address: string): boolean {
    return this.keyEntries.has(address.toLowerCase());
  }

  /**
   * Get all addresses in keyring
   *
   * @returns Array of addresses
   */
  getAddresses(): string[] {
    return Array.from(this.keyEntries.values()).map(e => e.address);
  }

  /**
   * Get private key for an address
   * WARNING: Handle with extreme care!
   *
   * @param address Address to get key for
   * @returns Private key bytes
   */
  private getPrivateKey(address: string): Uint8Array {
    const normalizedAddress = address.toLowerCase();
    const entry = this.keyEntries.get(normalizedAddress);

    if (!entry) {
      throw new Error('Address not found in keyring');
    }

    if (entry.type === AccountType.IMPORTED) {
      const key = this.importedKeys.get(normalizedAddress);
      if (!key) {
        throw new Error('Imported key not found');
      }
      return key;
    }

    if (entry.type === AccountType.HD) {
      if (!this.hdWallet) {
        throw new Error('HD wallet not initialized');
      }
      const account = this.hdWallet.deriveAccount(entry.hdIndex!);
      return hexToBytes(account.privateKey);
    }

    throw new Error('Cannot sign with this account type');
  }

  /**
   * Sign a message hash
   *
   * @param address Address to sign with
   * @param messageHash 32-byte hash to sign
   * @returns Signature
   */
  signHash(address: string, messageHash: Uint8Array): Signature {
    if (messageHash.length !== 32) {
      throw new Error('Message hash must be 32 bytes');
    }

    const privateKey = this.getPrivateKey(address);
    const signature = secp256k1.sign(messageHash, privateKey);

    // Clear private key if it was derived (not imported)
    const entry = this.keyEntries.get(address.toLowerCase());
    if (entry?.type === AccountType.HD) {
      secureWipe(privateKey);
    }

    const r = signature.r.toString(16).padStart(64, '0');
    const s = signature.s.toString(16).padStart(64, '0');
    const v = signature.recovery + 27;

    return {
      r,
      s,
      v,
      serialized: r + s + v.toString(16).padStart(2, '0'),
    };
  }

  /**
   * Sign a personal message (eth_sign / personal_sign)
   *
   * @param address Address to sign with
   * @param message Message to sign
   * @returns Signature
   */
  signMessage(address: string, message: string | Uint8Array): Signature {
    const messageHash = hashMessage(message);
    return this.signHash(address, messageHash);
  }

  /**
   * Sign typed data (EIP-712)
   *
   * @param address Address to sign with
   * @param typedDataHash Hash of typed data
   * @returns Signature
   */
  signTypedData(address: string, typedDataHash: Uint8Array): Signature {
    return this.signHash(address, typedDataHash);
  }

  /**
   * Sign a transaction
   * Note: This returns the signature, not the full signed transaction
   *
   * @param address Address to sign with
   * @param txHash Transaction hash to sign
   * @param chainId Chain ID for EIP-155
   * @returns Signature with adjusted v value
   */
  signTransaction(address: string, txHash: Uint8Array, chainId: number): Signature {
    const privateKey = this.getPrivateKey(address);
    const signature = secp256k1.sign(txHash, privateKey);

    // Clear private key if it was derived
    const entry = this.keyEntries.get(address.toLowerCase());
    if (entry?.type === AccountType.HD) {
      secureWipe(privateKey);
    }

    const r = signature.r.toString(16).padStart(64, '0');
    const s = signature.s.toString(16).padStart(64, '0');

    // EIP-155: v = chainId * 2 + 35 + recovery
    const v = chainId * 2 + 35 + signature.recovery;

    return {
      r,
      s,
      v,
      serialized: r + s + v.toString(16),
    };
  }

  /**
   * Export private key for an address
   * WARNING: Only use for backup purposes!
   *
   * @param address Address to export
   * @returns Private key as hex string
   */
  exportPrivateKey(address: string): string {
    const privateKey = this.getPrivateKey(address);
    const hex = bytesToHex(privateKey);

    // Clear if derived
    const entry = this.keyEntries.get(address.toLowerCase());
    if (entry?.type === AccountType.HD) {
      secureWipe(privateKey);
    }

    return '0x' + hex;
  }

  /**
   * Remove an imported key
   *
   * @param address Address to remove
   */
  removeImportedKey(address: string): void {
    const normalizedAddress = address.toLowerCase();
    const entry = this.keyEntries.get(normalizedAddress);

    if (!entry || entry.type !== AccountType.IMPORTED) {
      throw new Error('Address is not an imported key');
    }

    const key = this.importedKeys.get(normalizedAddress);
    if (key) {
      secureWipe(key);
      this.importedKeys.delete(normalizedAddress);
    }

    this.keyEntries.delete(normalizedAddress);
  }

  /**
   * Clear all keys and destroy keyring
   */
  destroy(): void {
    // Clear all imported keys
    for (const key of this.importedKeys.values()) {
      secureWipe(key);
    }
    this.importedKeys.clear();

    // Clear HD wallet
    if (this.hdWallet) {
      this.hdWallet.destroy();
      this.hdWallet = null;
    }

    // Clear entries
    this.keyEntries.clear();
  }
}

/**
 * Recover signer address from signature
 *
 * @param messageHash Original message hash
 * @param signature Signature
 * @returns Recovered address
 */
export function recoverAddress(messageHash: Uint8Array, signature: Signature): string {
  const sig = secp256k1.Signature.fromCompact(signature.r + signature.s).addRecoveryBit(
    signature.v - 27
  );

  const publicKey = sig.recoverPublicKey(messageHash).toRawBytes(false);
  return publicKeyToAddress(publicKey);
}

/**
 * Verify a signature
 *
 * @param messageHash Original message hash
 * @param signature Signature to verify
 * @param address Expected signer address
 * @returns True if signature is valid
 */
export function verifySignature(
  messageHash: Uint8Array,
  signature: Signature,
  address: string
): boolean {
  try {
    const recovered = recoverAddress(messageHash, signature);
    return recovered.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}
