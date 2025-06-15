/**
 * Address Rotation System
 * Automatically generates and manages rotating addresses for enhanced privacy
 */

import type { HDWallet, DerivedAccount } from '../wallet/hdwallet';

/**
 * Address usage tracking
 */
export interface AddressUsage {
  /** Address */
  address: string;
  /** HD derivation index */
  hdIndex: number;
  /** Number of times used */
  usageCount: number;
  /** First used timestamp */
  firstUsedAt: number;
  /** Last used timestamp */
  lastUsedAt: number;
  /** Total value received (in wei) */
  totalReceived: bigint;
  /** Total value sent (in wei) */
  totalSent: bigint;
  /** Is this address exposed (used publicly) */
  isExposed: boolean;
  /** Purpose/label */
  label?: string;
}

/**
 * Rotation configuration
 */
export interface RotationConfig {
  /** Enable automatic rotation for receiving */
  autoRotateReceive: boolean;
  /** Enable automatic rotation for change addresses */
  autoRotateChange: boolean;
  /** Maximum uses before suggesting new address */
  maxUsesPerAddress: number;
  /** Generate new address for each DApp */
  uniqueAddressPerDApp: boolean;
  /** Gap limit for address scanning */
  gapLimit: number;
}

/**
 * Default rotation configuration
 */
export const DEFAULT_ROTATION_CONFIG: RotationConfig = {
  autoRotateReceive: true,
  autoRotateChange: true,
  maxUsesPerAddress: 1,
  uniqueAddressPerDApp: true,
  gapLimit: 20,
};

/**
 * Address rotation manager
 */
export class AddressRotationManager {
  private config: RotationConfig;
  private usageMap: Map<string, AddressUsage> = new Map();
  private nextReceiveIndex: number = 0;
  private nextChangeIndex: number = 0;
  private dappAddresses: Map<string, string> = new Map(); // DApp origin -> address

  // Separate derivation paths for receive and change
  private static RECEIVE_PATH_PREFIX = "m/44'/60'/0'/0"; // Standard external
  private static CHANGE_PATH_PREFIX = "m/44'/60'/0'/1"; // Change addresses

  constructor(config: Partial<RotationConfig> = {}) {
    this.config = { ...DEFAULT_ROTATION_CONFIG, ...config };
  }

