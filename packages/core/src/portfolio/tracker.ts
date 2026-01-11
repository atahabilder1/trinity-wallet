/**
 * Portfolio Tracker
 *
 * Tracks portfolio value across multiple chains and tokens
 */

import { formatUnits } from 'ethers';
import type {
  TokenBalance,
  TokenHolding,
  PortfolioSummary,
  ChainPortfolio,
  PortfolioConfig,
} from './types';
import { PriceService, createPriceService } from './prices';
import { getTokenBalances, getNativeBalance } from '../tokens/balances';
import { CHAINS_BY_ID } from '../networks/chains';

const DEFAULT_CONFIG: PortfolioConfig = {
  refreshInterval: 60000, // 1 minute
  priceSources: ['coingecko', 'defillama'],
  hiddenTokens: [],
  customTokens: [],
  preferredCurrency: 'usd',
};

/**
 * Portfolio Tracker class
 */
export class PortfolioTracker {
  private priceService: PriceService;
  private config: PortfolioConfig;
  private lastUpdate: number = 0;
  private cachedSummary: PortfolioSummary | null = null;

  constructor(config: Partial<PortfolioConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.priceService = createPriceService(this.config.priceSources);
  }

  /**
   * Get full portfolio summary for an address
   */
  async getPortfolio(address: string, chainIds?: number[]): Promise<PortfolioSummary> {
    const chains = chainIds || Object.keys(CHAINS_BY_ID).map(Number);
    const holdings: TokenHolding[] = [];

    // Get balances and prices for each chain
    for (const chainId of chains) {
      const chain = CHAINS_BY_ID[chainId];
      if (!chain) continue;

      try {
        // Get native balance
        const nativeBalance = await getNativeBalance(address, chain.rpcUrls[0]);
        const nativePrice = await this.priceService.getNativePrice(chainId);

        if (nativeBalance > 0n) {
          const balanceFormatted = formatUnits(nativeBalance, 18);
          const valueUsd = parseFloat(balanceFormatted) * nativePrice;

          holdings.push({
            token: {
              tokenAddress: 'native',
              chainId,
              symbol: chain.nativeCurrency.symbol,
              name: chain.nativeCurrency.name,
              decimals: 18,
              balance: nativeBalance.toString(),
              balanceFormatted,
            },
            price: {
              tokenAddress: 'native',
              chainId,
              symbol: chain.nativeCurrency.symbol,
              name: chain.nativeCurrency.name,
              priceUsd: nativePrice,
              priceChange24h: 0,
              priceChange7d: 0,
              lastUpdated: Date.now(),
            },
            valueUsd,
            allocation: 0, // Will be calculated later
          });
        }

        // Get token balances (would need a token list for each chain)
        // This is simplified - in production you'd query indexed token transfers
      } catch (error) {
        console.warn(`Failed to get portfolio for chain ${chainId}:`, error);
      }
    }

    // Calculate total value and allocations
    const totalValueUsd = holdings.reduce((sum, h) => sum + h.valueUsd, 0);

    for (const holding of holdings) {
      holding.allocation = totalValueUsd > 0 ? (holding.valueUsd / totalValueUsd) * 100 : 0;
    }

    // Sort by value descending
    holdings.sort((a, b) => b.valueUsd - a.valueUsd);

    const summary: PortfolioSummary = {
      totalValueUsd,
      totalChange24h: 0, // Would need historical data
      totalChange24hPercent: 0,
      totalChange7d: 0,
      totalChange7dPercent: 0,
      holdings,
      lastUpdated: Date.now(),
    };

    this.cachedSummary = summary;
    this.lastUpdate = Date.now();

    return summary;
  }

  /**
   * Get portfolio grouped by chain
   */
  async getPortfolioByChain(address: string): Promise<ChainPortfolio[]> {
    const summary = await this.getPortfolio(address);
    const byChain = new Map<number, TokenHolding[]>();

    // Group holdings by chain
    for (const holding of summary.holdings) {
      const chainId = holding.token.chainId;
      const holdings = byChain.get(chainId) || [];
      holdings.push(holding);
      byChain.set(chainId, holdings);
    }

    // Build chain portfolios
    const chainPortfolios: ChainPortfolio[] = [];

    for (const [chainId, holdings] of byChain) {
      const chain = CHAINS_BY_ID[chainId];
      const valueUsd = holdings.reduce((sum, h) => sum + h.valueUsd, 0);

      chainPortfolios.push({
        chainId,
        chainName: chain?.name || 'Unknown',
        valueUsd,
        allocation: summary.totalValueUsd > 0 ? (valueUsd / summary.totalValueUsd) * 100 : 0,
        holdings,
      });
    }

    // Sort by value descending
    chainPortfolios.sort((a, b) => b.valueUsd - a.valueUsd);

    return chainPortfolios;
  }

  /**
   * Get total portfolio value
   */
  async getTotalValue(address: string): Promise<number> {
    if (this.cachedSummary && Date.now() - this.lastUpdate < this.config.refreshInterval) {
      return this.cachedSummary.totalValueUsd;
    }

    const summary = await this.getPortfolio(address);
    return summary.totalValueUsd;
  }

  /**
   * Add a custom token to track
   */
  addCustomToken(token: PortfolioConfig['customTokens'][0]): void {
    this.config.customTokens.push(token);
  }

  /**
   * Hide a token from portfolio
   */
  hideToken(tokenAddress: string, chainId: number): void {
    const key = `${chainId}:${tokenAddress.toLowerCase()}`;
    if (!this.config.hiddenTokens.includes(key)) {
      this.config.hiddenTokens.push(key);
    }
  }

  /**
   * Unhide a token
   */
  unhideToken(tokenAddress: string, chainId: number): void {
    const key = `${chainId}:${tokenAddress.toLowerCase()}`;
    const index = this.config.hiddenTokens.indexOf(key);
    if (index !== -1) {
      this.config.hiddenTokens.splice(index, 1);
    }
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.cachedSummary = null;
    this.lastUpdate = 0;
    this.priceService.clearCache();
  }

  /**
   * Get config
   */
  getConfig(): PortfolioConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<PortfolioConfig>): void {
    this.config = { ...this.config, ...updates };

    if (updates.priceSources) {
      this.priceService = createPriceService(updates.priceSources);
    }
  }
}

/**
 * Create a portfolio tracker instance
 */
export function createPortfolioTracker(config?: Partial<PortfolioConfig>): PortfolioTracker {
  return new PortfolioTracker(config);
}

/**
 * Format portfolio value for display
 */
export function formatPortfolioValue(value: number): string {
  if (value === 0) return '$0.00';

  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }

  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }

  return `$${value.toFixed(2)}`;
}

/**
 * Format allocation percentage
 */
export function formatAllocation(allocation: number): string {
  if (allocation < 0.01) return '<0.01%';
  return `${allocation.toFixed(2)}%`;
}
