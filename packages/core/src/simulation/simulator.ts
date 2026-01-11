/**
 * Transaction Simulator
 *
 * Simulates transactions using eth_call and trace APIs
 */

import { JsonRpcProvider, Contract } from 'ethers';
import type {
  SimulationRequest,
  SimulationResult,
  SimulatorConfig,
  BalanceChange,
  TokenTransfer,
  ApprovalChange,
  ContractInteraction,
  TransactionTrace,
} from './types';
import { decodeApproval, decodeTransfer, isUnlimitedApproval } from './decoder';
import { analyzeRisks } from './risk';

// ERC20 ABI for balance/approval checks
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function allowance(address,address) view returns (uint256)',
];

/**
 * Transaction Simulator
 */
export class TransactionSimulator {
  private provider: JsonRpcProvider;
  private config: SimulatorConfig;

  constructor(rpcUrl: string, config: SimulatorConfig = {}) {
    this.provider = new JsonRpcProvider(rpcUrl);
    this.config = {
      timeout: 30000,
      includeTrace: false,
      ...config,
    };
  }

  /**
   * Simulate a transaction
   */
  async simulate(request: SimulationRequest): Promise<SimulationResult> {
    try {
      // Get pre-simulation balances
      const preBalances = await this.getBalances(request.from, request.chainId);

      // Simulate the transaction
      const simulationResult = await this.executeSimulation(request);

      if (!simulationResult.success) {
        const failResult: SimulationResult = {
          ...simulationResult,
          balanceChanges: [],
          tokenTransfers: [],
          approvalChanges: [],
          riskLevel: 'high',
          warnings: [],
        };
        const riskAnalysis = analyzeRisks(request, failResult);
        failResult.riskLevel = riskAnalysis.level;
        failResult.warnings = riskAnalysis.warnings;
        return failResult;
      }

      // Get post-simulation balances (estimated)
      const balanceChanges = await this.estimateBalanceChanges(request, preBalances);

      // Decode token transfers and approvals
      const tokenTransfers = this.extractTokenTransfers(request, simulationResult.trace);
      const approvalChanges = await this.extractApprovalChanges(request);

      // Get contract info
      const contractInteraction = await this.getContractInfo(request.to, request.chainId);

      // Build result
      const result: SimulationResult = {
        success: true,
        gasUsed: simulationResult.gasUsed,
        gasLimit: simulationResult.gasLimit,
        balanceChanges,
        tokenTransfers,
        approvalChanges,
        contractInteraction,
        trace: this.config.includeTrace ? simulationResult.trace : undefined,
        riskLevel: 'low',
        warnings: [],
      };

      // Analyze risks
      const riskAnalysis = analyzeRisks(request, result);
      result.riskLevel = riskAnalysis.level;
      result.warnings = riskAnalysis.warnings;

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const failedResult: SimulationResult = {
        success: false,
        error: errorMessage,
        gasUsed: '0',
        gasLimit: '0',
        balanceChanges: [],
        tokenTransfers: [],
        approvalChanges: [],
        riskLevel: 'high',
        warnings: [],
      };

      const riskAnalysis = analyzeRisks(request, failedResult);
      failedResult.warnings = riskAnalysis.warnings;

      return failedResult;
    }
  }

  /**
   * Execute the actual simulation
   */
  private async executeSimulation(
    request: SimulationRequest
  ): Promise<{ success: boolean; error?: string; gasUsed: string; gasLimit: string; trace?: TransactionTrace }> {
    try {
      // Estimate gas
      const gasEstimate = await this.provider.estimateGas({
        from: request.from,
        to: request.to,
        value: request.value ? BigInt(request.value) : undefined,
        data: request.data,
      });

      // Try eth_call to check for revert
      await this.provider.call({
        from: request.from,
        to: request.to,
        value: request.value ? BigInt(request.value) : undefined,
        data: request.data,
      });

      return {
        success: true,
        gasUsed: gasEstimate.toString(),
        gasLimit: (gasEstimate * 120n / 100n).toString(), // 20% buffer
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Try to parse revert reason
      let reason = errorMessage;
      if (errorMessage.includes('execution reverted')) {
        const match = errorMessage.match(/reason="([^"]+)"/);
        if (match) {
          reason = match[1];
        }
      }

      return {
        success: false,
        error: reason,
        gasUsed: '0',
        gasLimit: '0',
      };
    }
  }

