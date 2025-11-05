/**
 * Price Service
 *
 * Fetches token prices from multiple sources
 * Privacy-first: No tracking, minimal requests, local caching
 */

import type { TokenPrice, PriceSource } from './types';

// Native token IDs for price lookups
const NATIVE_TOKEN_IDS: Record<number, string> = {
  1: 'ethereum',
  137: 'matic-network',
  56: 'binancecoin',
  42161: 'ethereum',
  10: 'ethereum',
  8453: 'ethereum',
  43114: 'avalanche-2',
  324: 'ethereum',
  59144: 'ethereum',
  11155111: 'ethereum',
};

// Chain-specific wrapped native tokens
const WRAPPED_NATIVE: Record<number, string> = {
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  10: '0x4200000000000000000000000000000000000006',
  8453: '0x4200000000000000000000000000000000000006',
  43114: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
};

// Price cache
interface PriceCacheEntry {
  price: TokenPrice;
  expiresAt: number;
}

const priceCache = new Map<string, PriceCacheEntry>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * Price Service class
 */
export class PriceService {
  private sources: PriceSource[];
  private apiKeys: Record<string, string>;

  constructor(sources: PriceSource[] = ['coingecko', 'defillama'], apiKeys: Record<string, string> = {}) {
    this.sources = sources;
    this.apiKeys = apiKeys;
  }

  /**
   * Get price for a single token
   */
  async getPrice(tokenAddress: string, chainId: number): Promise<TokenPrice | null> {
    const cacheKey = `${chainId}:${tokenAddress.toLowerCase()}`;
    const cached = priceCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.price;
    }

    // Try each source in order
    for (const source of this.sources) {
      try {
        const price = await this.fetchFromSource(source, tokenAddress, chainId);
        if (price) {
          priceCache.set(cacheKey, {
            price,
            expiresAt: Date.now() + CACHE_TTL,
          });
          return price;
        }
      } catch (error) {
        console.warn(`Price fetch failed from ${source}:`, error);
      }
    }

