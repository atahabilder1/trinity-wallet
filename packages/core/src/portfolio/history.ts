/**
 * Portfolio History
 *
 * Tracks and retrieves historical portfolio values
 */

import type { PortfolioHistory, PortfolioHistoryPoint, TransactionHistoryItem } from './types';

// Local storage key for history
const HISTORY_STORAGE_KEY = 'trinity_portfolio_history';

interface StoredHistory {
  address: string;
  points: PortfolioHistoryPoint[];
  lastSnapshot: number;
}

/**
 * Portfolio History Manager
 */
export class PortfolioHistoryManager {
  private address: string;
  private storage: Storage | null;
  private history: PortfolioHistoryPoint[] = [];
  private snapshotInterval: number = 3600000; // 1 hour

  constructor(address: string, storage?: Storage) {
    this.address = address.toLowerCase();
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.loadHistory();
  }

  /**
   * Load history from storage
   */
  private loadHistory(): void {
    if (!this.storage) return;

    try {
      const stored = this.storage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const data: StoredHistory[] = JSON.parse(stored);
        const addressHistory = data.find(h => h.address === this.address);
        if (addressHistory) {
          this.history = addressHistory.points;
        }
      }
    } catch (error) {
      console.warn('Failed to load portfolio history:', error);
    }
  }

  /**
   * Save history to storage
   */
  private saveHistory(): void {
    if (!this.storage) return;

    try {
      const stored = this.storage.getItem(HISTORY_STORAGE_KEY);
      let data: StoredHistory[] = stored ? JSON.parse(stored) : [];

      // Update or add this address's history
      const index = data.findIndex(h => h.address === this.address);
      const entry: StoredHistory = {
        address: this.address,
        points: this.history,
        lastSnapshot: Date.now(),
      };

      if (index !== -1) {
        data[index] = entry;
      } else {
        data.push(entry);
      }

      // Keep only last 365 days of data per address
      const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
      for (const item of data) {
        item.points = item.points.filter(p => p.timestamp > oneYearAgo);
      }

      this.storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save portfolio history:', error);
    }
  }

  /**
   * Record a portfolio value snapshot
   */
  recordSnapshot(valueUsd: number): void {
    const now = Date.now();

    // Only record if enough time has passed since last snapshot
    const lastPoint = this.history[this.history.length - 1];
    if (lastPoint && now - lastPoint.timestamp < this.snapshotInterval) {
      return;
    }

    this.history.push({
      timestamp: now,
      valueUsd,
    });

    // Keep only last 365 days
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
    this.history = this.history.filter(p => p.timestamp > oneYearAgo);

    this.saveHistory();
  }

  /**
   * Get history for a time period
   */
  getHistory(period: PortfolioHistory['period']): PortfolioHistory {
    const now = Date.now();
    let startTime: number;

    switch (period) {
      case '24h':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case '7d':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case '90d':
        startTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case '1y':
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
      case 'all':
      default:
        startTime = 0;
        break;
    }

    const points = this.history.filter(p => p.timestamp >= startTime);
    const startValue = points.length > 0 ? points[0].valueUsd : 0;
    const endValue = points.length > 0 ? points[points.length - 1].valueUsd : 0;
    const change = endValue - startValue;
    const changePercent = startValue > 0 ? (change / startValue) * 100 : 0;

    return {
      points,
      period,
      startValue,
      endValue,
      change,
      changePercent,
    };
  }

  /**
   * Get data points for charting
   */
  getChartData(period: PortfolioHistory['period'], maxPoints: number = 100): PortfolioHistoryPoint[] {
    const history = this.getHistory(period);
    const points = history.points;

    if (points.length <= maxPoints) {
      return points;
    }

    // Downsample to maxPoints
    const step = Math.ceil(points.length / maxPoints);
    const downsampled: PortfolioHistoryPoint[] = [];

    for (let i = 0; i < points.length; i += step) {
      downsampled.push(points[i]);
    }

    // Always include the last point
    if (downsampled[downsampled.length - 1] !== points[points.length - 1]) {
      downsampled.push(points[points.length - 1]);
    }

    return downsampled;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }

  /**
   * Set snapshot interval
   */
  setSnapshotInterval(intervalMs: number): void {
    this.snapshotInterval = intervalMs;
  }
}

/**
 * Create a history manager instance
 */
export function createHistoryManager(address: string, storage?: Storage): PortfolioHistoryManager {
  return new PortfolioHistoryManager(address, storage);
}

/**
 * Transaction History Service
 */
export class TransactionHistoryService {
  private rpcUrl: string;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  /**
   * Get transaction history for an address
   * Note: This would typically use an indexer or block explorer API
   */
  async getTransactions(
    address: string,
    options: {
      limit?: number;
      offset?: number;
      chainId?: number;
    } = {}
  ): Promise<TransactionHistoryItem[]> {
    // In a real implementation, this would call:
    // - Etherscan/Polygonscan/etc. APIs
    // - The Graph subgraphs
    // - Custom indexer

    // For now, return empty array
    // The actual implementation would depend on the indexer being used
    return [];
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(hash: string, chainId: number): Promise<TransactionHistoryItem | null> {
    // Would fetch from RPC or indexer
    return null;
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
