/**
 * AES-256-GCM encryption for secure data storage
 * Uses Web Crypto API for hardware-accelerated encryption
 */

import { getRandomBytes, bytesToHex, hexToBytes, secureWipe } from './random';
import { deriveKey } from './hashing';

// Constants
const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // 128 bits authentication tag
const SALT_LENGTH = 32; // 256 bits salt

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  /** Initialization vector (hex) */
  iv: string;
  /** Salt used for key derivation (hex) */
  salt: string;
  /** Encrypted ciphertext with auth tag (hex) */
  ciphertext: string;
  /** Version for future compatibility */
  version: number;
}

/**
 * Encrypt data using AES-256-GCM with password-derived key
 *
 * @param plaintext Data to encrypt (string or Uint8Array)
 * @param password User's password
 * @returns Encrypted data structure
 */
export async function encrypt(
  plaintext: string | Uint8Array,
  password: string
): Promise<EncryptedData> {
  // Generate random salt and IV
  const salt = getRandomBytes(SALT_LENGTH);
  const iv = getRandomBytes(IV_LENGTH);

  // Derive key from password
  const keyMaterial = deriveKey(password, salt);

  // Import key for Web Crypto API
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new Uint8Array(keyMaterial).buffer as ArrayBuffer,
    { name: ALGORITHM },
    false,
    ['encrypt']
  );

  // Encrypt data
  const dataBuffer = typeof plaintext === 'string'
    ? new TextEncoder().encode(plaintext).buffer as ArrayBuffer
    : new Uint8Array(plaintext).buffer as ArrayBuffer;
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: new Uint8Array(iv).buffer as ArrayBuffer,
      tagLength: TAG_LENGTH,
    },
    cryptoKey,
    dataBuffer
  );

  // Clear sensitive data from memory
  secureWipe(keyMaterial);

  return {
    iv: bytesToHex(iv),
    salt: bytesToHex(salt),
    ciphertext: bytesToHex(new Uint8Array(ciphertext)),
    version: 1,
  };
}

/**
 * Decrypt data using AES-256-GCM with password-derived key
 *
 * @param encrypted Encrypted data structure
 * @param password User's password
 * @returns Decrypted data as Uint8Array
 * @throws Error if decryption fails (wrong password or tampered data)
 */
export async function decrypt(
  encrypted: EncryptedData,
  password: string
): Promise<Uint8Array> {
  if (encrypted.version !== 1) {
    throw new Error(`Unsupported encryption version: ${encrypted.version}`);
  }

  // Convert hex strings to bytes
  const iv = hexToBytes(encrypted.iv);
  const salt = hexToBytes(encrypted.salt);
  const ciphertext = hexToBytes(encrypted.ciphertext);

  // Derive key from password
  const keyMaterial = deriveKey(password, salt);

  // Import key for Web Crypto API
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new Uint8Array(keyMaterial).buffer as ArrayBuffer,
    { name: ALGORITHM },
    false,
    ['decrypt']
  );

  try {
    // Decrypt data
    const plaintext = await globalThis.crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: new Uint8Array(iv).buffer as ArrayBuffer,
        tagLength: TAG_LENGTH,
      },
      cryptoKey,
      new Uint8Array(ciphertext).buffer as ArrayBuffer
    );

    // Clear sensitive data from memory
    secureWipe(keyMaterial);

    return new Uint8Array(plaintext);
  } catch {
    // Clear sensitive data from memory
    secureWipe(keyMaterial);
    throw new Error('Decryption failed: Invalid password or corrupted data');
  }
}

/**
 * Decrypt data and return as string
 *
 * @param encrypted Encrypted data structure
 * @param password User's password
 * @returns Decrypted string
 */
export async function decryptToString(
  encrypted: EncryptedData,
  password: string
): Promise<string> {
  const bytes = await decrypt(encrypted, password);
  return new TextDecoder().decode(bytes);
}

/**
 * Encrypt an object as JSON
 *
 * @param obj Object to encrypt
 * @param password User's password
 * @returns Encrypted data structure
 */
export async function encryptJson<T>(obj: T, password: string): Promise<EncryptedData> {
  const json = JSON.stringify(obj);
  return encrypt(json, password);
}

/**
 * Decrypt to an object from JSON
 *
 * @param encrypted Encrypted data structure
 * @param password User's password
 * @returns Decrypted object
 */
export async function decryptJson<T>(
  encrypted: EncryptedData,
  password: string
): Promise<T> {
  const json = await decryptToString(encrypted, password);
  return JSON.parse(json) as T;
}

/**
 * Check if data is encrypted with valid structure
 *
 * @param data Data to check
 * @returns True if data appears to be encrypted
 */
export function isEncrypted(data: unknown): data is EncryptedData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const encrypted = data as EncryptedData;

  return (
    typeof encrypted.iv === 'string' &&
    typeof encrypted.salt === 'string' &&
    typeof encrypted.ciphertext === 'string' &&
    typeof encrypted.version === 'number' &&
    encrypted.iv.length === IV_LENGTH * 2 &&
    encrypted.salt.length === SALT_LENGTH * 2
  );
}
