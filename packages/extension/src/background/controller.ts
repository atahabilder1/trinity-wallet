/**
 * Wallet Controller
 * Manages wallet state and operations
 */

import {
  HDWallet,
  Vault,
  Keyring,
  ProviderManager,
  AccountType,
  type AccountMetadata,
  CHAINS_BY_ID,
  LocalStorageBackend,
} from '@trinity/core';

interface PendingRequest {
  id: string;
  method: string;
  params: unknown;
  origin: string;
  timestamp: number;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface ConnectedSite {
  origin: string;
  connectedAt: number;
  accounts: string[];
}

export class WalletController {
  private vault: Vault;
  private keyring: Keyring | null = null;
  private providerManager: ProviderManager;
  private isUnlocked = false;
  private currentChainId = 1;
  private accounts: AccountMetadata[] = [];
  private currentAccountId: string | null = null;
  private connectedSites: Map<string, ConnectedSite> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();

  constructor() {
    // Use chrome.storage.local for persistence
    const storage = new LocalStorageBackend('trinity:');
    this.vault = new Vault(storage);
    this.providerManager = new ProviderManager();

    this.initialize();
  }

  private async initialize() {
    // Check if vault exists
    const exists = await this.vault.exists();

    if (exists) {
      // Load connected sites from storage
      const sites = await chrome.storage.local.get('connectedSites');
      if (sites.connectedSites) {
        this.connectedSites = new Map(Object.entries(sites.connectedSites));
      }
    }

    // Connect to default chain
    await this.providerManager.switchChain(this.currentChainId);
  }

  async getState() {
    const currentAccount = this.getCurrentAccount();
    return {
      isInitialized: await this.vault.exists(),
      isUnlocked: this.isUnlocked,
      chainId: '0x' + this.currentChainId.toString(16),
      accounts: currentAccount ? [currentAccount.address] : [],
      currentAccount,
    };
  }

  async createWallet(password: string): Promise<string> {
    const { mnemonic, wallet } = HDWallet.generate(12);

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

    await this.vault.create(mnemonic, password, [accountMeta]);

    this.keyring = new Keyring();
    this.keyring.initializeHdWallet(mnemonic);
    this.keyring.addHdAccount(0);

    this.accounts = [accountMeta];
    this.currentAccountId = accountMeta.id;
    this.isUnlocked = true;

    wallet.destroy();

    return mnemonic;
  }

