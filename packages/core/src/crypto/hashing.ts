/**
 * Cryptographic hashing utilities
 * Uses @noble/hashes for secure, audited implementations
 */

import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { keccak_256 } from '@noble/hashes/sha3';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { bytesToHex, hexToBytes } from './random';

/**
 * SHA-256 hash
 * @param data Data to hash (string or Uint8Array)
 * @returns Hash as Uint8Array
 */
export function hashSha256(data: string | Uint8Array): Uint8Array {
  const input = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return sha256(input);
}

/**
 * SHA-256 hash returning hex string
 * @param data Data to hash (string or Uint8Array)
 * @returns Hash as hex string
 */
export function sha256Hex(data: string | Uint8Array): string {
  return bytesToHex(hashSha256(data));
}

/**
 * SHA-512 hash
 * @param data Data to hash (string or Uint8Array)
 * @returns Hash as Uint8Array
 */
export function hashSha512(data: string | Uint8Array): Uint8Array {
  const input = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return sha512(input);
}

/**
 * Keccak-256 hash (used in Ethereum for addresses)
 * @param data Data to hash (string or Uint8Array)
 * @returns Hash as Uint8Array
 */
export function hashKeccak256(data: string | Uint8Array): Uint8Array {
  const input = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return keccak_256(input);
}

/**
 * Derive encryption key from password using PBKDF2
 * Uses high iteration count for security
 *
 * @param password User's password
 * @param salt Random salt (should be stored with encrypted data)
 * @param iterations Number of iterations (default: 600000 as per OWASP 2023)
 * @param keyLength Desired key length in bytes (default: 32 for AES-256)
 * @returns Derived key as Uint8Array
 */
export function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = 600000,
  keyLength: number = 32
): Uint8Array {
  const passwordBytes = new TextEncoder().encode(password);
  return pbkdf2(sha256, passwordBytes, salt, { c: iterations, dkLen: keyLength });
}

/**
 * Derive Ethereum address from public key
 * Takes last 20 bytes of Keccak-256 hash
 *
 * @param publicKey Public key bytes (uncompressed, without 0x04 prefix)
 * @returns Ethereum address with 0x prefix
 */
export function publicKeyToAddress(publicKey: Uint8Array): string {
  // Remove 0x04 prefix if present (uncompressed public key marker)
  const key = publicKey.length === 65 ? publicKey.slice(1) : publicKey;

  if (key.length !== 64) {
    throw new Error('Invalid public key length');
  }

  const hash = hashKeccak256(key);
  const addressBytes = hash.slice(-20);

  return checksumAddress('0x' + bytesToHex(addressBytes));
}

/**
 * Convert address to checksum format (EIP-55)
 * @param address Ethereum address
 * @returns Checksummed address
 */
export function checksumAddress(address: string): string {
  const addr = address.toLowerCase().replace('0x', '');
  const hash = bytesToHex(hashKeccak256(addr));

  let checksummed = '0x';
  for (let i = 0; i < addr.length; i++) {
    if (parseInt(hash[i], 16) >= 8) {
      checksummed += addr[i].toUpperCase();
    } else {
      checksummed += addr[i];
    }
  }

  return checksummed;
}

/**
 * Verify address checksum
 * @param address Address to verify
 * @returns True if checksum is valid
 */
export function verifyChecksum(address: string): boolean {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return false;
  }

  return checksumAddress(address) === address;
}

/**
 * Hash message for Ethereum personal_sign
 * Prepends "\x19Ethereum Signed Message:\n" + length
 *
 * @param message Message to hash
 * @returns Hash ready for signing
 */
export function hashMessage(message: string | Uint8Array): Uint8Array {
  const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;

  const prefix = `\x19Ethereum Signed Message:\n${messageBytes.length}`;
  const prefixBytes = new TextEncoder().encode(prefix);

  const combined = new Uint8Array(prefixBytes.length + messageBytes.length);
  combined.set(prefixBytes);
  combined.set(messageBytes, prefixBytes.length);

  return hashKeccak256(combined);
}

// Re-export sha256 for direct use
export { sha256 } from '@noble/hashes/sha256';

export { bytesToHex, hexToBytes };
