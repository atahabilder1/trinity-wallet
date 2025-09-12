/**
 * Wallet state management using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  HDWallet,
  Vault,
  MemoryStorage,
  Keyring,
  ProviderManager,
  type AccountMetadata,
  AccountType,
} from '@trinity/core';

interface WalletState {
  // State
  isInitialized: boolean;
  isUnlocked: boolean;
  currentAccount: AccountMetadata | null;
  accounts: AccountMetadata[];
  currentChainId: number;
  balance: bigint;
  balanceLoading: boolean;

  // Internal instances (not persisted)
  vault: Vault | null;
  keyring: Keyring | null;
  providerManager: ProviderManager | null;

  // Actions
  initialize: () => Promise<void>;
  createWallet: (password: string) => Promise<string>;
  importWallet: (mnemonic: string, password: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  addAccount: (name?: string) => Promise<AccountMetadata>;
  switchAccount: (accountId: string) => void;
  switchChain: (chainId: number) => Promise<void>;
  refreshBalance: () => Promise<void>;
  getAddress: () => string | null;
  exportMnemonic: () => string | null;
}

// Create storage backend
const storageBackend = new MemoryStorage();

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Initial state
      isInitialized: false,
      isUnlocked: false,
      currentAccount: null,
      accounts: [],
      currentChainId: 1, // Ethereum mainnet
      balance: 0n,
      balanceLoading: false,

      vault: null,
      keyring: null,
      providerManager: null,

      initialize: async () => {
        const vault = new Vault(storageBackend);
        const providerManager = new ProviderManager();

        const exists = await vault.exists();

        set({
          vault,
          providerManager,
          isInitialized: exists,
        });

        if (exists) {
          // Try to connect to default chain
          await providerManager.switchChain(get().currentChainId);
        }
      },

      createWallet: async (password: string) => {
        const { vault, providerManager } = get();
        if (!vault) throw new Error('Vault not initialized');

        // Generate new wallet
        const { mnemonic, wallet } = HDWallet.generate(12);

        // Derive first account
        const firstAccount = wallet.deriveAccount(0);

        const accountMeta: AccountMetadata = {
          id: 'hd-0',
          name: 'Account 1',
          type: AccountType.HD,
          address: firstAccount.address,
          hdIndex: 0,
          hdPath: firstAccount.path,
          createdAt: Date.now(),
          isPrimary: true,
          isHidden: false,
        };

        // Create vault with mnemonic
        await vault.create(mnemonic, password, [accountMeta]);

        // Setup keyring
        const keyring = new Keyring();
        keyring.initializeHdWallet(mnemonic);
        keyring.addHdAccount(0);

        // Connect to chain
        await providerManager?.switchChain(get().currentChainId);

        set({
          isInitialized: true,
          isUnlocked: true,
          keyring,
          accounts: [accountMeta],
          currentAccount: accountMeta,
        });

        // Clean up sensitive data
        wallet.destroy();

        return mnemonic;
      },

      importWallet: async (mnemonic: string, password: string) => {
        const { vault, providerManager } = get();
        if (!vault) throw new Error('Vault not initialized');

        // Validate mnemonic
        if (!HDWallet.validateMnemonic(mnemonic)) {
          throw new Error('Invalid mnemonic phrase');
        }

        // Create wallet from mnemonic
        const wallet = HDWallet.fromMnemonic(mnemonic);

        // Derive first account
        const firstAccount = wallet.deriveAccount(0);

        const accountMeta: AccountMetadata = {
          id: 'hd-0',
          name: 'Account 1',
          type: AccountType.HD,
          address: firstAccount.address,
          hdIndex: 0,
          hdPath: firstAccount.path,
          createdAt: Date.now(),
          isPrimary: true,
          isHidden: false,
        };

        // Create vault
        await vault.create(mnemonic, password, [accountMeta]);

        // Setup keyring
        const keyring = new Keyring();
        keyring.initializeHdWallet(mnemonic);
        keyring.addHdAccount(0);

        // Connect to chain
        await providerManager?.switchChain(get().currentChainId);

        set({
          isInitialized: true,
          isUnlocked: true,
          keyring,
          accounts: [accountMeta],
          currentAccount: accountMeta,
        });

        wallet.destroy();
      },

      unlock: async (password: string) => {
        const { vault, providerManager } = get();
        if (!vault) throw new Error('Vault not initialized');

        const success = await vault.unlock(password);
        if (!success) {
          return false;
        }

        // Get mnemonic and setup keyring
        const mnemonic = vault.getMnemonic();
        const accounts = vault.getAccounts();

        const keyring = new Keyring();
        keyring.initializeHdWallet(mnemonic);

        // Add all HD accounts to keyring
        for (const account of accounts) {
          if (account.type === AccountType.HD && account.hdIndex !== undefined) {
            keyring.addHdAccount(account.hdIndex);
          }
        }

        // Connect to chain
        await providerManager?.switchChain(get().currentChainId);

        const primaryAccount = accounts.find(a => a.isPrimary) ?? accounts[0];

        set({
          isUnlocked: true,
          keyring,
          accounts,
          currentAccount: primaryAccount,
        });

        // Refresh balance
        get().refreshBalance();

        return true;
      },

      lock: () => {
        const { vault, keyring } = get();
        vault?.lock();
        keyring?.destroy();

        set({
          isUnlocked: false,
          keyring: null,
          balance: 0n,
        });
      },

      addAccount: async (name?: string) => {
        const { vault, keyring, accounts } = get();
        if (!vault || !keyring) throw new Error('Wallet not unlocked');

        // Find next HD index
        const hdAccounts = accounts.filter(a => a.type === AccountType.HD);
        const nextIndex = hdAccounts.length;

        // Derive new account
        const mnemonic = vault.getMnemonic();
        const wallet = HDWallet.fromMnemonic(mnemonic);
        const newAccount = wallet.deriveAccount(nextIndex);

        const accountMeta: AccountMetadata = {
          id: `hd-${nextIndex}`,
          name: name ?? `Account ${nextIndex + 1}`,
          type: AccountType.HD,
          address: newAccount.address,
          hdIndex: nextIndex,
          hdPath: newAccount.path,
          createdAt: Date.now(),
          isPrimary: false,
          isHidden: false,
        };

        // Add to vault
        await vault.setAccount(accountMeta);

        // Add to keyring
        keyring.addHdAccount(nextIndex);

        const newAccounts = [...accounts, accountMeta];

        set({
          accounts: newAccounts,
        });

        wallet.destroy();

        return accountMeta;
      },

      switchAccount: (accountId: string) => {
        const { accounts } = get();
        const account = accounts.find(a => a.id === accountId);

        if (account) {
          set({ currentAccount: account });
          get().refreshBalance();
        }
      },

      switchChain: async (chainId: number) => {
        const { providerManager } = get();
        if (!providerManager) return;

        await providerManager.switchChain(chainId);

        set({ currentChainId: chainId });
        get().refreshBalance();
      },

      refreshBalance: async () => {
        const { currentAccount, providerManager } = get();
        if (!currentAccount || !providerManager) return;

        set({ balanceLoading: true });

        try {
          const provider = providerManager.getCurrentProvider();
          const balance = await provider.getBalance(currentAccount.address);
          set({ balance, balanceLoading: false });
        } catch (error) {
          console.error('Failed to fetch balance:', error);
          set({ balanceLoading: false });
        }
      },

      getAddress: () => {
        const { currentAccount } = get();
        return currentAccount?.address ?? null;
      },

      exportMnemonic: () => {
        const { vault, isUnlocked } = get();
        if (!vault || !isUnlocked) return null;
        return vault.getMnemonic();
      },
    }),
    {
      name: 'trinity-wallet',
      partialize: state => ({
        isInitialized: state.isInitialized,
        currentChainId: state.currentChainId,
      }),
    }
  )
);
