/**
 * Stealth Addresses Implementation (EIP-5564)
 * Allows receiving funds without linking to your public address
 *
 * How it works:
 * 1. Receiver generates a stealth meta-address (viewing key + spending key)
 * 2. Sender computes a one-time stealth address from the meta-address
 * 3. Sender publishes an ephemeral public key
 * 4. Receiver scans ephemeral keys to find their funds
 * 5. Only receiver can compute the private key for the stealth address
 */

import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, hexToBytes, getRandomBytes } from '../crypto/random';
import { publicKeyToAddress } from '../crypto/hashing';

/**
 * Stealth meta-address components
 */
export interface StealthMetaAddress {
  /** Spending public key (compressed, hex) */
  spendingPublicKey: string;
  /** Viewing public key (compressed, hex) */
  viewingPublicKey: string;
  /** Full stealth meta-address string */
  address: string;
  /** Scheme ID (1 = secp256k1) */
  schemeId: number;
}

/**
 * Stealth address keys (private)
 */
export interface StealthKeys {
  /** Spending private key (hex) */
  spendingPrivateKey: string;
  /** Viewing private key (hex) */
  viewingPrivateKey: string;
  /** Meta-address */
  metaAddress: StealthMetaAddress;
}

/**
 * Generated stealth address for sending
 */
export interface GeneratedStealthAddress {
  /** One-time stealth address */
  stealthAddress: string;
  /** Ephemeral public key (compressed, hex) */
  ephemeralPublicKey: string;
  /** View tag (1 byte, hex) - for efficient scanning */
  viewTag: string;
}

/**
 * Detected stealth payment
 */
export interface StealthPayment {
  /** Stealth address that received funds */
  stealthAddress: string;
  /** Ephemeral public key used */
  ephemeralPublicKey: string;
  /** Private key for the stealth address (hex) */
  stealthPrivateKey: string;
  /** Transaction hash */
  txHash?: string;
  /** Block number */
  blockNumber?: number;
  /** Amount received */
  amount?: bigint;
}

// EIP-5564 scheme ID for secp256k1
const SCHEME_ID = 1;

// Stealth meta-address prefix
const META_ADDRESS_PREFIX = 'st:eth:';

/**
 * Generate stealth keys from HD wallet seed
 * Uses specific derivation paths for stealth keys
 *
 * @param seedPhrase Mnemonic seed phrase
 * @returns Stealth keys
 */
export function generateStealthKeys(spendingKey: Uint8Array, viewingKey: Uint8Array): StealthKeys {
  // Derive public keys
  const spendingPublicKey = secp256k1.getPublicKey(spendingKey, true); // compressed
  const viewingPublicKey = secp256k1.getPublicKey(viewingKey, true); // compressed

  const metaAddress = createStealthMetaAddress(spendingPublicKey, viewingPublicKey);

  return {
    spendingPrivateKey: bytesToHex(spendingKey),
    viewingPrivateKey: bytesToHex(viewingKey),
    metaAddress,
  };
}

/**
 * Generate random stealth keys (for new wallets)
 *
 * @returns Stealth keys
 */
export function generateRandomStealthKeys(): StealthKeys {
  const spendingKey = getRandomBytes(32);
  const viewingKey = getRandomBytes(32);

  return generateStealthKeys(spendingKey, viewingKey);
}

/**
 * Create stealth meta-address from public keys
 */
function createStealthMetaAddress(
  spendingPublicKey: Uint8Array,
  viewingPublicKey: Uint8Array
): StealthMetaAddress {
  const spendingHex = bytesToHex(spendingPublicKey);
  const viewingHex = bytesToHex(viewingPublicKey);

  // Format: st:eth:<scheme_id>:<spending_pubkey><viewing_pubkey>
  const address = `${META_ADDRESS_PREFIX}${SCHEME_ID}:${spendingHex}${viewingHex}`;

  return {
    spendingPublicKey: spendingHex,
    viewingPublicKey: viewingHex,
    address,
    schemeId: SCHEME_ID,
  };
}

/**
 * Parse a stealth meta-address string
 *
 * @param address Stealth meta-address string
 * @returns Parsed meta-address
 */
