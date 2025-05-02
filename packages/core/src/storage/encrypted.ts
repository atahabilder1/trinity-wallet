/**
 * Encrypted storage layer
 * Wraps storage backend with encryption
 */

import { encrypt, decrypt, encryptJson, decryptJson, type EncryptedData } from '../crypto/encryption';
import type { StorageBackend } from './interface';

/**
 * Encrypted storage wrapper
 * All data is encrypted before storage
 */
export class EncryptedStorage {
  private backend: StorageBackend;
  private password: string | null = null;

  /**
   * Create encrypted storage
   *
   * @param backend Storage backend to wrap
   */
  constructor(backend: StorageBackend) {
    this.backend = backend;
  }

  /**
   * Set the encryption password
   * Must be called before any encrypted operations
   *
   * @param password Encryption password
   */
  setPassword(password: string): void {
    this.password = password;
  }

  /**
   * Clear the password from memory
   */
  clearPassword(): void {
    this.password = null;
  }

  /**
   * Check if password is set
   */
  isUnlocked(): boolean {
    return this.password !== null;
  }

  /**
   * Ensure password is set
   */
  private ensureUnlocked(): string {
    if (!this.password) {
      throw new Error('Storage is locked. Call setPassword() first.');
    }
    return this.password;
  }

  /**
   * Store encrypted string
   *
   * @param key Storage key
   * @param value Value to encrypt and store
   */
  async setEncrypted(key: string, value: string): Promise<void> {
    const password = this.ensureUnlocked();
    const encrypted = await encrypt(value, password);
    await this.backend.set(key, JSON.stringify(encrypted));
  }

  /**
   * Retrieve and decrypt string
   *
   * @param key Storage key
   * @returns Decrypted value or null
   */
  async getEncrypted(key: string): Promise<string | null> {
    const password = this.ensureUnlocked();
    const stored = await this.backend.get(key);

    if (!stored) {
      return null;
    }

    const encrypted: EncryptedData = JSON.parse(stored);
    const decrypted = await decrypt(encrypted, password);
    return new TextDecoder().decode(decrypted);
  }

  /**
   * Store encrypted JSON object
   *
   * @param key Storage key
   * @param value Object to encrypt and store
   */
  async setEncryptedJson<T>(key: string, value: T): Promise<void> {
    const password = this.ensureUnlocked();
    const encrypted = await encryptJson(value, password);
    await this.backend.set(key, JSON.stringify(encrypted));
  }

  /**
   * Retrieve and decrypt JSON object
   *
   * @param key Storage key
   * @returns Decrypted object or null
   */
  async getEncryptedJson<T>(key: string): Promise<T | null> {
    const password = this.ensureUnlocked();
    const stored = await this.backend.get(key);

    if (!stored) {
      return null;
    }

    const encrypted: EncryptedData = JSON.parse(stored);
    return decryptJson<T>(encrypted, password);
  }

  /**
   * Store unencrypted value (for non-sensitive data)
   *
   * @param key Storage key
   * @param value Value to store
   */
  async set(key: string, value: string): Promise<void> {
    await this.backend.set(key, value);
  }

  /**
   * Retrieve unencrypted value
   *
   * @param key Storage key
   * @returns Value or null
   */
  async get(key: string): Promise<string | null> {
    return this.backend.get(key);
  }

  /**
   * Store unencrypted JSON
   *
   * @param key Storage key
   * @param value Object to store
   */
  async setJson<T>(key: string, value: T): Promise<void> {
    await this.backend.set(key, JSON.stringify(value));
  }

  /**
   * Retrieve unencrypted JSON
   *
   * @param key Storage key
   * @returns Object or null
   */
  async getJson<T>(key: string): Promise<T | null> {
    const stored = await this.backend.get(key);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as T;
  }

  /**
   * Delete a value
   *
   * @param key Storage key
   */
  async delete(key: string): Promise<void> {
    await this.backend.delete(key);
  }

  /**
   * Check if key exists
   *
   * @param key Storage key
   * @returns True if exists
   */
  async has(key: string): Promise<boolean> {
    return this.backend.has(key);
  }

  /**
   * Get all keys
   *
   * @returns Array of keys
   */
  async keys(): Promise<string[]> {
    return this.backend.keys();
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    await this.backend.clear();
  }

  /**
   * Verify password is correct by attempting decryption
   *
   * @param key Key with encrypted data
   * @param password Password to verify
   * @returns True if password is correct
   */
  async verifyPassword(key: string, password: string): Promise<boolean> {
    const stored = await this.backend.get(key);

    if (!stored) {
      return false;
    }

    try {
      const encrypted: EncryptedData = JSON.parse(stored);
      await decrypt(encrypted, password);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Change encryption password
   * Re-encrypts all data with new password
   *
   * @param oldPassword Current password
   * @param newPassword New password
   * @param encryptedKeys Keys that contain encrypted data
   */
  async changePassword(
    oldPassword: string,
    newPassword: string,
    encryptedKeys: string[]
  ): Promise<void> {
    // Verify old password
    if (encryptedKeys.length > 0) {
      const isValid = await this.verifyPassword(encryptedKeys[0], oldPassword);
      if (!isValid) {
        throw new Error('Invalid current password');
      }
    }

    // Re-encrypt all data
    for (const key of encryptedKeys) {
      const stored = await this.backend.get(key);
      if (!stored) continue;

      const encrypted: EncryptedData = JSON.parse(stored);
      const decrypted = await decrypt(encrypted, oldPassword);
      const reEncrypted = await encrypt(decrypted, newPassword);

      await this.backend.set(key, JSON.stringify(reEncrypted));
    }

    // Update stored password
    this.password = newPassword;
  }
}
