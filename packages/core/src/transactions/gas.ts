/**
 * Gas estimation and fee calculation
 */

import type { ChainProvider } from '../networks/provider';
import type { TransactionRequest, GasEstimation, GasSpeed } from './types';

// Gas buffer percentage (add 20% to estimated gas)
const GAS_BUFFER_PERCENT = 20n;

// Minimum gas limit
const MIN_GAS_LIMIT = 21000n;

// Default gas limit for contract calls
const DEFAULT_CONTRACT_GAS = 100000n;

/**
 * Estimate gas for a transaction
 *
 * @param provider Chain provider
 * @param tx Transaction request
 * @returns Gas estimation
 */
export async function estimateGas(
  provider: ChainProvider,
  tx: TransactionRequest
): Promise<GasEstimation> {
  const chainConfig = provider.getChainConfig();
  const supportsEip1559 = chainConfig.supportsEip1559;

  // Estimate gas limit
  let gasLimit: bigint;
  try {
    const estimate = await provider.estimateGas({
      to: tx.to,
      from: tx.from,
      value: tx.value,
      data: tx.data,
    });

    // Add buffer
    gasLimit = estimate + (estimate * GAS_BUFFER_PERCENT) / 100n;

    // Ensure minimum
    if (gasLimit < MIN_GAS_LIMIT) {
      gasLimit = MIN_GAS_LIMIT;
    }
  } catch {
    // Default gas limit if estimation fails
    gasLimit = tx.data && tx.data.length > 2 ? DEFAULT_CONTRACT_GAS : MIN_GAS_LIMIT;
  }

  // Get fee estimates
  const feeEstimate = await provider.getFeeEstimate();

  // Build gas prices for each speed
  const gasPrices = {
    slow: {
      gasPrice: feeEstimate.slow.gasPrice,
      ...(supportsEip1559 && {
        maxFeePerGas: feeEstimate.slow.maxFee,
        maxPriorityFeePerGas: feeEstimate.slow.maxPriorityFee,
      }),
    },
    standard: {
      gasPrice: feeEstimate.standard.gasPrice,
      ...(supportsEip1559 && {
        maxFeePerGas: feeEstimate.standard.maxFee,
        maxPriorityFeePerGas: feeEstimate.standard.maxPriorityFee,
      }),
    },
    fast: {
      gasPrice: feeEstimate.fast.gasPrice,
      ...(supportsEip1559 && {
        maxFeePerGas: feeEstimate.fast.maxFee,
        maxPriorityFeePerGas: feeEstimate.fast.maxPriorityFee,
      }),
    },
  };

  // Calculate estimated costs
  const estimatedCosts = {
    slow: gasLimit * gasPrices.slow.gasPrice,
    standard: gasLimit * gasPrices.standard.gasPrice,
    fast: gasLimit * gasPrices.fast.gasPrice,
  };

  return {
    gasLimit,
    gasPrices,
    estimatedCosts,
    supportsEip1559,
    baseFee: feeEstimate.standard.baseFee,
  };
}

/**
 * Get gas prices for a specific speed
 *
 * @param estimation Gas estimation
 * @param speed Speed preset
 * @returns Gas price parameters
 */
export function getGasPriceForSpeed(
  estimation: GasEstimation,
  speed: GasSpeed
): { gasPrice: bigint; maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint } {
  return estimation.gasPrices[speed];
}

/**
 * Calculate total transaction cost
 *
 * @param gasLimit Gas limit
 * @param gasPrice Gas price or max fee
 * @param value Transaction value
 * @returns Total cost in wei
 */
export function calculateTotalCost(
  gasLimit: bigint,
  gasPrice: bigint,
  value: bigint = 0n
): bigint {
  return gasLimit * gasPrice + value;
}

/**
 * Check if user has sufficient balance for transaction
 *
 * @param balance User's balance
 * @param gasLimit Gas limit
 * @param gasPrice Gas price
 * @param value Transaction value
 * @returns True if sufficient balance
 */
