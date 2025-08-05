/**
 * ERC-20 Token Contract Interactions
 */

import { Contract, Interface, formatUnits, parseUnits } from 'ethers';
import type { ChainProvider } from '../networks/provider';
import type { TokenInfo, TokenApproval } from './types';

// ERC-20 ABI (minimal)
const ERC20_ABI = [
  // Read functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  // Write functions
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

const erc20Interface = new Interface(ERC20_ABI);

// Max uint256 for unlimited approval
export const MAX_UINT256 = 2n ** 256n - 1n;

/**
 * ERC-20 Token service
 */
export class ERC20Service {
  private provider: ChainProvider;

  constructor(provider: ChainProvider) {
    this.provider = provider;
  }

  /**
   * Get token metadata
   *
   * @param tokenAddress Token contract address
   * @returns Token info
   */
  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    const ethersProvider = this.provider.getProvider();
    if (!ethersProvider) {
      throw new Error('Provider not connected');
    }

    const contract = new Contract(tokenAddress, ERC20_ABI, ethersProvider);

    const [name, symbol, decimals] = await Promise.all([
      contract.name().catch(() => 'Unknown'),
      contract.symbol().catch(() => '???'),
      contract.decimals().catch(() => 18),
    ]);

    return {
      address: tokenAddress,
      chainId: this.provider.getChainId(),
      name,
      symbol,
      decimals: Number(decimals),
    };
  }

  /**
   * Get token balance for an address
   *
   * @param tokenAddress Token contract address
   * @param ownerAddress Owner address
   * @returns Balance in token's smallest unit
   */
  async getBalance(tokenAddress: string, ownerAddress: string): Promise<bigint> {
    const ethersProvider = this.provider.getProvider();
    if (!ethersProvider) {
      throw new Error('Provider not connected');
    }

    const contract = new Contract(tokenAddress, ERC20_ABI, ethersProvider);
    return contract.balanceOf(ownerAddress);
  }

  /**
   * Get token allowance
   *
   * @param tokenAddress Token contract address
   * @param ownerAddress Owner address
   * @param spenderAddress Spender address
   * @returns Allowance amount
   */
  async getAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string
  ): Promise<bigint> {
    const ethersProvider = this.provider.getProvider();
    if (!ethersProvider) {
      throw new Error('Provider not connected');
    }

    const contract = new Contract(tokenAddress, ERC20_ABI, ethersProvider);
    return contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Encode transfer function call
   *
   * @param to Recipient address
   * @param amount Amount to transfer
   * @returns Encoded call data
   */
  encodeTransfer(to: string, amount: bigint): string {
    return erc20Interface.encodeFunctionData('transfer', [to, amount]);
  }

  /**
   * Encode approve function call
   *
   * @param spender Spender address
   * @param amount Amount to approve
   * @returns Encoded call data
   */
  encodeApprove(spender: string, amount: bigint): string {
    return erc20Interface.encodeFunctionData('approve', [spender, amount]);
  }

  /**
   * Encode transferFrom function call
   *
   * @param from From address
   * @param to To address
   * @param amount Amount to transfer
   * @returns Encoded call data
   */
  encodeTransferFrom(from: string, to: string, amount: bigint): string {
    return erc20Interface.encodeFunctionData('transferFrom', [from, to, amount]);
  }

  /**
   * Decode transfer event
   *
   * @param data Event data
   * @param topics Event topics
   * @returns Decoded transfer info
   */
  decodeTransferEvent(
    data: string,
    topics: string[]
  ): { from: string; to: string; value: bigint } | null {
    try {
      const decoded = erc20Interface.decodeEventLog('Transfer', data, topics);
      return {
        from: decoded.from,
        to: decoded.to,
        value: decoded.value,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get total supply
   *
   * @param tokenAddress Token contract address
   * @returns Total supply
   */
  async getTotalSupply(tokenAddress: string): Promise<bigint> {
    const ethersProvider = this.provider.getProvider();
    if (!ethersProvider) {
      throw new Error('Provider not connected');
    }

    const contract = new Contract(tokenAddress, ERC20_ABI, ethersProvider);
    return contract.totalSupply();
  }

  /**
   * Check if an address is a valid ERC-20 token
   *
   * @param address Address to check
   * @returns True if valid ERC-20
   */
  async isValidToken(address: string): Promise<boolean> {
    try {
      await this.getTokenInfo(address);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Format token amount with decimals
 *
 * @param amount Raw amount
 * @param decimals Token decimals
 * @param maxDecimals Max decimals to show
 * @returns Formatted string
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  maxDecimals?: number
): string {
  const formatted = formatUnits(amount, decimals);

  if (maxDecimals !== undefined) {
    const parts = formatted.split('.');
    if (parts.length === 2 && parts[1].length > maxDecimals) {
      return `${parts[0]}.${parts[1].slice(0, maxDecimals)}`;
    }
  }

  return formatted;
}

/**
 * Parse token amount to smallest unit
 *
 * @param amount Human readable amount
 * @param decimals Token decimals
 * @returns Raw amount
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

/**
 * Check if approval is unlimited
 *
 * @param amount Approval amount
 * @returns True if unlimited
 */
export function isUnlimitedApproval(amount: bigint): boolean {
  // Consider anything > 10^50 as unlimited
  return amount > 10n ** 50n;
}

/**
 * Get approval info for a spender
 *
 * @param token Token info
 * @param owner Owner address
 * @param spender Spender address
 * @param amount Approved amount
 * @returns Approval info
 */
export function getApprovalInfo(
  token: TokenInfo,
  owner: string,
  spender: string,
  amount: bigint
): TokenApproval {
  return {
    token,
    owner,
    spender,
    amount,
    isUnlimited: isUnlimitedApproval(amount),
  };
}
