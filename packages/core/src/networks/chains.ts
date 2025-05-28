/**
 * Chain configurations for supported networks
 */

import type { ChainConfig } from './types';

/**
 * Ethereum Mainnet
 */
export const ETHEREUM: ChainConfig = {
  chainId: 1,
  name: 'Ethereum',
  shortName: 'ETH',
  network: 'mainnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
    'https://1rpc.io/eth',
  ],
  blockExplorers: [
    { name: 'Etherscan', url: 'https://etherscan.io', apiUrl: 'https://api.etherscan.io/api' },
  ],
  isEvm: true,
  blockTime: 12,
  supportsEip1559: true,
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
  ensAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
};

/**
 * Ethereum Sepolia Testnet
 */
export const SEPOLIA: ChainConfig = {
  chainId: 11155111,
  name: 'Sepolia',
  shortName: 'SEP',
  network: 'testnet',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'SEP',
    decimals: 18,
  },
  rpcUrls: [
    'https://rpc.sepolia.org',
    'https://rpc2.sepolia.org',
    'https://ethereum-sepolia.publicnode.com',
  ],
  blockExplorers: [
    { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  ],
  isEvm: true,
  blockTime: 12,
  supportsEip1559: true,
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
};

/**
 * Polygon Mainnet
 */
export const POLYGON: ChainConfig = {
  chainId: 137,
  name: 'Polygon',
  shortName: 'MATIC',
  network: 'mainnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: [
    'https://polygon-rpc.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon.llamarpc.com',
    'https://polygon-bor.publicnode.com',
  ],
  blockExplorers: [
    { name: 'PolygonScan', url: 'https://polygonscan.com', apiUrl: 'https://api.polygonscan.com/api' },
  ],
  isEvm: true,
  isL2: true,
  parentChainId: 1,
  blockTime: 2,
  supportsEip1559: true,
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
};

/**
 * BNB Smart Chain
 */
export const BSC: ChainConfig = {
  chainId: 56,
  name: 'BNB Smart Chain',
  shortName: 'BSC',
  network: 'mainnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: [
    'https://bsc-dataseed.binance.org',
    'https://bsc-dataseed1.defibit.io',
    'https://rpc.ankr.com/bsc',
    'https://bsc.publicnode.com',
  ],
  blockExplorers: [
    { name: 'BscScan', url: 'https://bscscan.com', apiUrl: 'https://api.bscscan.com/api' },
  ],
  isEvm: true,
  blockTime: 3,
  supportsEip1559: false,
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
};

/**
 * Arbitrum One
 */
export const ARBITRUM: ChainConfig = {
  chainId: 42161,
  name: 'Arbitrum One',
  shortName: 'ARB',
  network: 'mainnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://arb1.arbitrum.io/rpc',
    'https://rpc.ankr.com/arbitrum',
    'https://arbitrum.llamarpc.com',
    'https://arbitrum-one.publicnode.com',
  ],
  blockExplorers: [
    { name: 'Arbiscan', url: 'https://arbiscan.io', apiUrl: 'https://api.arbiscan.io/api' },
  ],
  isEvm: true,
  isL2: true,
  parentChainId: 1,
  blockTime: 0.25,
  supportsEip1559: true,
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
};

/**
 * Optimism
 */
export const OPTIMISM: ChainConfig = {
  chainId: 10,
  name: 'Optimism',
  shortName: 'OP',
  network: 'mainnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://mainnet.optimism.io',
    'https://rpc.ankr.com/optimism',
    'https://optimism.llamarpc.com',
    'https://optimism.publicnode.com',
  ],
  blockExplorers: [
    { name: 'Optimistic Etherscan', url: 'https://optimistic.etherscan.io' },
  ],
  isEvm: true,
  isL2: true,
  parentChainId: 1,
  blockTime: 2,
  supportsEip1559: true,
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
};

/**
 * Base
 */
export const BASE: ChainConfig = {
  chainId: 8453,
  name: 'Base',
  shortName: 'BASE',
  network: 'mainnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://rpc.ankr.com/base',
    'https://base.publicnode.com',
  ],
  blockExplorers: [
    { name: 'BaseScan', url: 'https://basescan.org' },
  ],
  isEvm: true,
  isL2: true,
  parentChainId: 1,
  blockTime: 2,
  supportsEip1559: true,
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
};

