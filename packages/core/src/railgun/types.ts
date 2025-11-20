/**
 * Railgun Types
 *
 * Type definitions for Railgun integration
 */

export type RailgunNetworkName =
  | 'Ethereum'
  | 'Polygon'
  | 'BNB_Chain'
  | 'Arbitrum';

export interface RailgunConfig {
  networkName: RailgunNetworkName;
  chainId: number;
  rpcUrl: string;
  relayerUrl?: string;
  artifactsPath?: string;
}

export interface RailgunWallet {
  id: string;
  railgunAddress: string; // 0zk... address
  viewingKey: string;
  spendingKey: string;
  createdAt: number;
}

export interface ShieldedBalance {
  tokenAddress: string;
  symbol: string;
  decimals: number;
  balance: string;
  balanceFormatted: string;
}

export interface ShieldRequest {
  tokenAddress: string;
  amount: string;
  recipientRailgunAddress?: string; // If not provided, shield to self
}

export interface UnshieldRequest {
  tokenAddress: string;
  amount: string;
  recipientAddress: string; // Regular Ethereum address
}

export interface PrivateTransferRequest {
  tokenAddress: string;
  amount: string;
  recipientRailgunAddress: string;
  memo?: string;
}

export interface TransactionReceipt {
  hash: string;
  status: 'pending' | 'success' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
}

export interface ShieldTransaction {
  type: 'shield';
  tokenAddress: string;
  amount: string;
  from: string; // Public address
  to: string; // Railgun address
  hash: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
}

export interface UnshieldTransaction {
  type: 'unshield';
  tokenAddress: string;
  amount: string;
  from: string; // Railgun address
  to: string; // Public address
  hash: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
}

export interface PrivateTransaction {
  type: 'private';
  tokenAddress: string;
  amount: string;
  from: string; // Railgun address
  to: string; // Railgun address
  memo?: string;
  hash: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
}

export type RailgunTransaction = ShieldTransaction | UnshieldTransaction | PrivateTransaction;

export interface RelayerInfo {
  url: string;
  feeToken: string;
  feePercent: number;
  isAvailable: boolean;
}

export interface ProofGenerationProgress {
  stage: 'start' | 'proving' | 'complete';
  progress: number; // 0-100
  message: string;
}

export interface RailgunArtifacts {
  vkey: Uint8Array;
  wasm: Uint8Array;
  zkey: Uint8Array;
}

export interface EncryptedCommitment {
  hash: string;
  ciphertext: string;
  blindedReceiverViewingKey: string;
  blindedSenderViewingKey: string;
}

export interface MerkleProof {
  root: string;
  leaf: string;
  pathIndices: number[];
  pathElements: string[];
}

export interface UTXO {
  commitment: string;
  nullifier: string;
  amount: string;
  tokenAddress: string;
  tree: number;
  position: number;
}
