import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { HDWallet, Vault, CHAINS_BY_ID } from '@trinity/core';
import { JsonRpcProvider, formatEther } from 'ethers';

interface Account {
  name: string;
  address: string;
}

interface WalletState {
  isInitialized: boolean;
  isUnlocked: boolean;
  accounts: Account[];
  currentAccount: Account | null;
  currentChainId: number;
  balance: string;

  // Actions
  initialize: () => Promise<void>;
  createWallet: (password: string) => Promise<string>;
  importWallet: (mnemonic: string, password: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  loadBalance: () => Promise<void>;
  switchChain: (chainId: number) => void;
  addAccount: (name: string) => Promise<Account>;
  switchAccount: (address: string) => void;
}

const VAULT_KEY = 'trinity_vault';

export const useWalletStore = create<WalletState>((set, get) => ({
  isInitialized: false,
  isUnlocked: false,
  accounts: [],
  currentAccount: null,
  currentChainId: 1, // Ethereum mainnet
  balance: '0',

  initialize: async () => {
    try {
      const vaultData = await SecureStore.getItemAsync(VAULT_KEY);
      set({ isInitialized: !!vaultData });
    } catch (error) {
      console.error('Failed to check vault:', error);
      set({ isInitialized: false });
    }
  },

  createWallet: async (password: string) => {
    const { mnemonic, wallet } = HDWallet.generate(12);

    const account = wallet.deriveAccount(0);
    const vault = new Vault({
      async getItem(key) {
        return await SecureStore.getItemAsync(key);
      },
      async setItem(key, value) {
        await SecureStore.setItemAsync(key, value);
      },
      async removeItem(key) {
        await SecureStore.deleteItemAsync(key);
      },
    });

    await vault.initialize(password, mnemonic);

    const accounts: Account[] = [{ name: 'Account 1', address: account.address }];

    set({
      isInitialized: true,
      isUnlocked: true,
      accounts,
      currentAccount: accounts[0],
    });

    // Start loading balance
    get().loadBalance();

    return mnemonic;
  },

  importWallet: async (mnemonic: string, password: string) => {
    const wallet = HDWallet.fromMnemonic(mnemonic);
    const account = wallet.deriveAccount(0);

    const vault = new Vault({
      async getItem(key) {
        return await SecureStore.getItemAsync(key);
      },
      async setItem(key, value) {
        await SecureStore.setItemAsync(key, value);
      },
      async removeItem(key) {
        await SecureStore.deleteItemAsync(key);
      },
    });

    await vault.initialize(password, mnemonic);

    const accounts: Account[] = [{ name: 'Account 1', address: account.address }];

    set({
      isInitialized: true,
      isUnlocked: true,
      accounts,
      currentAccount: accounts[0],
    });

    get().loadBalance();
  },

  unlock: async (password: string) => {
    try {
      const vault = new Vault({
        async getItem(key) {
          return await SecureStore.getItemAsync(key);
        },
        async setItem(key, value) {
          await SecureStore.setItemAsync(key, value);
        },
        async removeItem(key) {
          await SecureStore.deleteItemAsync(key);
        },
      });

      const mnemonic = await vault.unlock(password);

      if (!mnemonic) {
        return false;
      }

      const wallet = HDWallet.fromMnemonic(mnemonic);
      const account = wallet.deriveAccount(0);

      const accounts: Account[] = [{ name: 'Account 1', address: account.address }];

      set({
        isUnlocked: true,
        accounts,
        currentAccount: accounts[0],
      });

      get().loadBalance();
      return true;
    } catch (error) {
      console.error('Unlock failed:', error);
      return false;
    }
  },

  lock: () => {
    set({
      isUnlocked: false,
      accounts: [],
      currentAccount: null,
      balance: '0',
    });
  },

  loadBalance: async () => {
    const { currentAccount, currentChainId } = get();
    if (!currentAccount) return;

    const chain = CHAINS_BY_ID[currentChainId];
    if (!chain) return;

    try {
      const provider = new JsonRpcProvider(chain.rpcUrls[0]);
      const balance = await provider.getBalance(currentAccount.address);
      set({ balance: formatEther(balance) });
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  },

  switchChain: (chainId: number) => {
    set({ currentChainId: chainId });
    get().loadBalance();
  },

  addAccount: async (name: string) => {
    const { accounts } = get();

    // Would derive next account from wallet
    const newAccount: Account = {
      name,
      address: '0x' + Math.random().toString(16).slice(2, 42),
    };

    const updatedAccounts = [...accounts, newAccount];
    set({ accounts: updatedAccounts });

    return newAccount;
  },

  switchAccount: (address: string) => {
    const { accounts } = get();
    const account = accounts.find(a => a.address === address);

    if (account) {
      set({ currentAccount: account });
      get().loadBalance();
    }
  },
}));
