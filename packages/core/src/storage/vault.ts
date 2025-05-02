/**
 * Vault - Secure storage for sensitive wallet data
 * Manages encrypted seed phrases and imported keys
 */

import { encrypt, decrypt, type EncryptedData } from '../crypto/encryption';
import { hashSha256, bytesToHex } from '../crypto/hashing';
import type { StorageBackend } from './interface';
import type { AccountMetadata } from '../wallet/account';

/**
 * Vault data structure (encrypted at rest)
 */
export interface VaultData {
  /** Encrypted mnemonic phrase */
  mnemonic: string;
  /** Imported private keys (address -> encrypted key) */
  importedKeys: Record<string, string>;
  /** Account metadata */
  accounts: AccountMetadata[];
  /** Vault creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  modifiedAt: number;
  /** Vault version for migrations */
  version: number;
}

/**
 * Vault status
 */
export enum VaultStatus {
  /** No vault exists */
  EMPTY = 'empty',
  /** Vault exists but is locked */
  LOCKED = 'locked',
  /** Vault is unlocked */
  UNLOCKED = 'unlocked',
}

/**
 * Vault configuration
 */
export interface VaultConfig {
  /** Storage key for vault data */
  storageKey: string;
  /** Storage key for vault hash (for quick verification) */
  hashKey: string;
}

const DEFAULT_CONFIG: VaultConfig = {
  storageKey: 'trinity:vault',
  hashKey: 'trinity:vault:hash',
};

/**
 * Vault class - manages encrypted wallet data
 */
export class Vault {
  private backend: StorageBackend;
  private config: VaultConfig;
  private password: string | null = null;
  private data: VaultData | null = null;