  async importWallet(mnemonic: string, password: string): Promise<void> {
    if (!HDWallet.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    const wallet = HDWallet.fromMnemonic(mnemonic);
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

    await this.vault.create(mnemonic, password, [accountMeta]);

    this.keyring = new Keyring();
    this.keyring.initializeHdWallet(mnemonic);
    this.keyring.addHdAccount(0);

    this.accounts = [accountMeta];
    this.currentAccountId = accountMeta.id;
    this.isUnlocked = true;

    wallet.destroy();
  }

  async unlock(password: string): Promise<boolean> {
    const success = await this.vault.unlock(password);

    if (success) {
      const mnemonic = this.vault.getMnemonic();
      this.accounts = this.vault.getAccounts();

      this.keyring = new Keyring();
      this.keyring.initializeHdWallet(mnemonic);

      for (const account of this.accounts) {
        if (account.type === AccountType.HD && account.hdIndex !== undefined) {
          this.keyring.addHdAccount(account.hdIndex);
        }
      }

      this.currentAccountId = this.accounts.find(a => a.isPrimary)?.id ?? this.accounts[0]?.id;
      this.isUnlocked = true;
    }

    return success;
  }

  lock(): void {
    this.vault.lock();
    this.keyring?.destroy();
    this.keyring = null;
    this.isUnlocked = false;
  }

  getCurrentAccount(): AccountMetadata | null {
    return this.accounts.find(a => a.id === this.currentAccountId) ?? null;
  }

  getAllAccounts(): AccountMetadata[] {
    return this.accounts;
  }

  async addAccount(name?: string): Promise<AccountMetadata> {
    if (!this.isUnlocked || !this.keyring) {
      throw new Error('Wallet is locked');
    }

    const nextIndex = this.accounts.filter(a => a.type === AccountType.HD).length;
    const mnemonic = this.vault.getMnemonic();
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

    await this.vault.setAccount(accountMeta);
    this.keyring.addHdAccount(nextIndex);
    this.accounts.push(accountMeta);

    wallet.destroy();

    return accountMeta;
  }

  switchAccount(id: string): void {
    const account = this.accounts.find(a => a.id === id);
    if (account) {
      this.currentAccountId = id;
    }
  }

  getChainId(): string {
    return '0x' + this.currentChainId.toString(16);
  }

  getNetworkVersion(): string {
    return this.currentChainId.toString();
  }

  async switchChain(params: { chainId: string }): Promise<null> {
    const chainId = parseInt(params.chainId, 16);

    if (!CHAINS_BY_ID[chainId]) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    await this.providerManager.switchChain(chainId);
    this.currentChainId = chainId;

    // Notify connected pages
    // notifyTabs('chainChanged', { chainId: params.chainId });

    return null;
  }

  async addChain(params: unknown): Promise<null> {
    // TODO: Implement custom chain addition
    throw new Error('Adding custom chains not yet supported');
  }

  async requestAccounts(origin: string): Promise<string[]> {
    // Check if already connected
    const site = this.connectedSites.get(origin);
    if (site) {
      return site.accounts;
    }

    // TODO: Show popup for approval
    // For now, auto-approve if unlocked
    if (!this.isUnlocked) {
      throw new Error('Wallet is locked');
    }

    const currentAccount = this.getCurrentAccount();
    if (!currentAccount) {
      throw new Error('No accounts available');
    }

    // Connect site
    const connectedSite: ConnectedSite = {
      origin,
      connectedAt: Date.now(),
      accounts: [currentAccount.address],
    };

    this.connectedSites.set(origin, connectedSite);

    // Save to storage
    await chrome.storage.local.set({
      connectedSites: Object.fromEntries(this.connectedSites),
    });

    return connectedSite.accounts;
  }

  getAccounts(origin: string): string[] {
    const site = this.connectedSites.get(origin);
    return site?.accounts ?? [];
  }

  async sendTransaction(tx: unknown, origin: string): Promise<string> {
    // TODO: Show popup for transaction approval
    throw new Error('Transaction signing not yet implemented in extension');
  }

  async personalSign(message: string, address: string, origin: string): Promise<string> {
    if (!this.isUnlocked || !this.keyring) {
      throw new Error('Wallet is locked');
    }

    // Verify address is authorized for this origin
    const site = this.connectedSites.get(origin);
    if (!site?.accounts.includes(address)) {
      throw new Error('Address not authorized for this site');
    }

    // TODO: Show popup for signing approval
    const signature = this.keyring.signMessage(address, message);
    return '0x' + signature.serialized;
  }

  async ethSign(address: string, message: string, origin: string): Promise<string> {
    return this.personalSign(message, address, origin);
  }

  async signTypedData(address: string, data: string | object, origin: string): Promise<string> {
    // TODO: Implement EIP-712 typed data signing
    throw new Error('Typed data signing not yet implemented');
  }

  async getBalance(address: string, block: string): Promise<string> {
    const provider = this.providerManager.getCurrentProvider();
    const balance = await provider.getBalance(address);
    return '0x' + balance.toString(16);
  }

  async getCurrentBalance(): Promise<bigint> {
    const currentAccount = this.getCurrentAccount();
    if (!currentAccount) return 0n;

    const provider = this.providerManager.getCurrentProvider();
    return provider.getBalance(currentAccount.address);
  }

  async getTransactionCount(address: string, block: string): Promise<string> {
    const provider = this.providerManager.getCurrentProvider();
    const count = await provider.getTransactionCount(address);
    return '0x' + count.toString(16);
  }

  async getGasPrice(): Promise<string> {
    const provider = this.providerManager.getCurrentProvider();
    const gasPrice = await provider.getGasPrice();
    return '0x' + gasPrice.gasPrice.toString(16);
  }

  async estimateGas(tx: unknown): Promise<string> {
    const provider = this.providerManager.getCurrentProvider();
    const estimate = await provider.estimateGas(tx as { to?: string; data?: string; value?: bigint });
    return '0x' + estimate.toString(16);
  }

  async getBlockNumber(): Promise<string> {
    const provider = this.providerManager.getCurrentProvider();
    const blockNumber = await provider.getBlockNumber();
    return '0x' + blockNumber.toString(16);
  }

  async getBlockByNumber(block: string, full: boolean): Promise<unknown> {
    const provider = this.providerManager.getCurrentProvider();
    const blockNum = block === 'latest' ? 'latest' : parseInt(block, 16);
    return provider.getBlock(blockNum);
  }

  async getTransactionReceipt(hash: string): Promise<unknown> {
    const provider = this.providerManager.getCurrentProvider();
    return provider.getTransactionReceipt(hash);
  }

  async call(tx: unknown, block: string): Promise<string> {
    const provider = this.providerManager.getCurrentProvider();
    return provider.call(tx as { to: string; data: string });
  }

  approveRequest(requestId: string): void {
    // TODO: Implement request approval
  }

  rejectRequest(requestId: string): void {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.reject(new Error('User rejected request'));
      this.pendingRequests.delete(requestId);
    }
  }
}