    return null;
  }

  /**
   * Get prices for multiple tokens
   */
  async getPrices(tokens: Array<{ address: string; chainId: number }>): Promise<Map<string, TokenPrice>> {
    const results = new Map<string, TokenPrice>();
    const uncached: Array<{ address: string; chainId: number }> = [];

    // Check cache first
    for (const token of tokens) {
      const cacheKey = `${token.chainId}:${token.address.toLowerCase()}`;
      const cached = priceCache.get(cacheKey);

      if (cached && cached.expiresAt > Date.now()) {
        results.set(cacheKey, cached.price);
      } else {
        uncached.push(token);
      }
    }

    // Batch fetch uncached tokens
    if (uncached.length > 0) {
      const fetched = await this.batchFetchPrices(uncached);
      for (const [key, price] of fetched) {
        results.set(key, price);
        priceCache.set(key, {
          price,
          expiresAt: Date.now() + CACHE_TTL,
        });
      }
    }

    return results;
  }

  /**
   * Get native token price
   */
  async getNativePrice(chainId: number): Promise<number> {
    const coinId = NATIVE_TOKEN_IDS[chainId];
    if (!coinId) return 0;

    const cacheKey = `native:${chainId}`;
    const cached = priceCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.price.priceUsd;
    }

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const priceData = data[coinId];

      if (priceData) {
        const price: TokenPrice = {
          tokenAddress: 'native',
          chainId,
          symbol: this.getNativeSymbol(chainId),
          name: this.getNativeName(chainId),
          priceUsd: priceData.usd,
          priceChange24h: priceData.usd_24h_change || 0,
          priceChange7d: 0,
          lastUpdated: Date.now(),
        };

        priceCache.set(cacheKey, {
          price,
          expiresAt: Date.now() + CACHE_TTL,
        });

        return price.priceUsd;
      }
    } catch (error) {
      console.warn('Failed to fetch native price:', error);
    }

    return 0;
  }

  /**
   * Fetch price from a specific source
   */
  private async fetchFromSource(source: PriceSource, tokenAddress: string, chainId: number): Promise<TokenPrice | null> {
    switch (source) {
      case 'coingecko':
        return this.fetchFromCoinGecko(tokenAddress, chainId);
      case 'defillama':
        return this.fetchFromDefiLlama(tokenAddress, chainId);
      default:
        return null;
    }
  }

  /**
   * Fetch from CoinGecko
   */
  private async fetchFromCoinGecko(tokenAddress: string, chainId: number): Promise<TokenPrice | null> {
    const platform = this.getCoinGeckoPlatform(chainId);
    if (!platform) return null;

    const url = `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${tokenAddress}&vs_currencies=usd&include_24hr_change=true&include_7d_change=true`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const priceData = data[tokenAddress.toLowerCase()];

    if (!priceData) return null;

    return {
      tokenAddress,
      chainId,
      symbol: '',
      name: '',
      priceUsd: priceData.usd,
      priceChange24h: priceData.usd_24h_change || 0,
      priceChange7d: priceData.usd_7d_change || 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Fetch from DefiLlama
   */
  private async fetchFromDefiLlama(tokenAddress: string, chainId: number): Promise<TokenPrice | null> {
    const chain = this.getDefiLlamaChain(chainId);
    if (!chain) return null;

    const url = `https://coins.llama.fi/prices/current/${chain}:${tokenAddress}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const key = `${chain}:${tokenAddress.toLowerCase()}`;
    const priceData = data.coins?.[key];

    if (!priceData) return null;

    return {
      tokenAddress,
      chainId,
      symbol: priceData.symbol || '',
      name: '',
      priceUsd: priceData.price,
      priceChange24h: 0,
      priceChange7d: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Batch fetch prices
   */
  private async batchFetchPrices(tokens: Array<{ address: string; chainId: number }>): Promise<Map<string, TokenPrice>> {
    const results = new Map<string, TokenPrice>();

    // Group by chain for efficient batching
    const byChain = new Map<number, string[]>();
    for (const token of tokens) {
      const addresses = byChain.get(token.chainId) || [];
      addresses.push(token.address);
      byChain.set(token.chainId, addresses);
    }

    // Fetch each chain's tokens
    for (const [chainId, addresses] of byChain) {
      const chain = this.getDefiLlamaChain(chainId);
      if (!chain) continue;

      try {
        const coins = addresses.map(a => `${chain}:${a}`).join(',');
        const url = `https://coins.llama.fi/prices/current/${coins}`;

        const response = await fetch(url);
        if (!response.ok) continue;

        const data = await response.json();

        for (const address of addresses) {
          const key = `${chain}:${address.toLowerCase()}`;
          const priceData = data.coins?.[key];

          if (priceData) {
            const cacheKey = `${chainId}:${address.toLowerCase()}`;
            results.set(cacheKey, {
              tokenAddress: address,
              chainId,
              symbol: priceData.symbol || '',
              name: '',
              priceUsd: priceData.price,
              priceChange24h: 0,
              priceChange7d: 0,
              lastUpdated: Date.now(),
            });
          }
        }
      } catch (error) {
        console.warn(`Batch price fetch failed for chain ${chainId}:`, error);
      }
    }

    return results;
  }

  /**
   * Get CoinGecko platform ID for chain
   */
  private getCoinGeckoPlatform(chainId: number): string | null {
    const platforms: Record<number, string> = {
      1: 'ethereum',
      137: 'polygon-pos',
      56: 'binance-smart-chain',
      42161: 'arbitrum-one',
      10: 'optimistic-ethereum',
      8453: 'base',
      43114: 'avalanche',
    };
    return platforms[chainId] || null;
  }

  /**
   * Get DefiLlama chain name
   */
  private getDefiLlamaChain(chainId: number): string | null {
    const chains: Record<number, string> = {
      1: 'ethereum',
      137: 'polygon',
      56: 'bsc',
      42161: 'arbitrum',
      10: 'optimism',
      8453: 'base',
      43114: 'avax',
      324: 'zksync',
      59144: 'linea',
    };
    return chains[chainId] || null;
  }

  /**
   * Get native token symbol
   */
  private getNativeSymbol(chainId: number): string {
    const symbols: Record<number, string> = {
      1: 'ETH',
      137: 'MATIC',
      56: 'BNB',
      42161: 'ETH',
      10: 'ETH',
      8453: 'ETH',
      43114: 'AVAX',
      324: 'ETH',
      59144: 'ETH',
    };
    return symbols[chainId] || 'ETH';
  }

  /**
   * Get native token name
   */
  private getNativeName(chainId: number): string {
    const names: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      56: 'BNB',
      42161: 'Ethereum',
      10: 'Ethereum',
      8453: 'Ethereum',
      43114: 'Avalanche',
      324: 'Ethereum',
      59144: 'Ethereum',
    };
    return names[chainId] || 'Ethereum';
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    priceCache.clear();
  }
}

/**
 * Create a price service instance
 */
export function createPriceService(sources?: PriceSource[], apiKeys?: Record<string, string>): PriceService {
  return new PriceService(sources, apiKeys);
}

/**
 * Format price for display
 */
export function formatPrice(price: number, decimals: number = 2): string {
  if (price === 0) return '$0.00';

  if (price < 0.01) {
    return `$${price.toFixed(6)}`;
  }

  if (price < 1) {
    return `$${price.toFixed(4)}`;
  }

  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(2)}M`;
  }

  if (price >= 1000) {
    return `$${(price / 1000).toFixed(2)}K`;
  }

  return `$${price.toFixed(decimals)}`;
}

/**
 * Format price change percentage
 */
export function formatPriceChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}
