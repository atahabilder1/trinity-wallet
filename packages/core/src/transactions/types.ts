/**
 * Transaction types and interfaces
 */

/**
 * Transaction type (EIP-2718)
 */
export enum TransactionType {
  /** Legacy transaction */
  LEGACY = 0,
  /** EIP-2930 access list transaction */
  ACCESS_LIST = 1,
  /** EIP-1559 fee market transaction */
  EIP1559 = 2,
}

/**
 * Transaction status
 */
export enum TransactionStatus {
  /** Transaction is pending in mempool */
  PENDING = 'pending',
  /** Transaction is confirmed */
  CONFIRMED = 'confirmed',
  /** Transaction failed */
  FAILED = 'failed',
  /** Transaction was dropped/replaced */
  DROPPED = 'dropped',
}

/**
 * Base transaction request
 */
export interface TransactionRequest {
  /** Recipient address */
  to?: string;
  /** Sender address */
  from?: string;
  /** Value in wei */
  value?: bigint;
  /** Transaction data (hex) */
  data?: string;
  /** Nonce */
  nonce?: number;
  /** Gas limit */
  gasLimit?: bigint;
  /** Chain ID */
  chainId?: number;
}

/**
 * Legacy transaction (type 0)
 */
export interface LegacyTransaction extends TransactionRequest {
  type: TransactionType.LEGACY;
  /** Gas price in wei */
  gasPrice: bigint;
}

/**
 * EIP-1559 transaction (type 2)
 */
export interface EIP1559Transaction extends TransactionRequest {
  type: TransactionType.EIP1559;
  /** Maximum fee per gas */
  maxFeePerGas: bigint;
  /** Maximum priority fee per gas (tip) */
  maxPriorityFeePerGas: bigint;
}

/**
 * Signed transaction
 */
export interface SignedTransaction {
  /** Raw signed transaction (hex) */
  rawTransaction: string;
  /** Transaction hash */
  hash: string;
  /** Signature r value */
  r: string;
  /** Signature s value */
  s: string;
  /** Signature v value */
  v: number;
}

/**
 * Transaction receipt
 */
export interface TransactionReceipt {
  /** Transaction hash */
  transactionHash: string;
  /** Block hash */
  blockHash: string;
  /** Block number */
  blockNumber: number;
  /** Transaction index in block */
  transactionIndex: number;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string | null;
  /** Contract address (if contract creation) */
  contractAddress: string | null;
  /** Gas used */
  gasUsed: bigint;
  /** Effective gas price */
  effectiveGasPrice: bigint;
  /** Cumulative gas used */
  cumulativeGasUsed: bigint;
  /** Status (1 = success, 0 = failure) */
  status: number;
  /** Logs */
  logs: TransactionLog[];
}

/**
 * Transaction log
 */
export interface TransactionLog {
  /** Contract address */
  address: string;
  /** Log topics */
  topics: string[];
  /** Log data */
  data: string;
  /** Log index */
  logIndex: number;
  /** Transaction hash */
  transactionHash: string;
  /** Block number */
  blockNumber: number;
}

/**
 * Transaction history entry
 */
export interface TransactionHistoryEntry {
  /** Transaction hash */
  hash: string;
  /** Chain ID */
  chainId: number;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string | null;
  /** Value in wei */
  value: bigint;
  /** Gas limit */
  gasLimit: bigint;
  /** Gas price or max fee */
  gasPrice: bigint;
  /** Gas used (after confirmation) */
  gasUsed?: bigint;
  /** Transaction status */
  status: TransactionStatus;
  /** Block number (if confirmed) */
  blockNumber?: number;
  /** Timestamp */
  timestamp: number;
  /** Transaction data (hex) */
  data?: string;
  /** Nonce */
  nonce: number;
  /** Transaction type */
  type: TransactionType;
  /** Is this an outgoing transaction */
  isOutgoing: boolean;
  /** Token transfer info (if applicable) */
  tokenTransfer?: {
    tokenAddress: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
    amount: bigint;
    to: string;
  };
}

/**
 * Speed preset for gas estimation
 */
export type GasSpeed = 'slow' | 'standard' | 'fast';

/**
 * Gas estimation result
 */
export interface GasEstimation {
  /** Estimated gas limit */
  gasLimit: bigint;
  /** Gas prices for different speeds */
  gasPrices: {
    slow: { gasPrice: bigint; maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint };
    standard: { gasPrice: bigint; maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint };
    fast: { gasPrice: bigint; maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint };
  };
  /** Estimated costs in wei */
  estimatedCosts: {
    slow: bigint;
    standard: bigint;
    fast: bigint;
  };
  /** Whether EIP-1559 is supported */
  supportsEip1559: boolean;
  /** Current base fee (if EIP-1559) */
  baseFee?: bigint;
}

/**
 * Send transaction options
 */
export interface SendTransactionOptions {
  /** Gas speed preset */
  speed?: GasSpeed;
  /** Custom gas limit */
  gasLimit?: bigint;
  /** Custom gas price (for legacy) */
  gasPrice?: bigint;
  /** Custom max fee per gas (for EIP-1559) */
  maxFeePerGas?: bigint;
  /** Custom max priority fee per gas (for EIP-1559) */
  maxPriorityFeePerGas?: bigint;
  /** Custom nonce */
  nonce?: number;
}