export function parseStealthMetaAddress(address: string): StealthMetaAddress {
  if (!address.startsWith(META_ADDRESS_PREFIX)) {
    throw new Error('Invalid stealth meta-address prefix');
  }

  const parts = address.slice(META_ADDRESS_PREFIX.length).split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid stealth meta-address format');
  }

  const schemeId = parseInt(parts[0], 10);
  if (schemeId !== SCHEME_ID) {
    throw new Error(`Unsupported scheme ID: ${schemeId}`);
  }

  const keysHex = parts[1];
  if (keysHex.length !== 132) {
    // 66 chars per compressed pubkey * 2
    throw new Error('Invalid stealth meta-address key length');
  }

  const spendingPublicKey = keysHex.slice(0, 66);
  const viewingPublicKey = keysHex.slice(66);

  return {
    spendingPublicKey,
    viewingPublicKey,
    address,
    schemeId,
  };
}

/**
 * Generate a stealth address for sending funds
 * Called by the sender
 *
 * @param metaAddress Recipient's stealth meta-address
 * @returns Generated stealth address and ephemeral key
 */
export function generateStealthAddress(
  metaAddress: StealthMetaAddress | string
): GeneratedStealthAddress {
  const parsed = typeof metaAddress === 'string' ? parseStealthMetaAddress(metaAddress) : metaAddress;

  // Generate random ephemeral private key
  const ephemeralPrivateKey = getRandomBytes(32);
  const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey, true);

  // Parse recipient's public keys
  const spendingPubKey = secp256k1.ProjectivePoint.fromHex(parsed.spendingPublicKey);
  const viewingPubKey = secp256k1.ProjectivePoint.fromHex(parsed.viewingPublicKey);

  // Compute shared secret: ephemeralPrivate * viewingPublic
  const sharedSecretPoint = viewingPubKey.multiply(
    BigInt('0x' + bytesToHex(ephemeralPrivateKey))
  );
  const sharedSecret = sha256(sharedSecretPoint.toRawBytes(true));

  // Compute view tag (first byte of shared secret hash)
  const viewTag = bytesToHex(sharedSecret.slice(0, 1));

  // Compute stealth public key: spendingPublic + hash(sharedSecret) * G
  const hashScalar = BigInt('0x' + bytesToHex(keccak_256(sharedSecret)));
  const hashPoint = secp256k1.ProjectivePoint.BASE.multiply(hashScalar);
  const stealthPubKey = spendingPubKey.add(hashPoint);

  // Derive stealth address from public key
  const stealthAddress = publicKeyToAddress(stealthPubKey.toRawBytes(false));

  return {
    stealthAddress,
    ephemeralPublicKey: bytesToHex(ephemeralPublicKey),
    viewTag,
  };
}

/**
 * Check if an ephemeral public key corresponds to our stealth keys
 * Uses view tag for efficient filtering
 *
 * @param ephemeralPublicKey Ephemeral public key from announcement
 * @param viewTag View tag from announcement
 * @param viewingPrivateKey Our viewing private key
 * @param spendingPublicKey Our spending public key
 * @returns Stealth address if match, null otherwise
 */
export function checkStealthAddress(
  ephemeralPublicKey: string,
  viewTag: string,
  viewingPrivateKey: string,
  spendingPublicKey: string
): { stealthAddress: string; stealthPrivateKey: string } | null {
  try {
    // Parse ephemeral public key
    const ephemeralPubKey = secp256k1.ProjectivePoint.fromHex(ephemeralPublicKey);

    // Compute shared secret: viewingPrivate * ephemeralPublic
    const viewingPriv = BigInt('0x' + viewingPrivateKey);
    const sharedSecretPoint = ephemeralPubKey.multiply(viewingPriv);
    const sharedSecret = sha256(sharedSecretPoint.toRawBytes(true));

    // Check view tag for quick filtering
    const computedViewTag = bytesToHex(sharedSecret.slice(0, 1));
    if (computedViewTag !== viewTag) {
      return null;
    }

    // Compute stealth public key
    const spendingPubKey = secp256k1.ProjectivePoint.fromHex(spendingPublicKey);
    const hashScalar = BigInt('0x' + bytesToHex(keccak_256(sharedSecret)));
    const hashPoint = secp256k1.ProjectivePoint.BASE.multiply(hashScalar);
    const stealthPubKey = spendingPubKey.add(hashPoint);

    // Derive stealth address
    const stealthAddress = publicKeyToAddress(stealthPubKey.toRawBytes(false));

    // We can't compute the private key without the spending private key
    // This function only checks if the stealth address belongs to us
    // The private key is computed separately with computeStealthPrivateKey

    return {
      stealthAddress,
      stealthPrivateKey: '', // Placeholder - computed separately
    };
  } catch {
    return null;
  }
}

