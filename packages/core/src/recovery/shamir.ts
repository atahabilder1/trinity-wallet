/**
 * Shamir Secret Sharing
 *
 * Splits a secret into multiple shares where a threshold
 * number of shares is needed to reconstruct the secret
 */

import { getRandomBytes, bytesToHex, hexToBytes } from '../crypto/random';
import type { ShamirShare } from './types';

// Large prime for finite field operations (256-bit)
const PRIME = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');

/**
 * Split a secret into shares using Shamir's Secret Sharing
 */
export function splitSecret(
  secret: string | Uint8Array,
  threshold: number,
  totalShares: number
): ShamirShare[] {
  if (threshold > totalShares) {
    throw new Error('Threshold cannot be greater than total shares');
  }
  if (threshold < 2) {
    throw new Error('Threshold must be at least 2');
  }
  if (totalShares > 255) {
    throw new Error('Maximum 255 shares supported');
  }

  // Convert secret to BigInt
  const secretBytes = typeof secret === 'string' ? hexToBytes(secret) : secret;
  const secretBigInt = bytesToBigInt(secretBytes);

  // Generate random coefficients for polynomial
  const coefficients: bigint[] = [secretBigInt]; // a0 = secret
  for (let i = 1; i < threshold; i++) {
    const randBytes = getRandomBytes(32);
    coefficients.push(mod(bytesToBigInt(randBytes), PRIME));
  }

  // Generate shares
  const shares: ShamirShare[] = [];
  for (let x = 1; x <= totalShares; x++) {
    const y = evaluatePolynomial(coefficients, BigInt(x));
    shares.push({
      index: x,
      value: bigIntToHex(y),
    });
  }

  return shares;
}

/**
 * Reconstruct secret from shares using Lagrange interpolation
 */
export function combineShares(shares: ShamirShare[]): string {
  if (shares.length < 2) {
    throw new Error('At least 2 shares required');
  }

  // Convert shares to BigInt
  const points: Array<{ x: bigint; y: bigint }> = shares.map(share => ({
    x: BigInt(share.index),
    y: hexToBigInt(share.value),
  }));

  // Lagrange interpolation to find f(0)
  let secret = 0n;

  for (let i = 0; i < points.length; i++) {
    let numerator = 1n;
    let denominator = 1n;

    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        numerator = mod(numerator * (0n - points[j].x), PRIME);
        denominator = mod(denominator * (points[i].x - points[j].x), PRIME);
      }
    }

    const lagrangeCoeff = mod(numerator * modInverse(denominator, PRIME), PRIME);
    secret = mod(secret + points[i].y * lagrangeCoeff, PRIME);
  }

  return bigIntToHex(secret);
}

/**
 * Verify that shares are valid and consistent
 */
export function verifyShares(shares: ShamirShare[], threshold: number): boolean {
  if (shares.length < threshold) {
    return false;
  }

  try {
    // Try to combine with different subsets
    const subset1 = shares.slice(0, threshold);
    const subset2 = shares.slice(shares.length - threshold);

    const secret1 = combineShares(subset1);
    const secret2 = combineShares(subset2);

    return secret1 === secret2;
  } catch {
    return false;
  }
}

/**
 * Evaluate polynomial at x
 */
function evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
  let result = 0n;
  let xPow = 1n;

  for (const coeff of coefficients) {
    result = mod(result + coeff * xPow, PRIME);
    xPow = mod(xPow * x, PRIME);
  }

  return result;
}

/**
 * Modular arithmetic
 */
function mod(n: bigint, m: bigint): bigint {
  return ((n % m) + m) % m;
}

/**
 * Modular multiplicative inverse using extended Euclidean algorithm
 */
function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];

  while (r !== 0n) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }

  return mod(old_s, m);
}

/**
 * Convert bytes to BigInt
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}

/**
 * Convert BigInt to hex string
 */
function bigIntToHex(n: bigint): string {
  const hex = n.toString(16);
  return hex.length % 2 === 0 ? hex : '0' + hex;
}

/**
 * Convert hex string to BigInt
 */
function hexToBigInt(hex: string): bigint {
  return BigInt('0x' + hex);
}

/**
 * Generate a random share index not in the existing set
 */
export function generateUniqueIndex(existingIndices: number[]): number {
  const existing = new Set(existingIndices);
  let index: number;
  do {
    const bytes = getRandomBytes(1);
    index = (bytes[0] % 254) + 1; // 1-255
  } while (existing.has(index));
  return index;
}

/**
 * Refresh shares without changing the secret
 * Returns new shares that can reconstruct the same secret
 */
export function refreshShares(
  oldShares: ShamirShare[],
  threshold: number,
  newIndices: number[]
): ShamirShare[] {
  // Reconstruct the secret
  const secret = combineShares(oldShares.slice(0, threshold));

  // Generate new shares with new indices
  const newShares: ShamirShare[] = [];
  const secretBigInt = hexToBigInt(secret);

  // Generate new random coefficients
  const coefficients: bigint[] = [secretBigInt];
  for (let i = 1; i < threshold; i++) {
    const randBytes = getRandomBytes(32);
    coefficients.push(mod(bytesToBigInt(randBytes), PRIME));
  }

  // Generate new shares
  for (const index of newIndices) {
    const y = evaluatePolynomial(coefficients, BigInt(index));
    newShares.push({
      index,
      value: bigIntToHex(y),
    });
  }

  return newShares;
}
