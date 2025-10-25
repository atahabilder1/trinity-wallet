/**
 * Transaction Simulation Types
 */

export interface SimulationRequest {
  from: string;
  to: string;
  value?: string;
  data?: string;
  chainId: number;
}

export interface TokenTransfer {
  type: 'ERC20' | 'ERC721' | 'ERC1155';
  token: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  from: string;
  to: string;
  amount?: string;
  tokenId?: string;
}

export interface ApprovalChange {
  type: 'ERC20' | 'ERC721' | 'ERC1155';
  token: string;
  tokenName?: string;
  tokenSymbol?: string;
  spender: string;
  spenderName?: string;
  amount?: string;
  isUnlimited: boolean;
  tokenId?: string;
  approvalForAll?: boolean;
}

export interface BalanceChange {
  address: string;
  asset: string;
  assetSymbol: string;
  assetDecimals: number;
  before: string;
  after: string;
  difference: string;
  isNative: boolean;
}

export interface ContractInteraction {
  address: string;
  name?: string;
  method?: string;
  methodSignature?: string;
  isVerified: boolean;
  isProxy: boolean;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskWarning {
  level: RiskLevel;
  code: string;
  title: string;
  description: string;
}

export interface SimulationResult {
  success: boolean;
  error?: string;
  gasUsed: string;
  gasLimit: string;

  // State changes
  balanceChanges: BalanceChange[];
  tokenTransfers: TokenTransfer[];
  approvalChanges: ApprovalChange[];

  // Contract info
  contractInteraction?: ContractInteraction;

  // Risk assessment
  riskLevel: RiskLevel;
  warnings: RiskWarning[];

  // Raw data
  trace?: TransactionTrace;
}

export interface TransactionTrace {
  type: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasUsed: string;
  input: string;
  output: string;
  calls?: TransactionTrace[];
}

export interface DecodedMethod {
  name: string;
  signature: string;
  params: DecodedParam[];
}

export interface DecodedParam {
  name: string;
  type: string;
  value: unknown;
}

export interface KnownContract {
  name: string;
  type: 'token' | 'nft' | 'defi' | 'bridge' | 'unknown';
  isVerified: boolean;
  isProxy: boolean;
}

export interface SimulatorConfig {
  rpcUrl?: string;
  apiKey?: string;
  timeout?: number;
  includeTrace?: boolean;
}
