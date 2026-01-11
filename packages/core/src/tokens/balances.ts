/**
 * Token balance management and caching
 */

import type { ChainProvider } from '../networks/provider';
import type { TokenInfo, TokenBalance, TokenPrice, TokenRegistryEntry, CustomToken } from './types';
import { ERC20Service, formatTokenAmount } from './erc20';

// Popular tokens by chain (subset for initial display)
const POPULAR_TOKENS: Record<number, TokenInfo[]> = {
  // Ethereum Mainnet
  1: [
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      chainId: 1,
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      coingeckoId: 'tether',
    },
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      chainId: 1,
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      coingeckoId: 'usd-coin',
    },
    {
      address: '0x6B175474E89094C44Da98b954EesAB3186aFB07',
      chainId: 1,
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
      coingeckoId: 'dai',
    },
    {
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      chainId: 1,
      name: 'Wrapped BTC',
      symbol: 'WBTC',
      decimals: 8,
      coingeckoId: 'wrapped-bitcoin',
    },
  ],
  // Polygon
  137: [
    {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      chainId: 137,
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      coingeckoId: 'tether',
    },
    {
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      chainId: 137,
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      coingeckoId: 'usd-coin',
    },
  ],
  // Arbitrum
  42161: [
    {
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      chainId: 42161,
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      coingeckoId: 'tether',
    },
    {
      address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      chainId: 42161,
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      coingeckoId: 'usd-coin',
    },
  ],
};

/**
 * Token balance manager
 */
export class TokenBalanceManager {
  private provider: ChainProvider;
  private erc20Service: ERC20Service;
  private registry: Map<string, TokenRegistryEntry> = new Map();
  private prices: Map<string, TokenPrice> = new Map();
  private balanceCache: Map<string, { balance: bigint; timestamp: number }> = new Map();

  // Cache duration in milliseconds
  private static CACHE_DURATION = 30000; // 30 seconds

  constructor(provider: ChainProvider) {
    this.provider = provider;
    this.erc20Service = new ERC20Service(provider);
    this.initializePopularTokens();
  }

  /**
   * Initialize with popular tokens for current chain
   */
  private initializePopularTokens(): void {
    const chainId = this.provider.getChainId();
    const tokens = POPULAR_TOKENS[chainId] ?? [];

    for (const token of tokens) {
      this.addToken(token, false);
    }
  }

  /**
   * Add a token to the registry
   */
  addToken(info: TokenInfo, isCustom: boolean = true): void {
    const key = this.getTokenKey(info.address);

    this.registry.set(key, {
      info,
      isCustom,
      isHidden: false,
    });
  }

  /**
   * Import a token by address
   */
  async importToken(address: string): Promise<TokenInfo> {
    const info = await this.erc20Service.getTokenInfo(address);
    this.addToken(info, true);
    return info;
  }

  /**
   * Remove a custom token
   */
  removeToken(address: string): boolean {
    const key = this.getTokenKey(address);
    const entry = this.registry.get(key);

    if (entry?.isCustom) {
      this.registry.delete(key);
      return true;
    }

    return false;
  }

  /**
   * Hide/show a token
   */
  setTokenHidden(address: string, hidden: boolean): void {
    const key = this.getTokenKey(address);
    const entry = this.registry.get(key);

    if (entry) {
      entry.isHidden = hidden;
    }
  }

  /**
   * Get all registered tokens
   */
  getTokens(includeHidden: boolean = false): TokenInfo[] {
    return Array.from(this.registry.values())
      .filter(entry => includeHidden || !entry.isHidden)
      .map(entry => entry.info);
  }

  /**
   * Get token info by address
   */
  getToken(address: string): TokenInfo | undefined {
    const key = this.getTokenKey(address);
    return this.registry.get(key)?.info;
  }

  /**
   * Get balance for a single token
   */
  async getBalance(tokenAddress: string, ownerAddress: string): Promise<bigint> {
    const cacheKey = `${tokenAddress}-${ownerAddress}`.toLowerCase();
    const cached = this.balanceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < TokenBalanceManager.CACHE_DURATION) {
      return cached.balance;
    }

    const balance = await this.erc20Service.getBalance(tokenAddress, ownerAddress);

    this.balanceCache.set(cacheKey, {
      balance,
      timestamp: Date.now(),
    });

    // Update registry
    const key = this.getTokenKey(tokenAddress);
    const entry = this.registry.get(key);
    if (entry) {
      entry.balance = balance;
      entry.balanceUpdatedAt = Date.now();
    }