/**
 * Compute the private key for a stealth address
 * Called by the receiver to spend funds
 *
 * @param ephemeralPublicKey Ephemeral public key from announcement
 * @param viewingPrivateKey Our viewing private key
 * @param spendingPrivateKey Our spending private key
 * @returns Stealth private key
 */
export function computeStealthPrivateKey(
  ephemeralPublicKey: string,
  viewingPrivateKey: string,
  spendingPrivateKey: string
): string {
  // Parse ephemeral public key
  const ephemeralPubKey = secp256k1.ProjectivePoint.fromHex(ephemeralPublicKey);

  // Compute shared secret
  const viewingPriv = BigInt('0x' + viewingPrivateKey);
  const sharedSecretPoint = ephemeralPubKey.multiply(viewingPriv);
  const sharedSecret = sha256(sharedSecretPoint.toRawBytes(true));

  // Compute hash scalar
  const hashScalar = BigInt('0x' + bytesToHex(keccak_256(sharedSecret)));

  // Compute stealth private key: spendingPrivate + hashScalar
  const spendingPriv = BigInt('0x' + spendingPrivateKey);
  const stealthPriv = (spendingPriv + hashScalar) % secp256k1.CURVE.n;

  return stealthPriv.toString(16).padStart(64, '0');
}

/**
 * Verify a stealth address matches the expected private key
 *
 * @param stealthAddress Expected stealth address
 * @param stealthPrivateKey Computed stealth private key
 * @returns True if they match
 */
export function verifyStealthAddress(stealthAddress: string, stealthPrivateKey: string): boolean {
  try {
    const privateKeyBytes = hexToBytes(stealthPrivateKey);
    const publicKey = secp256k1.getPublicKey(privateKeyBytes, false);
    const derivedAddress = publicKeyToAddress(publicKey);

    return derivedAddress.toLowerCase() === stealthAddress.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Stealth address scanner
 * Scans blockchain announcements for incoming stealth payments
 */
export class StealthScanner {
  private viewingPrivateKey: string;
  private spendingPublicKey: string;
  private spendingPrivateKey: string;
  private scannedPayments: StealthPayment[] = [];

  constructor(stealthKeys: StealthKeys) {
    this.viewingPrivateKey = stealthKeys.viewingPrivateKey;
    this.spendingPrivateKey = stealthKeys.spendingPrivateKey;
    this.spendingPublicKey = stealthKeys.metaAddress.spendingPublicKey;
  }

  /**
   * Scan a single announcement
   *
   * @param ephemeralPublicKey Ephemeral public key
   * @param viewTag View tag
   * @param stealthAddress Stealth address from announcement
   * @param txHash Transaction hash
   * @param blockNumber Block number
   * @param amount Amount received
   * @returns Stealth payment if it belongs to us
   */
  scanAnnouncement(
    ephemeralPublicKey: string,
    viewTag: string,
    stealthAddress: string,
    txHash?: string,
    blockNumber?: number,
    amount?: bigint
  ): StealthPayment | null {
    const match = checkStealthAddress(
      ephemeralPublicKey,
      viewTag,
      this.viewingPrivateKey,
      this.spendingPublicKey
    );

    if (!match) {
      return null;
    }

    // Verify the stealth address matches
    if (match.stealthAddress.toLowerCase() !== stealthAddress.toLowerCase()) {
      return null;
    }

    // Compute the private key
    const stealthPrivateKey = computeStealthPrivateKey(
      ephemeralPublicKey,
      this.viewingPrivateKey,
      this.spendingPrivateKey
    );

    const payment: StealthPayment = {
      stealthAddress,
      ephemeralPublicKey,
      stealthPrivateKey,
      txHash,
      blockNumber,
      amount,
    };

    this.scannedPayments.push(payment);
    return payment;
  }

  /**
   * Get all scanned payments
   */
  getPayments(): StealthPayment[] {
    return [...this.scannedPayments];
  }

  /**
   * Get total balance across all stealth addresses
   */
  getTotalBalance(): bigint {
    return this.scannedPayments.reduce((sum, p) => sum + (p.amount ?? 0n), 0n);
  }

  /**
   * Clear scanned payments
   */
  clearPayments(): void {
    this.scannedPayments = [];
  }
}
