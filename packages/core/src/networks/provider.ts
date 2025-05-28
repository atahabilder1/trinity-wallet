/**
 * Provider management for blockchain connections
 * Handles RPC connections with fallback support
 */

import { JsonRpcProvider, Network, FetchRequest } from 'ethers';
import type { ChainConfig, ConnectionState, BlockInfo, GasPrice, FeeEstimate } from './types';
import { CHAINS_BY_ID, getChainById } from './chains';

/**
 * Provider manager for a single chain
 */
export class ChainProvider {
  private chainConfig: ChainConfig;
  private currentRpcIndex: number = 0;
  private provider: JsonRpcProvider | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private lastError: Error | null = null;

  constructor(chainConfig: ChainConfig) {
    this.chainConfig = chainConfig;
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get last error if any
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Get the underlying ethers provider
   */
  getProvider(): JsonRpcProvider | null {
    return this.provider;
  }

  /**
   * Connect to the chain
   * Tries RPCs in order until one succeeds
   */
  async connect(): Promise<boolean> {
    this.connectionState = 'connecting';
    this.lastError = null;

    for (let i = 0; i < this.chainConfig.rpcUrls.length; i++) {
      const rpcUrl = this.chainConfig.rpcUrls[i];

      try {
        const network = Network.from(this.chainConfig.chainId);
        const provider = new JsonRpcProvider(rpcUrl, network, {
          staticNetwork: network,
        });

        // Test connection
        await provider.getBlockNumber();

        this.provider = provider;
        this.currentRpcIndex = i;
        this.connectionState = 'connected';

        return true;
      } catch (error) {
        this.lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    this.connectionState = 'error';
    return false;
  }

  /**
   * Disconnect from the chain
   */
  disconnect(): void {
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
    this.connectionState = 'disconnected';
  }

  /**
   * Switch to next RPC endpoint
   */
  async rotateRpc(): Promise<boolean> {
    const nextIndex = (this.currentRpcIndex + 1) % this.chainConfig.rpcUrls.length;
    const rpcUrl = this.chainConfig.rpcUrls[nextIndex];

    try {
      const network = Network.from(this.chainConfig.chainId);
      const provider = new JsonRpcProvider(rpcUrl, network, {
        staticNetwork: network,
      });

      await provider.getBlockNumber();

      if (this.provider) {
        this.provider.destroy();
      }

      this.provider = provider;
      this.currentRpcIndex = nextIndex;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    this.ensureConnected();
    return this.provider!.getBlockNumber();
  }

  /**
   * Get block information
   */
  async getBlock(blockTag: number | 'latest' = 'latest'): Promise<BlockInfo | null> {
    this.ensureConnected();
    const block = await this.provider!.getBlock(blockTag);

    if (!block) {
      return null;
    }

    return {
      number: block.number,
      hash: block.hash!,
      timestamp: block.timestamp,
      baseFeePerGas: block.baseFeePerGas ?? undefined,
    };
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string): Promise<bigint> {
    this.ensureConnected();
    return this.provider!.getBalance(address);
  }

  /**
   * Get transaction count (nonce)
   */
  async getTransactionCount(address: string): Promise<number> {
    this.ensureConnected();
    return this.provider!.getTransactionCount(address);
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<GasPrice> {
    this.ensureConnected();

    const feeData = await this.provider!.getFeeData();

    return {
      gasPrice: feeData.gasPrice ?? 0n,
      baseFee: feeData.lastBaseFeePerGas ?? undefined,
      maxPriorityFee: feeData.maxPriorityFeePerGas ?? undefined,
      maxFee: feeData.maxFeePerGas ?? undefined,
    };
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(tx: {
    to?: string;
    from?: string;
    value?: bigint;
    data?: string;
  }): Promise<bigint> {
    this.ensureConnected();
    return this.provider!.estimateGas(tx);
  }

  /**
   * Get fee estimate with multiple speed options
   */
  async getFeeEstimate(): Promise<FeeEstimate> {
    this.ensureConnected();

    const feeData = await this.provider!.getFeeData();
    const baseFee = feeData.lastBaseFeePerGas ?? feeData.gasPrice ?? 0n;

    if (this.chainConfig.supportsEip1559 && feeData.maxFeePerGas) {
      // EIP-1559 estimation
      const slowPriority = feeData.maxPriorityFeePerGas! / 2n;
      const standardPriority = feeData.maxPriorityFeePerGas!;
      const fastPriority = (feeData.maxPriorityFeePerGas! * 150n) / 100n;

      return {
        slow: {
          gasPrice: baseFee + slowPriority,
          baseFee,
          maxPriorityFee: slowPriority,
          maxFee: baseFee + slowPriority,
        },
        standard: {
          gasPrice: baseFee + standardPriority,
          baseFee,
          maxPriorityFee: standardPriority,
          maxFee: baseFee + standardPriority,
        },
        fast: {
          gasPrice: baseFee + fastPriority,
          baseFee,
          maxPriorityFee: fastPriority,
          maxFee: (baseFee * 2n) + fastPriority,
        },
        estimatedTime: {
          slow: (this.chainConfig.blockTime ?? 12) * 6,
          standard: (this.chainConfig.blockTime ?? 12) * 2,
          fast: this.chainConfig.blockTime ?? 12,
        },
      };
    }

    // Legacy gas price estimation
    const gasPrice = feeData.gasPrice ?? 0n;

    return {
      slow: { gasPrice: (gasPrice * 90n) / 100n },
      standard: { gasPrice },
      fast: { gasPrice: (gasPrice * 120n) / 100n },
      estimatedTime: {
        slow: (this.chainConfig.blockTime ?? 12) * 6,
        standard: (this.chainConfig.blockTime ?? 12) * 2,
        fast: this.chainConfig.blockTime ?? 12,
      },
    };
  }

  /**
   * Send a raw transaction
   */
  async sendRawTransaction(signedTx: string): Promise<string> {
    this.ensureConnected();
    const response = await this.provider!.broadcastTransaction(signedTx);
    return response.hash;
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string) {
    this.ensureConnected();
    return this.provider!.getTransactionReceipt(txHash);
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string, confirmations: number = 1) {
    this.ensureConnected();
    return this.provider!.waitForTransaction(txHash, confirmations);
  }

  /**
   * Call a contract method (read-only)
   */
  async call(tx: { to: string; data: string }): Promise<string> {
    this.ensureConnected();
    return this.provider!.call(tx);
  }

  /**
   * Get chain ID
   */
  getChainId(): number {
    return this.chainConfig.chainId;
  }

  /**
   * Get chain config
   */
  getChainConfig(): ChainConfig {
    return this.chainConfig;
  }

  private ensureConnected(): void {
    if (!this.provider || this.connectionState !== 'connected') {
      throw new Error('Provider not connected');
    }
  }
}

/**
 * Multi-chain provider manager
 */
export class ProviderManager {
  private providers: Map<number, ChainProvider> = new Map();
  private currentChainId: number = 1; // Default to Ethereum

  /**
   * Get or create provider for a chain
   */
  getChainProvider(chainId: number): ChainProvider {
    let provider = this.providers.get(chainId);

    if (!provider) {
      const chainConfig = getChainById(chainId);
      if (!chainConfig) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }
      provider = new ChainProvider(chainConfig);
      this.providers.set(chainId, provider);
    }

    return provider;
  }

  /**
   * Get provider for current chain
   */
  getCurrentProvider(): ChainProvider {
    return this.getChainProvider(this.currentChainId);
  }

  /**
   * Switch to a different chain
   */
  async switchChain(chainId: number): Promise<boolean> {
    const provider = this.getChainProvider(chainId);

    if (provider.getState() !== 'connected') {
      const connected = await provider.connect();
      if (!connected) {
        return false;
      }
    }

    this.currentChainId = chainId;
    return true;
  }

  /**
   * Get current chain ID
   */
  getCurrentChainId(): number {
    return this.currentChainId;
  }

  /**
   * Connect to current chain
   */
  async connect(): Promise<boolean> {
    const provider = this.getCurrentProvider();
    return provider.connect();
  }

  /**
   * Disconnect all providers
   */
  disconnectAll(): void {
    for (const provider of this.providers.values()) {
      provider.disconnect();
    }
  }

  /**
   * Add a custom chain
   */
  addCustomChain(chainConfig: ChainConfig): void {
    const provider = new ChainProvider(chainConfig);
    this.providers.set(chainConfig.chainId, provider);
  }
}

/**
 * Create a single provider manager instance
 */
let providerManagerInstance: ProviderManager | null = null;

export function getProviderManager(): ProviderManager {
  if (!providerManagerInstance) {
    providerManagerInstance = new ProviderManager();
  }
  return providerManagerInstance;
}