  /**
   * Get native and token balances
   */
  private async getBalances(
    address: string,
    chainId: number
  ): Promise<Map<string, { balance: bigint; symbol: string; decimals: number }>> {
    const balances = new Map<string, { balance: bigint; symbol: string; decimals: number }>();

    // Get native balance
    const nativeBalance = await this.provider.getBalance(address);
    balances.set('native', {
      balance: nativeBalance,
      symbol: this.getNativeSymbol(chainId),
      decimals: 18,
    });

    return balances;
  }

  /**
   * Estimate balance changes from transaction
   */
  private async estimateBalanceChanges(
    request: SimulationRequest,
    preBalances: Map<string, { balance: bigint; symbol: string; decimals: number }>
  ): Promise<BalanceChange[]> {
    const changes: BalanceChange[] = [];

    // Native balance change (from value transfer + gas)
    if (request.value) {
      const value = BigInt(request.value);
      const preNative = preBalances.get('native');

      if (preNative && value > 0n) {
        changes.push({
          address: request.from,
          asset: 'native',
          assetSymbol: preNative.symbol,
          assetDecimals: 18,
          before: preNative.balance.toString(),
          after: (preNative.balance - value).toString(),
          difference: (-value).toString(),
          isNative: true,
        });
      }
    }

    // Token balance changes from transfer
    const transfer = decodeTransfer(request.data || '');
    if (transfer && 'to' in transfer) {
      try {
        const token = new Contract(request.to, ERC20_ABI, this.provider);
        const [symbol, decimals, balance] = await Promise.all([
          token.symbol().catch(() => 'UNKNOWN'),
          token.decimals().catch(() => 18),
          token.balanceOf(request.from).catch(() => 0n),
        ]);

        const amount = BigInt(transfer.amount);
        changes.push({
          address: request.from,
          asset: request.to,
          assetSymbol: symbol,
          assetDecimals: decimals,
          before: balance.toString(),
          after: (balance - amount).toString(),
          difference: (-amount).toString(),
          isNative: false,
        });
      } catch {
        // Ignore token info fetch errors
      }
    }

    return changes;
  }

  /**
   * Extract token transfers from transaction
   */
  private extractTokenTransfers(request: SimulationRequest, _trace?: TransactionTrace): TokenTransfer[] {
    const transfers: TokenTransfer[] = [];

    const transfer = decodeTransfer(request.data || '');
    if (transfer) {
      transfers.push({
        type: 'ERC20',
        token: request.to,
        from: 'from' in transfer ? transfer.from : request.from,
        to: transfer.to,
        amount: transfer.amount,
      });
    }

    return transfers;
  }

  /**
   * Extract approval changes from transaction
   */
  private async extractApprovalChanges(request: SimulationRequest): Promise<ApprovalChange[]> {
    const changes: ApprovalChange[] = [];

    const approval = decodeApproval(request.data || '');
    if (approval) {
      try {
        const token = new Contract(request.to, ERC20_ABI, this.provider);
        const [symbol, name] = await Promise.all([
          token.symbol().catch(() => undefined),
          token.name().catch(() => undefined),
        ]);

        changes.push({
          type: 'ERC20',
          token: request.to,
          tokenName: name,
          tokenSymbol: symbol,
          spender: approval.spender,
          amount: approval.amount,
          isUnlimited: isUnlimitedApproval(approval.amount),
        });
      } catch {
        changes.push({
          type: 'ERC20',
          token: request.to,
          spender: approval.spender,
          amount: approval.amount,
          isUnlimited: isUnlimitedApproval(approval.amount),
        });
      }
    }

    return changes;
  }

  /**
   * Get contract information
   */
  private async getContractInfo(address: string, _chainId: number): Promise<ContractInteraction | undefined> {
    try {
      const code = await this.provider.getCode(address);

      if (code === '0x') {
        // EOA, not a contract
        return undefined;
      }

      return {
        address,
        isVerified: false, // Would need block explorer API
        isProxy: false, // Would need deeper analysis
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Get native token symbol for chain
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
      11155111: 'ETH',
    };
    return symbols[chainId] || 'ETH';
  }
}

/**
 * Create a simulator instance
 */
export function createSimulator(rpcUrl: string, config?: SimulatorConfig): TransactionSimulator {
  return new TransactionSimulator(rpcUrl, config);
}

/**
 * Quick simulation without full analysis
 */
export async function quickSimulate(
  rpcUrl: string,
  request: SimulationRequest
): Promise<{ success: boolean; error?: string; gasEstimate?: string }> {
  const provider = new JsonRpcProvider(rpcUrl);

  try {
    const gasEstimate = await provider.estimateGas({
      from: request.from,
      to: request.to,
      value: request.value ? BigInt(request.value) : undefined,
      data: request.data,
    });

    return {
      success: true,
      gasEstimate: gasEstimate.toString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