    return balance;
  }

  /**
   * Get balances for all registered tokens
   */
  async getAllBalances(ownerAddress: string): Promise<TokenBalance[]> {
    const tokens = this.getTokens();
    const balances: TokenBalance[] = [];

    // Fetch balances in parallel (with rate limiting)
    const batchSize = 10;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async token => {
          try {
            const balance = await this.getBalance(token.address, ownerAddress);
            const price = this.prices.get(this.getTokenKey(token.address));

            const tokenBalance: TokenBalance = {
              token,
              balance,
              formattedBalance: formatTokenAmount(balance, token.decimals, 6),
              priceUsd: price?.priceUsd,
              priceChange24h: price?.change24h,
            };

            if (price?.priceUsd) {
              const balanceNum = Number(formatTokenAmount(balance, token.decimals));
              tokenBalance.usdValue = balanceNum * price.priceUsd;
            }

            return tokenBalance;
          } catch {
            return null;
          }
        })
      );

      balances.push(...results.filter((b): b is TokenBalance => b !== null));
    }

    // Sort by USD value (highest first), then by balance
    return balances.sort((a, b) => {
      if (a.usdValue !== undefined && b.usdValue !== undefined) {
        return b.usdValue - a.usdValue;
      }
      if (a.usdValue !== undefined) return -1;
      if (b.usdValue !== undefined) return 1;
      return Number(b.balance - a.balance);
    });
  }

  /**
   * Get non-zero balances only
   */
  async getNonZeroBalances(ownerAddress: string): Promise<TokenBalance[]> {
    const all = await this.getAllBalances(ownerAddress);
    return all.filter(b => b.balance > 0n);
  }

  /**
   * Update token prices
   */
  updatePrices(prices: TokenPrice[]): void {
    for (const price of prices) {
      const key = this.getTokenKey(price.address);
      this.prices.set(key, price);
    }
  }

  /**
   * Get cached price for a token
   */
  getPrice(address: string): TokenPrice | undefined {
    return this.prices.get(this.getTokenKey(address));
  }

  /**
   * Clear balance cache
   */
  clearCache(): void {
    this.balanceCache.clear();
  }

  /**
   * Export registry for persistence
   */
  exportRegistry(): CustomToken[] {
    return Array.from(this.registry.values())
      .filter(entry => entry.isCustom)
      .map(entry => ({
        ...entry.info,
        addedAt: entry.balanceUpdatedAt ?? Date.now(),
        isHidden: entry.isHidden,
      }));
  }

  /**
   * Import registry from persistence
   */
  importRegistry(tokens: CustomToken[]): void {
    for (const token of tokens) {
      this.registry.set(this.getTokenKey(token.address), {
        info: token,
        isCustom: true,
        isHidden: token.isHidden,
      });
    }
  }

  /**
   * Get total portfolio value in USD
   */
  async getPortfolioValue(ownerAddress: string, ethBalance: bigint): Promise<{
    totalUsd: number;
    ethUsd: number;
    tokensUsd: number;
    breakdown: { symbol: string; usdValue: number; percentage: number }[];
  }> {
    const balances = await getNonZeroBalances(ownerAddress);

    // Get ETH price
    const ethPrice = this.prices.get('native')?.priceUsd ?? 0;
    const ethBalanceFormatted = Number(formatTokenAmount(ethBalance, 18));
    const ethUsd = ethBalanceFormatted * ethPrice;

    // Sum token values
    const tokensUsd = balances.reduce((sum, b) => sum + (b.usdValue ?? 0), 0);
    const totalUsd = ethUsd + tokensUsd;

    // Build breakdown
    const breakdown: { symbol: string; usdValue: number; percentage: number }[] = [];

    if (ethUsd > 0) {
      breakdown.push({
        symbol: 'ETH',
        usdValue: ethUsd,
        percentage: totalUsd > 0 ? (ethUsd / totalUsd) * 100 : 0,
      });
    }

    for (const balance of balances) {
      if (balance.usdValue && balance.usdValue > 0) {
        breakdown.push({
          symbol: balance.token.symbol,
          usdValue: balance.usdValue,
          percentage: totalUsd > 0 ? (balance.usdValue / totalUsd) * 100 : 0,
        });
      }
    }

    // Sort by value
    breakdown.sort((a, b) => b.usdValue - a.usdValue);

    return { totalUsd, ethUsd, tokensUsd, breakdown };
  }

  private getTokenKey(address: string): string {
    return `${this.provider.getChainId()}-${address.toLowerCase()}`;
  }
}

// Helper function to create the manager
export async function getNonZeroBalances(_ownerAddress: string): Promise<TokenBalance[]> {
  // This would be called from the instance
  return [];
}

/**
 * Get native balance for an address on a specific RPC
 */
export async function getNativeBalance(address: string, rpcUrl: string): Promise<bigint> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest'],
      }),
    });
    const data = await response.json();
    if (data.result) {
      return BigInt(data.result);
    }
    return 0n;
  } catch {
    return 0n;
  }
}

/**
 * Get token balances for an address (placeholder)
 */
export async function getTokenBalances(
  _address: string,
  _tokenAddresses: string[],
  _rpcUrl: string
): Promise<Map<string, bigint>> {
  const balances = new Map<string, bigint>();
  // In production, this would use multicall for efficiency
  // For now, return empty map
  return balances;
}