export function hasSufficientBalance(
  balance: bigint,
  gasLimit: bigint,
  gasPrice: bigint,
  value: bigint = 0n
): boolean {
  const totalCost = calculateTotalCost(gasLimit, gasPrice, value);
  return balance >= totalCost;
}

/**
 * Calculate maximum sendable amount
 * (balance minus gas cost)
 *
 * @param balance User's balance
 * @param gasLimit Gas limit
 * @param gasPrice Gas price
 * @returns Maximum sendable amount
 */
export function calculateMaxSendable(
  balance: bigint,
  gasLimit: bigint,
  gasPrice: bigint
): bigint {
  const gasCost = gasLimit * gasPrice;
  if (balance <= gasCost) {
    return 0n;
  }
  return balance - gasCost;
}

/**
 * Format gas price to Gwei
 *
 * @param weiValue Value in wei
 * @returns Value in Gwei (string)
 */
export function weiToGwei(weiValue: bigint): string {
  const gwei = weiValue / 1000000000n;
  const remainder = weiValue % 1000000000n;

  if (remainder === 0n) {
    return gwei.toString();
  }

  // Include decimal places
  const decimal = remainder.toString().padStart(9, '0').replace(/0+$/, '');
  return `${gwei}.${decimal}`;
}

/**
 * Parse Gwei to Wei
 *
 * @param gweiValue Value in Gwei
 * @returns Value in wei
 */
export function gweiToWei(gweiValue: string | number): bigint {
  const value = typeof gweiValue === 'string' ? parseFloat(gweiValue) : gweiValue;
  return BigInt(Math.floor(value * 1e9));
}

/**
 * Suggest gas increase for stuck transaction
 *
 * @param currentGasPrice Current gas price
 * @param increasePercent Percentage to increase (default 10%)
 * @returns New suggested gas price
 */
export function suggestSpeedUp(
  currentGasPrice: bigint,
  increasePercent: number = 10
): bigint {
  const increase = (currentGasPrice * BigInt(increasePercent)) / 100n;
  return currentGasPrice + increase;
}

/**
 * Suggest gas for cancellation (send 0 to self)
 *
 * @param currentGasPrice Current gas price
 * @returns Suggested gas price for cancel transaction
 */
export function suggestCancelGas(currentGasPrice: bigint): bigint {
  // Cancel transactions need higher gas to be picked up
  return suggestSpeedUp(currentGasPrice, 20);
}

/**
 * Validate gas parameters
 *
 * @param gasLimit Gas limit
 * @param gasPrice Gas price
 * @param maxFeePerGas Max fee per gas (EIP-1559)
 * @param maxPriorityFeePerGas Max priority fee per gas (EIP-1559)
 * @returns Validation result
 */
export function validateGasParams(
  gasLimit: bigint,
  gasPrice?: bigint,
  maxFeePerGas?: bigint,
  maxPriorityFeePerGas?: bigint
): { valid: boolean; error?: string } {
  if (gasLimit < MIN_GAS_LIMIT) {
    return { valid: false, error: `Gas limit must be at least ${MIN_GAS_LIMIT}` };
  }

  if (gasLimit > 30000000n) {
    return { valid: false, error: 'Gas limit exceeds block gas limit' };
  }

  if (gasPrice !== undefined && gasPrice <= 0n) {
    return { valid: false, error: 'Gas price must be positive' };
  }

  if (maxFeePerGas !== undefined) {
    if (maxFeePerGas <= 0n) {
      return { valid: false, error: 'Max fee per gas must be positive' };
    }

    if (maxPriorityFeePerGas !== undefined) {
      if (maxPriorityFeePerGas <= 0n) {
        return { valid: false, error: 'Max priority fee must be positive' };
      }

      if (maxPriorityFeePerGas > maxFeePerGas) {
        return { valid: false, error: 'Max priority fee cannot exceed max fee' };
      }
    }
  }

  return { valid: true };
}