/**
 * Avalanche C-Chain
 */
export const AVALANCHE: ChainConfig = {
  chainId: 43114,
  name: 'Avalanche C-Chain',
  shortName: 'AVAX',
  network: 'mainnet',
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
  },
  rpcUrls: [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://rpc.ankr.com/avalanche',
    'https://avalanche.public-rpc.com',
  ],
  blockExplorers: [
    { name: 'SnowTrace', url: 'https://snowtrace.io' },
  ],
  isEvm: true,
  blockTime: 2,
  supportsEip1559: true,
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
};

/**
 * zkSync Era
 */
export const ZKSYNC: ChainConfig = {
  chainId: 324,
  name: 'zkSync Era',
  shortName: 'zkSync',
  network: 'mainnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://mainnet.era.zksync.io',
    'https://zksync.drpc.org',
  ],
  blockExplorers: [
    { name: 'zkSync Explorer', url: 'https://explorer.zksync.io' },
  ],
  isEvm: true,
  isL2: true,
  parentChainId: 1,
  blockTime: 1,
  supportsEip1559: true,
};

/**
 * Linea
 */
export const LINEA: ChainConfig = {
  chainId: 59144,
  name: 'Linea',
  shortName: 'LINEA',
  network: 'mainnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://rpc.linea.build',
    'https://linea.drpc.org',
  ],
  blockExplorers: [
    { name: 'LineaScan', url: 'https://lineascan.build' },
  ],
  isEvm: true,
  isL2: true,
  parentChainId: 1,
  blockTime: 2,
  supportsEip1559: true,
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
};

/**
 * All supported chains
 */
export const SUPPORTED_CHAINS: ChainConfig[] = [
  ETHEREUM,
  POLYGON,
  BSC,
  ARBITRUM,
  OPTIMISM,
  BASE,
  AVALANCHE,
  ZKSYNC,
  LINEA,
  SEPOLIA,
];

/**
 * Chain map by chain ID
 */
export const CHAINS_BY_ID: Record<number, ChainConfig> = Object.fromEntries(
  SUPPORTED_CHAINS.map(chain => [chain.chainId, chain])
);

/**
 * Get chain configuration by ID
 *
 * @param chainId Chain ID
 * @returns Chain config or undefined
 */
export function getChainById(chainId: number): ChainConfig | undefined {
  return CHAINS_BY_ID[chainId];
}

/**
 * Get all mainnet chains
 */
export function getMainnets(): ChainConfig[] {
  return SUPPORTED_CHAINS.filter(chain => chain.network === 'mainnet');
}

/**
 * Get all testnet chains
 */
export function getTestnets(): ChainConfig[] {
  return SUPPORTED_CHAINS.filter(chain => chain.network === 'testnet');
}

/**
 * Check if chain ID is supported
 *
 * @param chainId Chain ID to check
 * @returns True if supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in CHAINS_BY_ID;
}

/**
 * Get chain's native currency symbol
 *
 * @param chainId Chain ID
 * @returns Currency symbol
 */
export function getNativeCurrencySymbol(chainId: number): string {
  const chain = CHAINS_BY_ID[chainId];
  return chain?.nativeCurrency.symbol ?? 'ETH';
}

/**
 * Get block explorer URL for a transaction
 *
 * @param chainId Chain ID
 * @param txHash Transaction hash
 * @returns Explorer URL
 */
export function getExplorerTxUrl(chainId: number, txHash: string): string | null {
  const chain = CHAINS_BY_ID[chainId];
  if (!chain || chain.blockExplorers.length === 0) {
    return null;
  }
  return `${chain.blockExplorers[0].url}/tx/${txHash}`;
}

/**
 * Get block explorer URL for an address
 *
 * @param chainId Chain ID
 * @param address Address
 * @returns Explorer URL
 */
export function getExplorerAddressUrl(chainId: number, address: string): string | null {
  const chain = CHAINS_BY_ID[chainId];
  if (!chain || chain.blockExplorers.length === 0) {
    return null;
  }
  return `${chain.blockExplorers[0].url}/address/${address}`;
}
