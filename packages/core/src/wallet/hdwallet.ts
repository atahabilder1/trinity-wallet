/**
 * HD Wallet implementation using BIP-39 and BIP-44
 * Generates deterministic wallets from seed phrases
 */

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import { secp256k1 } from '@noble/curves/secp256k1';
import { bytesToHex, hexToBytes, secureWipe } from '../crypto/random';
import { publicKeyToAddress } from '../crypto/hashing';

// BIP-44 path for Ethereum: m/44'/60'/0'/0/index
const ETH_DERIVATION_PATH = "m/44'/60'/0'/0";

/**
 * Supported mnemonic strengths
 */
export type MnemonicStrength = 12 | 15 | 18 | 21 | 24;

/**
 * Derived account information
 */
export interface DerivedAccount {
  /** Account index */
  index: number;
  /** Derivation path used */
  path: string;
  /** Ethereum address */
  address: string;
  /** Public key (hex) */
  publicKey: string;
  /** Private key (hex) - should be handled carefully! */
  privateKey: string;
}

/**
 * HD Wallet class for managing Ethereum accounts
 */
export class HDWallet {
  private seed: Uint8Array;
  private hdKey: HDKey;

  /**
   * Create HDWallet from existing seed
   * Use static factory methods instead of constructor directly
   */
  private constructor(seed: Uint8Array) {
    this.seed = seed;
    this.hdKey = HDKey.fromMasterSeed(seed);
  }

  /**
   * Generate a new wallet with random mnemonic
   *
   * @param strength Number of words (12, 15, 18, 21, or 24)
   * @returns Object containing mnemonic and wallet instance
   */
  static generate(strength: MnemonicStrength = 12): { mnemonic: string; wallet: HDWallet } {
    const entropyBits = {
      12: 128,
      15: 160,
      18: 192,
      21: 224,
      24: 256,
    }[strength];

    const mnemonic = generateMnemonic(wordlist, entropyBits);
    const wallet = HDWallet.fromMnemonic(mnemonic);

    return { mnemonic, wallet };
  }

  /**
   * Create wallet from existing mnemonic
   *
   * @param mnemonic BIP-39 mnemonic phrase
   * @param passphrase Optional BIP-39 passphrase (not the wallet password)
   * @returns HDWallet instance
   */
  static fromMnemonic(mnemonic: string, passphrase: string = ''): HDWallet {
    // Normalize mnemonic
    const normalized = mnemonic.trim().toLowerCase().split(/\s+/).join(' ');

    if (!validateMnemonic(normalized, wordlist)) {
      throw new Error('Invalid mnemonic phrase');
    }

    const seed = mnemonicToSeedSync(normalized, passphrase);
    return new HDWallet(seed);
  }

  /**
   * Create wallet from seed bytes
   *
   * @param seed Seed bytes (64 bytes)
   * @returns HDWallet instance
   */
  static fromSeed(seed: Uint8Array): HDWallet {
    if (seed.length !== 64) {
      throw new Error('Seed must be 64 bytes');
    }
    return new HDWallet(seed);
  }

  /**
   * Validate a mnemonic phrase
   *
   * @param mnemonic Mnemonic to validate
   * @returns True if valid
   */
  static validateMnemonic(mnemonic: string): boolean {
    const normalized = mnemonic.trim().toLowerCase().split(/\s+/).join(' ');
    return validateMnemonic(normalized, wordlist);
  }

  /**
   * Derive an account at a specific index
   *
   * @param index Account index (0-based)
   * @returns Derived account information
   */
  deriveAccount(index: number): DerivedAccount {
    if (index < 0 || !Number.isInteger(index)) {
      throw new Error('Index must be a non-negative integer');
    }

    const path = `${ETH_DERIVATION_PATH}/${index}`;
    const derived = this.hdKey.derive(path);

    if (!derived.privateKey) {
      throw new Error('Failed to derive private key');
    }

    const privateKey = derived.privateKey;
    const publicKey = secp256k1.getPublicKey(privateKey, false); // Uncompressed
    const address = publicKeyToAddress(publicKey);

    return {
      index,
      path,
      address,
      publicKey: bytesToHex(publicKey),
      privateKey: bytesToHex(privateKey),
    };
  }

  /**
   * Derive multiple accounts
   *
   * @param count Number of accounts to derive
   * @param startIndex Starting index (default: 0)
   * @returns Array of derived accounts
   */
  deriveAccounts(count: number, startIndex: number = 0): DerivedAccount[] {
    const accounts: DerivedAccount[] = [];
    for (let i = 0; i < count; i++) {
      accounts.push(this.deriveAccount(startIndex + i));
    }
    return accounts;
  }

  /**
   * Derive account at custom path
   *
   * @param path Full derivation path
   * @returns Derived account information
   */
  deriveAtPath(path: string): DerivedAccount {
    const derived = this.hdKey.derive(path);

    if (!derived.privateKey) {
      throw new Error('Failed to derive private key');
    }

    const privateKey = derived.privateKey;
    const publicKey = secp256k1.getPublicKey(privateKey, false);
    const address = publicKeyToAddress(publicKey);

    return {
      index: -1, // Custom path, no standard index
      path,
      address,
      publicKey: bytesToHex(publicKey),
      privateKey: bytesToHex(privateKey),
    };
  }

  /**
   * Get the master public key for watch-only derivation
   *
   * @returns Extended public key at account level
   */
  getExtendedPublicKey(): string {
    const accountPath = "m/44'/60'/0'";
    const accountKey = this.hdKey.derive(accountPath);
    return accountKey.publicExtendedKey;
  }

  /**
   * Sign a message hash with a derived account's private key
   *
   * @param messageHash 32-byte message hash
   * @param accountIndex Account index to sign with
   * @returns Signature as { r, s, v } components
   */
  signHash(
    messageHash: Uint8Array,
    accountIndex: number
  ): { r: string; s: string; v: number } {
    if (messageHash.length !== 32) {
      throw new Error('Message hash must be 32 bytes');
    }

    const account = this.deriveAccount(accountIndex);
    const privateKeyBytes = hexToBytes(account.privateKey);

    const signature = secp256k1.sign(messageHash, privateKeyBytes);

    // Clear private key from memory
    secureWipe(privateKeyBytes);

    return {
      r: signature.r.toString(16).padStart(64, '0'),
      s: signature.s.toString(16).padStart(64, '0'),
      v: signature.recovery + 27,
    };
  }

  /**
   * Clear sensitive data from memory
   * Call this when done with the wallet
   */
  destroy(): void {
    secureWipe(this.seed);
  }
}

/**
 * Generate a random mnemonic without creating a wallet
 *
 * @param strength Number of words
 * @returns Mnemonic phrase
 */
export function generateRandomMnemonic(strength: MnemonicStrength = 12): string {
  const entropyBits = {
    12: 128,
    15: 160,
    18: 192,
    21: 224,
    24: 256,
  }[strength];

  return generateMnemonic(wordlist, entropyBits);
}

/**
 * Get the wordlist for mnemonic generation
 */
export function getMnemonicWordlist(): string[] {
  return [...wordlist];
}