  /**
   * Create a new Vault instance
   *
   * @param backend Storage backend
   * @param config Optional vault configuration
   */
  constructor(backend: StorageBackend, config: Partial<VaultConfig> = {}) {
    this.backend = backend;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current vault status
   */
  async getStatus(): Promise<VaultStatus> {
    if (this.data !== null) {
      return VaultStatus.UNLOCKED;
    }

    const exists = await this.backend.has(this.config.storageKey);
    return exists ? VaultStatus.LOCKED : VaultStatus.EMPTY;
  }

  /**
   * Check if vault exists
   */
  async exists(): Promise<boolean> {
    return this.backend.has(this.config.storageKey);
  }

  /**
   * Check if vault is unlocked
   */
  isUnlocked(): boolean {
    return this.data !== null && this.password !== null;
  }

  /**
   * Create a new vault with a mnemonic
   *
   * @param mnemonic Mnemonic phrase
   * @param password Encryption password
   * @param initialAccounts Initial account metadata
   */
  async create(
    mnemonic: string,
    password: string,
    initialAccounts: AccountMetadata[] = []
  ): Promise<void> {
    // Check if vault already exists
    const exists = await this.exists();
    if (exists) {
      throw new Error('Vault already exists. Use reset() to clear.');
    }

    const now = Date.now();

    const vaultData: VaultData = {
      mnemonic,
      importedKeys: {},
      accounts: initialAccounts,
      createdAt: now,
      modifiedAt: now,
      version: 1,
    };

    // Encrypt and store
    const encrypted = await encrypt(JSON.stringify(vaultData), password);
    await this.backend.set(this.config.storageKey, JSON.stringify(encrypted));

    // Store hash for quick verification
    const hash = bytesToHex(hashSha256(password));
    await this.backend.set(this.config.hashKey, hash);

    // Set unlocked state
    this.password = password;
    this.data = vaultData;
  }

  /**
   * Unlock the vault with password
   *
   * @param password Vault password
   * @returns True if unlock successful
   */
  async unlock(password: string): Promise<boolean> {
    const stored = await this.backend.get(this.config.storageKey);

    if (!stored) {
      throw new Error('Vault does not exist');
    }

    try {
      const encrypted: EncryptedData = JSON.parse(stored);
      const decrypted = await decrypt(encrypted, password);
      const vaultData: VaultData = JSON.parse(new TextDecoder().decode(decrypted));

      this.password = password;
      this.data = vaultData;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lock the vault (clear password and data from memory)
   */
  lock(): void {
    this.password = null;
    this.data = null;
  }

  /**
   * Get the mnemonic phrase
   * Only available when unlocked
   */
  getMnemonic(): string {
    this.ensureUnlocked();
    return this.data!.mnemonic;
  }

  /**
   * Get all account metadata
   */
  getAccounts(): AccountMetadata[] {
    this.ensureUnlocked();
    return [...this.data!.accounts];
  }

  /**
   * Add or update account metadata
   *
   * @param account Account metadata
   */
  async setAccount(account: AccountMetadata): Promise<void> {
    this.ensureUnlocked();

    const index = this.data!.accounts.findIndex(a => a.id === account.id);
    if (index >= 0) {
      this.data!.accounts[index] = account;
    } else {
      this.data!.accounts.push(account);
    }

    await this.save();
  }

  /**
   * Remove an account
   *
   * @param accountId Account ID to remove
   */
  async removeAccount(accountId: string): Promise<void> {
    this.ensureUnlocked();

    this.data!.accounts = this.data!.accounts.filter(a => a.id !== accountId);
    await this.save();
  }

  /**
   * Import a private key
   *
   * @param address Ethereum address
   * @param privateKey Private key to import (will be encrypted)
   */
  async importKey(address: string, privateKey: string): Promise<void> {
    this.ensureUnlocked();

    // Encrypt the private key separately
    const encrypted = await encrypt(privateKey, this.password!);
    this.data!.importedKeys[address.toLowerCase()] = JSON.stringify(encrypted);

    await this.save();
  }

  /**
   * Get an imported private key
   *
   * @param address Address to get key for
   * @returns Decrypted private key or null
   */
  async getImportedKey(address: string): Promise<string | null> {
    this.ensureUnlocked();

    const encryptedStr = this.data!.importedKeys[address.toLowerCase()];
    if (!encryptedStr) {
      return null;
    }

    const encrypted: EncryptedData = JSON.parse(encryptedStr);
    const decrypted = await decrypt(encrypted, this.password!);
    return new TextDecoder().decode(decrypted);
  }

  /**
   * Remove an imported key
   *
   * @param address Address to remove
   */
  async removeImportedKey(address: string): Promise<void> {
    this.ensureUnlocked();

    delete this.data!.importedKeys[address.toLowerCase()];
    await this.save();
  }

  /**
   * Get list of imported addresses
   */
  getImportedAddresses(): string[] {
    this.ensureUnlocked();
    return Object.keys(this.data!.importedKeys);
  }

  /**
   * Change vault password
   *
   * @param oldPassword Current password
   * @param newPassword New password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    // Verify old password by attempting unlock
    const unlocked = await this.unlock(oldPassword);
    if (!unlocked) {
      throw new Error('Invalid current password');
    }

    // Re-encrypt all imported keys with new password
    const newImportedKeys: Record<string, string> = {};
    for (const [address, encryptedStr] of Object.entries(this.data!.importedKeys)) {
      const encrypted: EncryptedData = JSON.parse(encryptedStr);
      const decrypted = await decrypt(encrypted, oldPassword);
      const reEncrypted = await encrypt(decrypted, newPassword);
      newImportedKeys[address] = JSON.stringify(reEncrypted);
    }

    this.data!.importedKeys = newImportedKeys;
    this.password = newPassword;

    // Save with new password
    await this.save();

    // Update hash
    const hash = bytesToHex(hashSha256(newPassword));
    await this.backend.set(this.config.hashKey, hash);
  }

  /**
   * Export vault data for backup (still encrypted)
   */
  async exportEncrypted(): Promise<string> {
    const stored = await this.backend.get(this.config.storageKey);
    if (!stored) {
      throw new Error('Vault does not exist');
    }
    return stored;
  }

  /**
   * Import vault data from backup
   *
   * @param encryptedData Encrypted vault data
   * @param password Password to verify
   */
  async importEncrypted(encryptedData: string, password: string): Promise<void> {
    // Verify we can decrypt
    const encrypted: EncryptedData = JSON.parse(encryptedData);
    const decrypted = await decrypt(encrypted, password);
    const vaultData: VaultData = JSON.parse(new TextDecoder().decode(decrypted));

    // Store
    await this.backend.set(this.config.storageKey, encryptedData);

    // Update hash
    const hash = bytesToHex(hashSha256(password));
    await this.backend.set(this.config.hashKey, hash);

    // Set unlocked state
    this.password = password;
    this.data = vaultData;
  }

  /**
   * Reset vault (delete all data)
   */
  async reset(): Promise<void> {
    await this.backend.delete(this.config.storageKey);
    await this.backend.delete(this.config.hashKey);
    this.lock();
  }

  /**
   * Save current vault data to storage
   */
  private async save(): Promise<void> {
    this.ensureUnlocked();

    this.data!.modifiedAt = Date.now();

    const encrypted = await encrypt(JSON.stringify(this.data), this.password!);
    await this.backend.set(this.config.storageKey, JSON.stringify(encrypted));
  }

  /**
   * Ensure vault is unlocked
   */
  private ensureUnlocked(): void {
    if (!this.isUnlocked()) {
      throw new Error('Vault is locked');
    }
  }
}
