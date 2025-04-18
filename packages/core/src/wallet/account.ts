/**
 * Account management for Trinity Wallet
 * Handles account metadata, naming, and tracking
 */

import type { DerivedAccount } from './hdwallet';

/**
 * Account type enumeration
 */
export enum AccountType {
  /** Standard HD-derived account */
  HD = 'hd',
  /** Imported private key */
  IMPORTED = 'imported',
  /** Hardware wallet account */
  HARDWARE = 'hardware',
  /** Watch-only account */
  WATCH = 'watch',
}

/**
 * Account metadata stored in vault
 */
export interface AccountMetadata {
  /** Unique account ID */
  id: string;
  /** User-defined account name */
  name: string;
  /** Account type */
  type: AccountType;
  /** Ethereum address */
  address: string;
  /** HD derivation index (for HD accounts) */
  hdIndex?: number;
  /** HD derivation path (for HD accounts) */
  hdPath?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last used timestamp */
  lastUsedAt?: number;
  /** Whether this is the primary account */
  isPrimary: boolean;
  /** Custom color for UI */
  color?: string;
  /** Hidden from main list */
  isHidden: boolean;
}

/**
 * Full account with private key access
 */
export interface Account extends AccountMetadata {
  /** Public key (hex) */
  publicKey: string;
  /** Private key (hex) - only available for HD and IMPORTED types */
  privateKey?: string;
}

/**
 * Account manager class
 */
export class AccountManager {
  private accounts: Map<string, AccountMetadata> = new Map();
  private nextHdIndex: number = 0;

  /**
   * Create a new AccountManager
   *
   * @param existingAccounts Optional array of existing accounts to load
   */
  constructor(existingAccounts: AccountMetadata[] = []) {
    for (const account of existingAccounts) {
      this.accounts.set(account.id, account);
      if (account.type === AccountType.HD && account.hdIndex !== undefined) {
        this.nextHdIndex = Math.max(this.nextHdIndex, account.hdIndex + 1);
      }
    }
  }

  /**
   * Add an HD-derived account
   *
   * @param derived Derived account from HDWallet
   * @param name Account name
   * @returns Created account metadata
   */
  addHdAccount(derived: DerivedAccount, name?: string): AccountMetadata {
    const id = `hd-${derived.index}`;
    const isFirst = this.accounts.size === 0;

    const account: AccountMetadata = {
      id,
      name: name || `Account ${derived.index + 1}`,
      type: AccountType.HD,
      address: derived.address,
      hdIndex: derived.index,
      hdPath: derived.path,
      createdAt: Date.now(),
      isPrimary: isFirst,
      isHidden: false,
    };

    this.accounts.set(id, account);
    this.nextHdIndex = Math.max(this.nextHdIndex, derived.index + 1);

    return account;
  }

  /**
   * Add an imported account (from private key)
   *
   * @param address Ethereum address
   * @param name Account name
   * @returns Created account metadata
   */
  addImportedAccount(address: string, name?: string): AccountMetadata {
    const existingCount = Array.from(this.accounts.values()).filter(
      a => a.type === AccountType.IMPORTED
    ).length;

    const id = `imported-${Date.now()}`;

    const account: AccountMetadata = {
      id,
      name: name || `Imported ${existingCount + 1}`,
      type: AccountType.IMPORTED,
      address,
      createdAt: Date.now(),
      isPrimary: this.accounts.size === 0,
      isHidden: false,
    };

    this.accounts.set(id, account);
    return account;
  }

  /**
   * Add a watch-only account
   *
   * @param address Ethereum address to watch
   * @param name Account name
   * @returns Created account metadata
   */
  addWatchAccount(address: string, name?: string): AccountMetadata {
    const existingCount = Array.from(this.accounts.values()).filter(
      a => a.type === AccountType.WATCH
    ).length;

    const id = `watch-${Date.now()}`;

    const account: AccountMetadata = {
      id,
      name: name || `Watch ${existingCount + 1}`,
      type: AccountType.WATCH,
      address,
      createdAt: Date.now(),
      isPrimary: false, // Watch accounts can't be primary
      isHidden: false,
    };

    this.accounts.set(id, account);
    return account;
  }

  /**
   * Get account by ID
   *
   * @param id Account ID
   * @returns Account metadata or undefined
   */
  getAccount(id: string): AccountMetadata | undefined {
    return this.accounts.get(id);
  }

  /**
   * Get account by address
   *
   * @param address Ethereum address
   * @returns Account metadata or undefined
   */
  getAccountByAddress(address: string): AccountMetadata | undefined {
    const normalizedAddress = address.toLowerCase();
    return Array.from(this.accounts.values()).find(
      a => a.address.toLowerCase() === normalizedAddress
    );
  }

  /**
   * Get all accounts
   *
   * @param includeHidden Include hidden accounts
   * @returns Array of account metadata
   */
  getAllAccounts(includeHidden: boolean = false): AccountMetadata[] {
    const accounts = Array.from(this.accounts.values());
    if (includeHidden) {
      return accounts;
    }
    return accounts.filter(a => !a.isHidden);
  }

  /**
   * Get the primary account
   *
   * @returns Primary account or undefined
   */
  getPrimaryAccount(): AccountMetadata | undefined {
    return Array.from(this.accounts.values()).find(a => a.isPrimary);
  }

  /**
   * Set the primary account
   *
   * @param id Account ID to set as primary
   */
  setPrimaryAccount(id: string): void {
    const account = this.accounts.get(id);
    if (!account) {
      throw new Error('Account not found');
    }

    if (account.type === AccountType.WATCH) {
      throw new Error('Watch-only accounts cannot be primary');
    }

    // Unset current primary
    for (const [accountId, acc] of this.accounts) {
      if (acc.isPrimary) {
        this.accounts.set(accountId, { ...acc, isPrimary: false });
      }
    }

    // Set new primary
    this.accounts.set(id, { ...account, isPrimary: true });
  }

  /**
   * Update account name
   *
   * @param id Account ID
   * @param name New name
   */
  renameAccount(id: string, name: string): void {
    const account = this.accounts.get(id);
    if (!account) {
      throw new Error('Account not found');
    }

    this.accounts.set(id, { ...account, name });
  }

  /**
   * Hide or unhide an account
   *
   * @param id Account ID
   * @param hidden Whether to hide
   */
  setAccountHidden(id: string, hidden: boolean): void {
    const account = this.accounts.get(id);
    if (!account) {
      throw new Error('Account not found');
    }

    if (hidden && account.isPrimary) {
      throw new Error('Cannot hide primary account');
    }

    this.accounts.set(id, { ...account, isHidden: hidden });
  }

  /**
   * Remove an account
   *
   * @param id Account ID
   */
  removeAccount(id: string): void {
    const account = this.accounts.get(id);
    if (!account) {
      throw new Error('Account not found');
    }

    if (account.isPrimary) {
      throw new Error('Cannot remove primary account');
    }

    this.accounts.delete(id);
  }

  /**
   * Update last used timestamp
   *
   * @param id Account ID
   */
  touchAccount(id: string): void {
    const account = this.accounts.get(id);
    if (account) {
      this.accounts.set(id, { ...account, lastUsedAt: Date.now() });
    }
  }

  /**
   * Get the next HD index to derive
   *
   * @returns Next available HD index
   */
  getNextHdIndex(): number {
    return this.nextHdIndex;
  }

  /**
   * Export all account metadata for storage
   *
   * @returns Array of account metadata
   */
  export(): AccountMetadata[] {
    return Array.from(this.accounts.values());
  }
}
