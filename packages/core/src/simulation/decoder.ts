/**
 * Transaction Data Decoder
 *
 * Decodes transaction calldata to human-readable format
 */

import { Interface, AbiCoder } from 'ethers';
import type { DecodedMethod, DecodedParam } from './types';

// Common function signatures
const KNOWN_SIGNATURES: Record<string, string> = {
  // ERC20
  '0xa9059cbb': 'transfer(address,uint256)',
  '0x23b872dd': 'transferFrom(address,address,uint256)',
  '0x095ea7b3': 'approve(address,uint256)',
  '0x39509351': 'increaseAllowance(address,uint256)',
  '0xa457c2d7': 'decreaseAllowance(address,uint256)',

  // ERC721
  '0x42842e0e': 'safeTransferFrom(address,address,uint256)',
  '0xb88d4fde': 'safeTransferFrom(address,address,uint256,bytes)',
  '0xa22cb465': 'setApprovalForAll(address,bool)',

  // ERC1155
  '0xf242432a': 'safeTransferFrom(address,address,uint256,uint256,bytes)',
  '0x2eb2c2d6': 'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)',

  // Uniswap V2 Router
  '0x38ed1739': 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
  '0x8803dbee': 'swapTokensForExactTokens(uint256,uint256,address[],address,uint256)',
  '0x7ff36ab5': 'swapExactETHForTokens(uint256,address[],address,uint256)',
  '0xfb3bdb41': 'swapETHForExactTokens(uint256,address[],address,uint256)',
  '0x18cbafe5': 'swapExactTokensForETH(uint256,uint256,address[],address,uint256)',
  '0x4a25d94a': 'swapTokensForExactETH(uint256,uint256,address[],address,uint256)',

  // Uniswap V3 Router
  '0xc04b8d59': 'exactInput((bytes,address,uint256,uint256,uint256))',
  '0xdb3e2198': 'exactOutputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))',

  // WETH
  '0xd0e30db0': 'deposit()',
  '0x2e1a7d4d': 'withdraw(uint256)',

  // Common DeFi
  '0xe8e33700': 'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)',
  '0xbaa2abde': 'removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)',
  '0xa694fc3a': 'stake(uint256)',
  '0x2e1a7d4d': 'withdraw(uint256)',
  '0x3d18b912': 'getReward()',
  '0xe9fad8ee': 'exit()',

  // Multicall
  '0xac9650d8': 'multicall(bytes[])',
  '0x5ae401dc': 'multicall(uint256,bytes[])',

  // Permit
  '0xd505accf': 'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)',
  '0x8fcbaf0c': 'permit(address,address,uint256,uint256,bool,uint8,bytes32,bytes32)',
};

// Human-readable method names
const METHOD_NAMES: Record<string, string> = {
  transfer: 'Transfer Tokens',
  transferFrom: 'Transfer Tokens From',
  approve: 'Approve Spending',
  safeTransferFrom: 'Transfer NFT',
  setApprovalForAll: 'Approve All NFTs',
  swapExactTokensForTokens: 'Swap Tokens',
  swapExactETHForTokens: 'Swap ETH for Tokens',
  swapExactTokensForETH: 'Swap Tokens for ETH',
  deposit: 'Wrap ETH',
  withdraw: 'Unwrap WETH',
  addLiquidity: 'Add Liquidity',
  removeLiquidity: 'Remove Liquidity',
  stake: 'Stake Tokens',
  getReward: 'Claim Rewards',
  exit: 'Exit Staking',
  multicall: 'Batch Transactions',
  permit: 'Sign Permit',
};

/**
 * Decode transaction calldata
 */
export function decodeTransactionData(data: string): DecodedMethod | null {
  if (!data || data === '0x' || data.length < 10) {
    return null;
  }

  const selector = data.slice(0, 10).toLowerCase();
  const signature = KNOWN_SIGNATURES[selector];

  if (!signature) {
    return {
      name: 'Unknown Method',
      signature: selector,
      params: [],
    };
  }

  try {
    const iface = new Interface([`function ${signature}`]);
    const decoded = iface.parseTransaction({ data });

    if (!decoded) {
      return {
        name: getMethodName(signature),
        signature,
        params: [],
      };
    }

    const fragment = decoded.fragment;
    const params: DecodedParam[] = fragment.inputs.map((input, index) => ({
      name: input.name || `param${index}`,
      type: input.type,
      value: formatParamValue(decoded.args[index], input.type),
    }));

    return {
      name: getMethodName(fragment.name),
      signature,
      params,
    };
  } catch {
    return {
      name: 'Unknown Method',
      signature: selector,
      params: [],
    };
  }
}

