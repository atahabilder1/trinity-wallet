/**
 * Storage interface for Trinity Wallet
 * Platform-agnostic storage abstraction
 */

/**
 * Key-value storage interface
 * Implemented differently for each platform
 */
export interface StorageBackend {
  /**
   * Get a value by key
   * @param key Storage key
   * @returns Value or null if not found
   */
  get(key: string): Promise<string | null>;

  /**
   * Set a value
   * @param key Storage key
   * @param value Value to store
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Delete a value
   * @param key Storage key
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a key exists
   * @param key Storage key
   * @returns True if key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Get all keys
   * @returns Array of keys
   */
  keys(): Promise<string[]>;

  /**
   * Clear all storage
   */
  clear(): Promise<void>;
}

/**
 * In-memory storage implementation (for testing)
 */
export class MemoryStorage implements StorageBackend {
  private store: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

/**
 * LocalStorage implementation (for browser)
 */
export class LocalStorageBackend implements StorageBackend {
  private prefix: string;

  constructor(prefix: string = 'trinity:') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return this.prefix + key;
  }

  async get(key: string): Promise<string | null> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage not available');
    }
    return localStorage.getItem(this.getKey(key));
  }

  async set(key: string, value: string): Promise<void> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage not available');
    }
    localStorage.setItem(this.getKey(key), value);
  }

  async delete(key: string): Promise<void> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage not available');
    }
    localStorage.removeItem(this.getKey(key));
  }

  async has(key: string): Promise<boolean> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage not available');
    }
    return localStorage.getItem(this.getKey(key)) !== null;
  }

  async keys(): Promise<string[]> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage not available');
    }
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key.slice(this.prefix.length));
      }
    }
    return keys;
  }

  async clear(): Promise<void> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage not available');
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Storage keys used by Trinity Wallet
 */
export const STORAGE_KEYS = {
  /** Encrypted vault data */
  VAULT: 'vault',
  /** Account metadata */
  ACCOUNTS: 'accounts',
  /** Network settings */
  NETWORKS: 'networks',
  /** User preferences */
  PREFERENCES: 'preferences',
  /** Transaction history */
  TRANSACTIONS: 'transactions',
  /** Token list */
  TOKENS: 'tokens',
  /** Connected sites */
  CONNECTED_SITES: 'connectedSites',
  /** Address book */
  ADDRESS_BOOK: 'addressBook',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
