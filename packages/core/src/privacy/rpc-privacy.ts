/**
 * RPC Privacy Layer
 * Provides privacy-preserving RPC connections with rotation and proxy support
 */

import type { ChainConfig } from '../networks/types';

/**
 * Privacy configuration
 */
export interface PrivacyConfig {
  /** Enable RPC rotation between requests */
  enableRpcRotation: boolean;
  /** Rotation interval in milliseconds (0 = every request) */
  rotationInterval: number;
  /** Enable Tor proxy support */
  enableTor: boolean;
  /** Tor SOCKS5 proxy URL */
  torProxyUrl: string;
  /** Use Flashbots Protect for Ethereum mainnet */
  enableFlashbotsProtect: boolean;
  /** Custom RPC timeout in milliseconds */
  requestTimeout: number;
  /** Add random delay to requests to prevent timing analysis */
  enableRequestJitter: boolean;
  /** Maximum jitter delay in milliseconds */
  maxJitterMs: number;
}

/**
 * Default privacy configuration
 */
export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  enableRpcRotation: true,
  rotationInterval: 0, // Rotate every request
  enableTor: false,
  torProxyUrl: 'socks5://127.0.0.1:9050',
  enableFlashbotsProtect: false,
  requestTimeout: 30000,
  enableRequestJitter: false,
  maxJitterMs: 500,
};

/**
 * Flashbots Protect RPC endpoints
 */
export const FLASHBOTS_RPC = {
  MAINNET: 'https://rpc.flashbots.net',
  GOERLI: 'https://rpc-goerli.flashbots.net',
};

/**
 * RPC endpoint with metadata
 */
interface RpcEndpoint {
  url: string;
  lastUsed: number;
  errorCount: number;
  avgResponseTime: number;
  isHealthy: boolean;
}

/**
 * Privacy-enhanced RPC manager
 */
export class PrivacyRpcManager {
  private config: PrivacyConfig;
  private endpoints: Map<number, RpcEndpoint[]> = new Map();
  private currentIndices: Map<number, number> = new Map();
  private lastRotation: Map<number, number> = new Map();

  constructor(config: Partial<PrivacyConfig> = {}) {
    this.config = { ...DEFAULT_PRIVACY_CONFIG, ...config };
  }

  /**
   * Update privacy configuration
   */
  updateConfig(config: Partial<PrivacyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): PrivacyConfig {
    return { ...this.config };
  }

  /**
   * Initialize endpoints for a chain
   */
  initializeChain(chainConfig: ChainConfig): void {
    const endpoints: RpcEndpoint[] = chainConfig.rpcUrls.map(url => ({
      url,
      lastUsed: 0,
      errorCount: 0,
      avgResponseTime: 0,
      isHealthy: true,
    }));

    // Add Flashbots for Ethereum mainnet if enabled
    if (this.config.enableFlashbotsProtect && chainConfig.chainId === 1) {
      endpoints.unshift({
        url: FLASHBOTS_RPC.MAINNET,
        lastUsed: 0,
        errorCount: 0,
        avgResponseTime: 0,
        isHealthy: true,
      });
    }

    this.endpoints.set(chainConfig.chainId, endpoints);
    this.currentIndices.set(chainConfig.chainId, 0);
    this.lastRotation.set(chainConfig.chainId, Date.now());
  }

  /**
   * Get next RPC endpoint for a chain
   * Implements rotation logic
   */
  getNextEndpoint(chainId: number): string {
    const endpoints = this.endpoints.get(chainId);
    if (!endpoints || endpoints.length === 0) {
      throw new Error(`No endpoints configured for chain ${chainId}`);
    }

    // Get healthy endpoints
    const healthyEndpoints = endpoints.filter(e => e.isHealthy);
    if (healthyEndpoints.length === 0) {
      // Reset all to healthy if all failed
      endpoints.forEach(e => {
        e.isHealthy = true;
        e.errorCount = 0;
      });
    }

    let currentIndex = this.currentIndices.get(chainId) ?? 0;
    const lastRotation = this.lastRotation.get(chainId) ?? 0;
    const now = Date.now();

    // Check if we should rotate
    const shouldRotate =
      this.config.enableRpcRotation &&
      (this.config.rotationInterval === 0 ||
        now - lastRotation >= this.config.rotationInterval);

    if (shouldRotate) {
      // Find next healthy endpoint
      let attempts = 0;
      do {
        currentIndex = (currentIndex + 1) % endpoints.length;
        attempts++;
      } while (!endpoints[currentIndex].isHealthy && attempts < endpoints.length);

      this.currentIndices.set(chainId, currentIndex);
      this.lastRotation.set(chainId, now);
    }

    const endpoint = endpoints[currentIndex];
    endpoint.lastUsed = now;

    return endpoint.url;
  }