/**
 * Get human-readable method name
 */
function getMethodName(signature: string): string {
  const methodName = signature.split('(')[0];
  return METHOD_NAMES[methodName] || methodName;
}

/**
 * Format parameter value for display
 */
function formatParamValue(value: unknown, type: string): unknown {
  if (type === 'address') {
    return value;
  }

  if (type.startsWith('uint') || type.startsWith('int')) {
    return value?.toString();
  }

  if (type === 'bytes' || type.startsWith('bytes')) {
    const bytes = value as string;
    if (bytes.length > 66) {
      return `${bytes.slice(0, 34)}...${bytes.slice(-32)}`;
    }
    return bytes;
  }

  if (type.endsWith('[]')) {
    return Array.isArray(value) ? value.map((v, i) => formatParamValue(v, type.slice(0, -2))) : value;
  }

  return value;
}

/**
 * Detect if transaction is a token approval
 */
export function isApproval(data: string): boolean {
  if (!data || data.length < 10) return false;
  const selector = data.slice(0, 10).toLowerCase();
  return selector === '0x095ea7b3' || selector === '0xa22cb465';
}

/**
 * Detect if transaction is a token transfer
 */
export function isTransfer(data: string): boolean {
  if (!data || data.length < 10) return false;
  const selector = data.slice(0, 10).toLowerCase();
  return (
    selector === '0xa9059cbb' ||
    selector === '0x23b872dd' ||
    selector === '0x42842e0e' ||
    selector === '0xb88d4fde' ||
    selector === '0xf242432a'
  );
}

/**
 * Detect if transaction is a swap
 */
export function isSwap(data: string): boolean {
  if (!data || data.length < 10) return false;
  const selector = data.slice(0, 10).toLowerCase();
  return [
    '0x38ed1739',
    '0x8803dbee',
    '0x7ff36ab5',
    '0xfb3bdb41',
    '0x18cbafe5',
    '0x4a25d94a',
    '0xc04b8d59',
    '0xdb3e2198',
  ].includes(selector);
}

/**
 * Decode approval parameters
 */
export function decodeApproval(data: string): { spender: string; amount: string } | null {
  if (!data || data.length < 10) return null;

  const selector = data.slice(0, 10).toLowerCase();
  if (selector !== '0x095ea7b3') return null;

  try {
    const abiCoder = AbiCoder.defaultAbiCoder();
    const params = abiCoder.decode(['address', 'uint256'], '0x' + data.slice(10));

    return {
      spender: params[0],
      amount: params[1].toString(),
    };
  } catch {
    return null;
  }
}

/**
 * Decode transfer parameters
 */
export function decodeTransfer(
  data: string
): { to: string; amount: string } | { from: string; to: string; amount: string } | null {
  if (!data || data.length < 10) return null;

  const selector = data.slice(0, 10).toLowerCase();
  const abiCoder = AbiCoder.defaultAbiCoder();

  try {
    if (selector === '0xa9059cbb') {
      // transfer(address,uint256)
      const params = abiCoder.decode(['address', 'uint256'], '0x' + data.slice(10));
      return {
        to: params[0],
        amount: params[1].toString(),
      };
    }

    if (selector === '0x23b872dd') {
      // transferFrom(address,address,uint256)
      const params = abiCoder.decode(['address', 'address', 'uint256'], '0x' + data.slice(10));
      return {
        from: params[0],
        to: params[1],
        amount: params[2].toString(),
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if amount is unlimited (max uint256)
 */
export function isUnlimitedApproval(amount: string): boolean {
  const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
  return amount === maxUint256 || BigInt(amount) > BigInt(10) ** BigInt(50);
}
