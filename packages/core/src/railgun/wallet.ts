/**
 * Railgun Wallet
 *
 * Manages Railgun wallet derivation and encrypted balances
 */

import { sha256Hex } from '../crypto/hashing';
import { getRandomBytes, bytesToHex } from '../crypto/random';
import type {
  RailgunWallet,
  ShieldedBalance,
  UTXO,
  RailgunNetworkName,
} from './types';
import { RailgunClient } from './client';

// Railgun address prefix
const RAILGUN_ADDRESS_PREFIX = '0zk';

/**
 * Railgun Wallet Manager
 */
export class RailgunWalletManager {
  private wallets: Map<string, RailgunWallet> = new Map();
  private utxos: Map<string, UTXO[]> = new Map();
  private client: RailgunClient;
  private storage: Storage | null;
  private storageKey = 'trinity_railgun_wallets';

  constructor(client: RailgunClient, storage?: Storage) {
    this.client = client;
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.loadWallets();
  }

  /**
   * Create a Railgun wallet from mnemonic
   */
  async createWallet(mnemonic: string, index: number = 0): Promise<RailgunWallet> {
    // Derive Railgun keys from mnemonic
    // In production, this uses specific BIP derivation paths for Railgun

    const path = `m/44'/3820'/0'/${index}`;
    const seed = sha256Hex(mnemonic + path);

    // Derive viewing and spending keys
    const viewingKey = sha256Hex(seed + 'viewing');
    const spendingKey = sha256Hex(seed + 'spending');

    // Generate Railgun address
    const railgunAddress = this.deriveRailgunAddress(viewingKey, spendingKey);

    const wallet: RailgunWallet = {
      id: bytesToHex(getRandomBytes(8)),
      railgunAddress,
      viewingKey,
      spendingKey,
      createdAt: Date.now(),
    };

    this.wallets.set(wallet.id, wallet);
    this.saveWallets();

    return wallet;
  }

  /**
   * Import existing Railgun wallet
   */
  importWallet(viewingKey: string, spendingKey: string): RailgunWallet {
    const railgunAddress = this.deriveRailgunAddress(viewingKey, spendingKey);

    const wallet: RailgunWallet = {
      id: bytesToHex(getRandomBytes(8)),
      railgunAddress,
      viewingKey,
      spendingKey,
      createdAt: Date.now(),
    };

    this.wallets.set(wallet.id, wallet);
    this.saveWallets();

    return wallet;
  }

  /**
   * Get wallet by ID
   */
  getWallet(id: string): RailgunWallet | undefined {
    return this.wallets.get(id);
  }

  /**
   * Get all wallets
   */
  getAllWallets(): RailgunWallet[] {
    return Array.from(this.wallets.values());
  }

  /**
   * Get Railgun address for a wallet
   */
  getRailgunAddress(walletId: string): string | null {
    const wallet = this.wallets.get(walletId);
    return wallet?.railgunAddress || null;
  }

  /**
   * Get shielded balances for a wallet
   */
  async getShieldedBalances(walletId: string): Promise<ShieldedBalance[]> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // In production, this would:
    // 1. Scan the blockchain for encrypted notes
    // 2. Try to decrypt each note with the viewing key
    // 3. Sum up the UTXOs for each token

    const utxos = this.utxos.get(walletId) || [];
    const balancesByToken = new Map<string, bigint>();

    for (const utxo of utxos) {
      const current = balancesByToken.get(utxo.tokenAddress) || 0n;
      balancesByToken.set(utxo.tokenAddress, current + BigInt(utxo.amount));
    }

    const balances: ShieldedBalance[] = [];
    for (const [tokenAddress, balance] of balancesByToken) {
      balances.push({
        tokenAddress,
        symbol: '', // Would be fetched from token contract
        decimals: 18,
        balance: balance.toString(),
        balanceFormatted: formatBalance(balance, 18),
      });
    }

    return balances;
  }

  /**
   * Scan for new UTXOs
   */
  async scanForUTXOs(walletId: string): Promise<number> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // In production, this would:
    // 1. Query the Railgun contract for new commitments
    // 2. Try to decrypt each commitment with the viewing key
    // 3. Add decrypted UTXOs to the wallet's UTXO set

    // Simulated - return 0 new UTXOs found
    return 0;
  }

  /**
   * Get UTXOs for a specific token
   */
  getUTXOs(walletId: string, tokenAddress: string): UTXO[] {
    const allUtxos = this.utxos.get(walletId) || [];
    return allUtxos.filter(u => u.tokenAddress.toLowerCase() === tokenAddress.toLowerCase());
  }

  /**
   * Add a UTXO to the wallet (after successful shield/receive)
   */
  addUTXO(walletId: string, utxo: UTXO): void {
    const utxos = this.utxos.get(walletId) || [];
    utxos.push(utxo);
    this.utxos.set(walletId, utxos);
  }

  /**
   * Mark UTXOs as spent (after successful transfer/unshield)
   */
  markUTXOsSpent(walletId: string, nullifiers: string[]): void {
    const utxos = this.utxos.get(walletId) || [];
    const remaining = utxos.filter(u => !nullifiers.includes(u.nullifier));
    this.utxos.set(walletId, remaining);
  }

  /**
   * Delete a wallet
   */
  deleteWallet(walletId: string): boolean {
    const deleted = this.wallets.delete(walletId);
    this.utxos.delete(walletId);

    if (deleted) {
      this.saveWallets();
    }

    return deleted;
  }

  /**
   * Derive Railgun address from keys
   */
  private deriveRailgunAddress(viewingKey: string, spendingKey: string): string {
    // In production, this follows Railgun's address derivation spec
    // The address encodes the master public viewing key

    const combined = sha256Hex(viewingKey + spendingKey);
    const addressBytes = combined.slice(0, 40); // 20 bytes

    return `${RAILGUN_ADDRESS_PREFIX}${addressBytes}`;
  }

  /**
   * Validate a Railgun address
   */
  static isValidAddress(address: string): boolean {
    if (!address.startsWith(RAILGUN_ADDRESS_PREFIX)) {
      return false;
    }

    const addressPart = address.slice(RAILGUN_ADDRESS_PREFIX.length);
    return /^[0-9a-f]{40}$/i.test(addressPart);
  }

  /**
   * Load wallets from storage
   */
  private loadWallets(): void {
    if (!this.storage) return;

    try {
      const stored = this.storage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        for (const wallet of data.wallets || []) {
          this.wallets.set(wallet.id, wallet);
        }
        for (const [id, utxos] of Object.entries(data.utxos || {})) {
          this.utxos.set(id, utxos as UTXO[]);
        }
      }
    } catch (error) {
      console.warn('Failed to load Railgun wallets:', error);
    }
  }

  /**
   * Save wallets to storage
   */
  private saveWallets(): void {
    if (!this.storage) return;

    try {
      const data = {
        wallets: Array.from(this.wallets.values()),
        utxos: Object.fromEntries(this.utxos),
      };
      this.storage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save Railgun wallets:', error);
    }
  }
}

/**
 * Create a Railgun wallet manager
 */
export function createRailgunWalletManager(
  client: RailgunClient,
  storage?: Storage
): RailgunWalletManager {
  return new RailgunWalletManager(client, storage);
}

/**
 * Format balance for display
 */
function formatBalance(balance: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = balance / divisor;
  const fractionalPart = balance % divisor;

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.slice(0, 4).replace(/0+$/, '');

  if (trimmedFractional) {
    return `${integerPart}.${trimmedFractional}`;
  }

  return integerPart.toString();
}
