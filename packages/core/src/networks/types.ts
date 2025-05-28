/**
 * Network types and interfaces
 */

/**
 * Native currency information
 */
export interface NativeCurrency {
  name: string;
  symbol: string;
  decimals: number;
}

/**
 * Block explorer configuration
 */
export interface BlockExplorer {
  name: string;
  url: string;
  apiUrl?: string;
}

/**
 * Chain configuration
 */
export interface ChainConfig {
  /** Unique chain identifier */
  chainId: number;
  /** Human-readable name */
  name: string;
  /** Short name for display */
  shortName: string;
  /** Network type */
  network: 'mainnet' | 'testnet';
  /** Native currency */
  nativeCurrency: NativeCurrency;
  /** RPC endpoints (multiple for fallback) */
  rpcUrls: string[];
  /** Block explorers */
  blockExplorers: BlockExplorer[];
  /** Whether this is an EVM chain */
  isEvm: boolean;
  /** Chain icon URL */
  iconUrl?: string;
  /** Is this a layer 2 */
  isL2?: boolean;
  /** Parent chain ID (for L2s) */
  parentChainId?: number;
  /** Average block time in seconds */
  blockTime?: number;
  /** Whether chain supports EIP-1559 */
  supportsEip1559: boolean;
  /** Multicall3 contract address */
  multicallAddress?: string;
  /** ENS registry address */
  ensAddress?: string;
}

/**
 * Custom network added by user
 */
export interface CustomNetwork extends ChainConfig {
  /** User added */
  isCustom: true;
  /** When it was added */
  addedAt: number;
}

/**
 * Network state
 */
export interface NetworkState {
  /** Currently selected chain ID */
  currentChainId: number;
  /** Custom networks added by user */
  customNetworks: CustomNetwork[];
  /** Networks that are hidden from list */
  hiddenChainIds: number[];
  /** RPC overrides per chain */
  rpcOverrides: Record<number, string>;
}

/**
 * Provider connection state
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

/**
 * Provider event types
 */
export interface ProviderEvents {
  connect: { chainId: number };
  disconnect: { error?: Error };
  chainChanged: { chainId: number };
  accountsChanged: { accounts: string[] };
  message: { type: string; data: unknown };
}

/**
 * Block information
 */
export interface BlockInfo {
  number: number;
  hash: string;
  timestamp: number;
  baseFeePerGas?: bigint;
}

/**
 * Gas price information
 */
export interface GasPrice {
  /** Legacy gas price */
  gasPrice: bigint;
  /** EIP-1559 base fee */
  baseFee?: bigint;
  /** EIP-1559 max priority fee */
  maxPriorityFee?: bigint;
  /** EIP-1559 max fee */
  maxFee?: bigint;
}

/**
 * Fee estimation with multiple speed options
 */
export interface FeeEstimate {
  slow: GasPrice;
  standard: GasPrice;
  fast: GasPrice;
  /** Estimated time in seconds */
  estimatedTime: {
    slow: number;
    standard: number;
    fast: number;
  };
}