  /**
   * Update rotation configuration
   */
  updateConfig(config: Partial<RotationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RotationConfig {
    return { ...this.config };
  }

  /**
   * Get next receive address
   * @param wallet HD wallet instance
   * @param forceNew Force generation of new address
   */
  getReceiveAddress(wallet: HDWallet, forceNew: boolean = false): DerivedAccount {
    if (this.config.autoRotateReceive || forceNew) {
      // Find unused address or generate new one
      for (let i = 0; i < this.nextReceiveIndex; i++) {
        const address = wallet.deriveAccount(i).address.toLowerCase();
        const usage = this.usageMap.get(address);

        if (!usage || (usage.usageCount < this.config.maxUsesPerAddress && !usage.isExposed)) {
          this.nextReceiveIndex = Math.max(this.nextReceiveIndex, i + 1);
          return wallet.deriveAccount(i);
        }
      }

      // Generate new address
      const account = wallet.deriveAccount(this.nextReceiveIndex);
      this.nextReceiveIndex++;
      return account;
    }

    // Return primary address if rotation disabled
    return wallet.deriveAccount(0);
  }

  /**
   * Get address for a specific DApp
   * @param wallet HD wallet instance
   * @param dappOrigin DApp origin URL
   */
  getDAppAddress(wallet: HDWallet, dappOrigin: string): DerivedAccount {
    if (!this.config.uniqueAddressPerDApp) {
      return wallet.deriveAccount(0);
    }

    // Check if we already have an address for this DApp
    const existingAddress = this.dappAddresses.get(dappOrigin);
    if (existingAddress) {
      // Find the index for this address
      for (let i = 0; i <= this.nextReceiveIndex + this.config.gapLimit; i++) {
        const account = wallet.deriveAccount(i);
        if (account.address.toLowerCase() === existingAddress.toLowerCase()) {
          return account;
        }
      }
    }

    // Generate new address for this DApp
    const account = this.getReceiveAddress(wallet, true);
    this.dappAddresses.set(dappOrigin, account.address.toLowerCase());

    // Mark as exposed since it's being shared with a DApp
    this.markAddressExposed(account.address);

    return account;
  }

  /**
   * Get change address for a transaction
   * @param wallet HD wallet instance
   */
  getChangeAddress(wallet: HDWallet): DerivedAccount {
    if (!this.config.autoRotateChange) {
      return wallet.deriveAccount(0);
    }

    // Use change derivation path
    const path = `${AddressRotationManager.CHANGE_PATH_PREFIX}/${this.nextChangeIndex}`;
    const account = wallet.deriveAtPath(path);
    this.nextChangeIndex++;

    return account;
  }

  /**
   * Record address usage
   */
  recordUsage(
    address: string,
    hdIndex: number,
    type: 'receive' | 'send',
    amount: bigint
  ): void {
    const normalizedAddress = address.toLowerCase();
    let usage = this.usageMap.get(normalizedAddress);

    if (!usage) {
      usage = {
        address: normalizedAddress,
        hdIndex,
        usageCount: 0,
        firstUsedAt: Date.now(),
        lastUsedAt: Date.now(),
        totalReceived: 0n,
        totalSent: 0n,
        isExposed: false,
      };
    }

    usage.usageCount++;
    usage.lastUsedAt = Date.now();

    if (type === 'receive') {
      usage.totalReceived += amount;
    } else {
      usage.totalSent += amount;
    }

    this.usageMap.set(normalizedAddress, usage);
  }

  /**
   * Mark address as exposed (shared publicly)
   */
  markAddressExposed(address: string, label?: string): void {
    const normalizedAddress = address.toLowerCase();
    let usage = this.usageMap.get(normalizedAddress);

    if (!usage) {
      usage = {
        address: normalizedAddress,
        hdIndex: -1,
        usageCount: 0,
        firstUsedAt: Date.now(),
        lastUsedAt: Date.now(),
        totalReceived: 0n,
        totalSent: 0n,
        isExposed: true,
        label,
      };
    } else {
      usage.isExposed = true;
      if (label) {
        usage.label = label;
      }
    }

    this.usageMap.set(normalizedAddress, usage);
  }

  /**
   * Get address usage statistics
   */
  getAddressUsage(address: string): AddressUsage | undefined {
    return this.usageMap.get(address.toLowerCase());
  }

  /**
   * Get all used addresses
   */
  getAllUsedAddresses(): AddressUsage[] {
    return Array.from(this.usageMap.values());
  }

  /**
   * Get unexposed addresses (for private operations)
   */
  getUnexposedAddresses(): AddressUsage[] {
    return Array.from(this.usageMap.values()).filter(u => !u.isExposed);
  }

  /**
   * Get exposed addresses
   */
  getExposedAddresses(): AddressUsage[] {
    return Array.from(this.usageMap.values()).filter(u => u.isExposed);
  }

  /**
   * Get DApp address mapping
   */
  getDAppAddresses(): Record<string, string> {
    return Object.fromEntries(this.dappAddresses);
  }

  /**
   * Check if address should be rotated
   */
  shouldRotate(address: string): boolean {
    const usage = this.usageMap.get(address.toLowerCase());
    if (!usage) return false;

    return usage.usageCount >= this.config.maxUsesPerAddress || usage.isExposed;
  }

  /**
   * Get privacy score for addresses
   */
  getAddressPrivacyScore(): {
    score: number;
    maxScore: number;
    exposedCount: number;
    totalCount: number;
    recommendations: string[];
  } {
    const addresses = Array.from(this.usageMap.values());
    const exposedCount = addresses.filter(a => a.isExposed).length;
    const totalCount = addresses.length;
    const recommendations: string[] = [];

    let score = 100;

    // Deduct for exposed addresses
    const exposureRatio = totalCount > 0 ? exposedCount / totalCount : 0;
    score -= Math.round(exposureRatio * 40);

    if (exposedCount > 0) {
      recommendations.push(`${exposedCount} address(es) are exposed. Consider using stealth addresses.`);
    }

    // Deduct for reused addresses
    const reusedCount = addresses.filter(a => a.usageCount > this.config.maxUsesPerAddress).length;
    if (reusedCount > 0) {
      score -= Math.min(30, reusedCount * 5);
      recommendations.push(`${reusedCount} address(es) have been reused. Enable auto-rotation.`);
    }

    // Bonus for using unique DApp addresses
    if (this.config.uniqueAddressPerDApp && this.dappAddresses.size > 0) {
      score = Math.min(100, score + 10);
    } else if (this.dappAddresses.size === 0 && !this.config.uniqueAddressPerDApp) {
      recommendations.push('Enable unique addresses per DApp for better privacy.');
    }

    return {
      score: Math.max(0, score),
      maxScore: 100,
      exposedCount,
      totalCount,
      recommendations,
    };
  }

  /**
   * Export state for persistence
   */
  export(): {
    usageMap: [string, AddressUsage][];
    dappAddresses: [string, string][];
    nextReceiveIndex: number;
    nextChangeIndex: number;
  } {
    return {
      usageMap: Array.from(this.usageMap.entries()).map(([k, v]) => [
        k,
        { ...v, totalReceived: v.totalReceived.toString(), totalSent: v.totalSent.toString() } as any,
      ]),
      dappAddresses: Array.from(this.dappAddresses.entries()),
      nextReceiveIndex: this.nextReceiveIndex,
      nextChangeIndex: this.nextChangeIndex,
    };
  }

  /**
   * Import state from persistence
   */
  import(state: {
    usageMap: [string, any][];
    dappAddresses: [string, string][];
    nextReceiveIndex: number;
    nextChangeIndex: number;
  }): void {
    this.usageMap = new Map(
      state.usageMap.map(([k, v]) => [
        k,
        {
          ...v,
          totalReceived: BigInt(v.totalReceived || '0'),
          totalSent: BigInt(v.totalSent || '0'),
        },
      ])
    );
    this.dappAddresses = new Map(state.dappAddresses);
    this.nextReceiveIndex = state.nextReceiveIndex;
    this.nextChangeIndex = state.nextChangeIndex;
  }

  /**
   * Reset all tracking data
   */
  reset(): void {
    this.usageMap.clear();
    this.dappAddresses.clear();
    this.nextReceiveIndex = 0;
    this.nextChangeIndex = 0;
  }
}
