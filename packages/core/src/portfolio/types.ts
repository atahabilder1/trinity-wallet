/**
 * Portfolio Types
 */

export interface TokenPrice {
  tokenAddress: string;
  chainId: number;
  symbol: string;
  name: string;
  priceUsd: number;
  priceChange24h: number;
  priceChange7d: number;
  marketCap?: number;
  volume24h?: number;
  lastUpdated: number;
}

export interface TokenBalance {
  tokenAddress: string;
  chainId: number;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceFormatted: string;
}

export interface TokenHolding {
  token: TokenBalance;
  price?: TokenPrice;
  valueUsd: number;
  allocation: number; // percentage of portfolio
}

export interface PortfolioSummary {
  totalValueUsd: number;
  totalChange24h: number;
  totalChange24hPercent: number;
  totalChange7d: number;
  totalChange7dPercent: number;
  holdings: TokenHolding[];
  lastUpdated: number;
}

export interface PortfolioHistoryPoint {
  timestamp: number;
  valueUsd: number;
}

export interface PortfolioHistory {
  points: PortfolioHistoryPoint[];
  period: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
  startValue: number;
  endValue: number;
  change: number;
  changePercent: number;
}

export interface ChainPortfolio {
  chainId: number;
  chainName: string;
  valueUsd: number;
  allocation: number;
  holdings: TokenHolding[];
}

export interface NFTHolding {
  contractAddress: string;
  tokenId: string;
  chainId: number;
  name?: string;
  description?: string;
  imageUrl?: string;
  collectionName?: string;
  floorPriceUsd?: number;
}

export interface PortfolioConfig {
  refreshInterval: number; // milliseconds
  priceSources: PriceSource[];
  hiddenTokens: string[];
  customTokens: CustomToken[];
  preferredCurrency: string;
}

export type PriceSource = 'coingecko' | 'defillama' | 'chainlink' | 'uniswap';

export interface CustomToken {
  address: string;
  chainId: number;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

export interface PriceAlert {
  id: string;
  tokenAddress: string;
  chainId: number;
  condition: 'above' | 'below';
  targetPrice: number;
  isActive: boolean;
  createdAt: number;
  triggeredAt?: number;
}

export interface TransactionHistoryItem {
  hash: string;
  chainId: number;
  from: string;
  to: string;
  value: string;
  valueUsd?: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'send' | 'receive' | 'swap' | 'approve' | 'contract' | 'unknown';
  tokenTransfers?: {
    token: string;
    symbol: string;
    from: string;
    to: string;
    amount: string;
    amountUsd?: number;
  }[];
  gasUsed?: string;
  gasPrice?: string;
  gasCostUsd?: number;
}
