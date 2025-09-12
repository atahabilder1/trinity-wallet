import { formatEther } from 'ethers';

/**
 * Format address for display (truncated)
 */
export function formatAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end + 2) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * Format balance from wei to ETH
 */
export function formatBalance(wei: bigint, decimals = 4): string {
  const formatted = formatEther(wei);
  const parts = formatted.split('.');

  if (parts.length === 1) return parts[0];

  return `${parts[0]}.${parts[1].slice(0, decimals)}`;
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format USD value
 */
export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Format date/time
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