  /**
   * Report endpoint success
   */
  reportSuccess(chainId: number, url: string, responseTime: number): void {
    const endpoints = this.endpoints.get(chainId);
    if (!endpoints) return;

    const endpoint = endpoints.find(e => e.url === url);
    if (endpoint) {
      endpoint.isHealthy = true;
      endpoint.errorCount = 0;
      // Rolling average
      endpoint.avgResponseTime =
        endpoint.avgResponseTime === 0
          ? responseTime
          : (endpoint.avgResponseTime * 0.8 + responseTime * 0.2);
    }
  }

  /**
   * Report endpoint failure
   */
  reportFailure(chainId: number, url: string): void {
    const endpoints = this.endpoints.get(chainId);
    if (!endpoints) return;

    const endpoint = endpoints.find(e => e.url === url);
    if (endpoint) {
      endpoint.errorCount++;
      // Mark as unhealthy after 3 consecutive failures
      if (endpoint.errorCount >= 3) {
        endpoint.isHealthy = false;
      }
    }
  }

  /**
   * Add random jitter delay if enabled
   */
  async applyJitter(): Promise<void> {
    if (!this.config.enableRequestJitter || this.config.maxJitterMs <= 0) {
      return;
    }

    const delay = Math.random() * this.config.maxJitterMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Get all endpoints for a chain with stats
   */
  getEndpointStats(chainId: number): RpcEndpoint[] {
    return [...(this.endpoints.get(chainId) ?? [])];
  }

  /**
   * Force rotate to next endpoint
   */
  forceRotate(chainId: number): string {
    const endpoints = this.endpoints.get(chainId);
    if (!endpoints || endpoints.length === 0) {
      throw new Error(`No endpoints configured for chain ${chainId}`);
    }

    let currentIndex = this.currentIndices.get(chainId) ?? 0;
    currentIndex = (currentIndex + 1) % endpoints.length;

    this.currentIndices.set(chainId, currentIndex);
    this.lastRotation.set(chainId, Date.now());

    return endpoints[currentIndex].url;
  }

  /**
   * Check if Tor is available
   */
  async checkTorAvailability(): Promise<boolean> {
    if (!this.config.enableTor) {
      return false;
    }

    // In a real implementation, this would test the SOCKS5 proxy
    // For now, return false as Tor requires additional setup
    return false;
  }

  /**
   * Get privacy score based on current configuration
   * Higher score = more private
   */
  getPrivacyScore(): { score: number; maxScore: number; details: string[] } {
    const details: string[] = [];
    let score = 0;
    const maxScore = 100;

    // RPC rotation: 30 points
    if (this.config.enableRpcRotation) {
      score += 20;
      details.push('RPC rotation enabled (+20)');

      if (this.config.rotationInterval === 0) {
        score += 10;
        details.push('Rotating every request (+10)');
      }
    } else {
      details.push('RPC rotation disabled (0)');
    }

    // Tor: 40 points
    if (this.config.enableTor) {
      score += 40;
      details.push('Tor enabled (+40)');
    } else {
      details.push('Tor disabled (0)');
    }

    // Flashbots: 15 points
    if (this.config.enableFlashbotsProtect) {
      score += 15;
      details.push('Flashbots Protect enabled (+15)');
    } else {
      details.push('Flashbots disabled (0)');
    }

    // Request jitter: 15 points
    if (this.config.enableRequestJitter) {
      score += 15;
      details.push('Request jitter enabled (+15)');
    } else {
      details.push('Request jitter disabled (0)');
    }

    return { score, maxScore, details };
  }
}

/**
 * Create singleton instance
 */
let privacyRpcManagerInstance: PrivacyRpcManager | null = null;

export function getPrivacyRpcManager(): PrivacyRpcManager {
  if (!privacyRpcManagerInstance) {
    privacyRpcManagerInstance = new PrivacyRpcManager();
  }
  return privacyRpcManagerInstance;
}
