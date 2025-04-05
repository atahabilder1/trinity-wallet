/**
 * Secure random number generation utilities
 * Uses Web Crypto API for cryptographically secure randomness
 */

/**
 * Generate cryptographically secure random bytes
 * @param length Number of bytes to generate
 * @returns Uint8Array of random bytes
 */
export function getRandomBytes(length: number): Uint8Array {
  if (length <= 0) {
    throw new Error('Length must be positive');
  }

  const bytes = new Uint8Array(length);

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    throw new Error('No secure random source available');
  }

  return bytes;
}

/**
 * Generate a random hex string
 * @param length Number of bytes (resulting hex string will be 2x length)
 * @returns Random hex string
 */
export function getRandomHex(length: number): string {
  const bytes = getRandomBytes(length);
  return bytesToHex(bytes);
}

/**
 * Generate a random number within a range
 * @param min Minimum value (inclusive)
 * @param max Maximum value (exclusive)
 * @returns Random number in range
 */
export function getRandomInt(min: number, max: number): number {
  if (min >= max) {
    throw new Error('Min must be less than max');
  }

  const range = max - min;
  const bytes = getRandomBytes(4);
  const value = new DataView(bytes.buffer).getUint32(0, true);

  return min + (value % range);
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }

  return bytes;
}

/**
 * Securely clear sensitive data from memory
 * Note: JavaScript doesn't guarantee memory clearing, but this helps
 */
export function secureWipe(data: Uint8Array): void {
  data.fill(0);
}
