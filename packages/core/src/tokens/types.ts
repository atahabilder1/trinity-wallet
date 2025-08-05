/**
 * Token types and interfaces
 */

/**
 * Token metadata
 */
export interface TokenInfo {
  /** Token contract address */
  address: string;
  /** Chain ID */
  chainId: number;
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Token decimals */
  decimals: number;
  /** Logo URL */
  logoUrl?: string;
  /** Is this a verified/trusted token */
  isVerified?: boolean;
  /** CoinGecko ID for price fetching */
  coingeckoId?: string;
}

/**
 * Token balance
 */
export interface TokenBalance {
  /** Token info */
  token: TokenInfo;
  /** Raw balance */
  balance: bigint;
  /** Formatted balance (with decimals) */
  formattedBalance: string;
  /** USD value (if price available) */
  usdValue?: number;
  /** Price per token in USD */
  priceUsd?: number;
  /** 24h price change percentage */
  priceChange24h?: number;
}

/**
 * Token price data
 */
export interface TokenPrice {
  /** Token address */
  address: string;
  /** Chain ID */
  chainId: number;
  /** Price in USD */
  priceUsd: number;
  /** 24h change percentage */
  change24h: number;
  /** Market cap in USD */
  marketCap?: number;
  /** 24h volume in USD */
  volume24h?: number;
  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Token list (like Uniswap token list format)
 */
export interface TokenList {
  /** List name */
  name: string;
  /** List version */
  version: {
    major: number;
    minor: number;
    patch: number;
  };
  /** Tokens in the list */
  tokens: TokenInfo[];
  /** Last updated */
  timestamp: string;
  /** Logo URL */
  logoUrl?: string;
}

/**
 * User's custom token entry
 */
export interface CustomToken extends TokenInfo {
  /** When it was added */
  addedAt: number;
  /** Is this token hidden */
  isHidden: boolean;
}

/**
 * Token transfer event
 */
export interface TokenTransfer {
  /** Token info */
  token: TokenInfo;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** Amount transferred */
  amount: bigint;
  /** Transaction hash */
  txHash: string;
  /** Block number */
  blockNumber: number;
  /** Timestamp */
  timestamp?: number;
}

/**
 * Token approval
 */
export interface TokenApproval {
  /** Token info */
  token: TokenInfo;
  /** Owner address */
  owner: string;
  /** Spender address */
  spender: string;
  /** Approved amount (MaxUint256 = unlimited) */
  amount: bigint;
  /** Is unlimited approval */
  isUnlimited: boolean;
}

/**
 * Token registry entry
 */
export interface TokenRegistryEntry {
  /** Token info */
  info: TokenInfo;
  /** Cached balance */
  balance?: bigint;
  /** Last balance update */
  balanceUpdatedAt?: number;
  /** Is this a custom added token */
  isCustom: boolean;
  /** Is hidden from list */
  isHidden: boolean;
}
