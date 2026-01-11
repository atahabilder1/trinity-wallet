// Trinity Wallet Core
// Privacy-first blockchain wallet

// Crypto
export * from './crypto/encryption';
export * from './crypto/hashing';
export * from './crypto/random';

// Wallet
export * from './wallet/hdwallet';
export * from './wallet/account';
export * from './wallet/keyring';

// Storage
export * from './storage/interface';
export * from './storage/encrypted';
export * from './storage/vault';

// Networks
export * from './networks/chains';
export * from './networks/provider';
export * from './networks/types';

// Transactions
export * from './transactions/builder';
export * from './transactions/gas';
export * from './transactions/signer';
export * from './transactions/types';

// Tokens
export * from './tokens/erc20';
export * from './tokens/balances';
export * from './tokens/types';

// Privacy
export * from './privacy/stealth';
export * from './privacy/rotation';
export * from './privacy/rpc-privacy';

// Simulation - export with explicit names to avoid conflicts
export {
  TransactionSimulator,
  createSimulator,
} from './simulation/simulator';
export {
  decodeTransactionData,
  isApproval,
  isTransfer,
  isSwap,
  decodeApproval,
  decodeTransfer,
  isUnlimitedApproval as isUnlimitedSimulationApproval,
} from './simulation/decoder';
export {
  analyzeRisks,
  quickRiskCheck,
  getRiskColor,
  getRiskLabel,
  RISK_CODES,
} from './simulation/risk';
export type {
  SimulationRequest,
  TokenTransfer as SimulationTokenTransfer,
  ApprovalChange,
  BalanceChange,
  ContractInteraction,
  RiskLevel,
  RiskWarning,
  SimulationResult,
  TransactionTrace,
  DecodedMethod,
  DecodedParam,
  KnownContract,
  SimulatorConfig,
} from './simulation/types';

// Portfolio - export with explicit names to avoid conflicts
export type {
  TokenPrice as PortfolioTokenPrice,
  TokenBalance as PortfolioTokenBalance,
  TokenHolding,
  PortfolioSummary,
  PortfolioHistoryPoint,
  PortfolioHistory,
  ChainPortfolio,
  NFTHolding,
  PortfolioConfig,
  PriceSource,
  CustomToken as PortfolioCustomToken,
  PriceAlert,
  TransactionHistoryItem,
} from './portfolio/types';
export * from './portfolio/prices';
export * from './portfolio/tracker';
export * from './portfolio/history';
export * from './portfolio/analytics';

// Recovery - export with explicit names to avoid conflicts
export type {
  Guardian,
  RecoveryConfig,
  ShamirShare,
  EncryptedShare,
  RecoveryRequest,
  RecoveryShare,
  ZKProof,
  GuardianInvite,
  RecoveryProof,
  RecoveryResult,
  GuardianSetupData,
  VerificationResult,
} from './recovery/types';
export {
  splitSecret,
  combineShares,
  verifyShares,
  generateUniqueIndex,
  refreshShares,
} from './recovery/shamir';
export * from './recovery/guardian';
export * from './recovery/recovery';
export * from './recovery/zkproof';

// Railgun (ZK Transactions) - export with explicit names to avoid conflicts
export type {
  RailgunNetworkName,
  RailgunConfig,
  RailgunWallet,
  ShieldedBalance,
  ShieldRequest,
  UnshieldRequest,
  PrivateTransferRequest,
  TransactionReceipt as RailgunTransactionReceipt,
  ShieldTransaction,
  UnshieldTransaction,
  PrivateTransaction,
  RailgunTransaction,
  RelayerInfo,
  ProofGenerationProgress,
  RailgunArtifacts,
  EncryptedCommitment,
  MerkleProof,
  UTXO,
} from './railgun/types';
export * from './railgun/client';
export * from './railgun/wallet';
export * from './railgun/transactions';
export * from './railgun/shield';

// Version
export const VERSION = '0.1.0';
