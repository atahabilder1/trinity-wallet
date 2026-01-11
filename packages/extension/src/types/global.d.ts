import type { TrinityProvider } from '../inpage/provider';

declare global {
  interface Window {
    ethereum?: TrinityProvider & {
      isTrinity?: boolean;
      providers?: TrinityProvider[];
    };
    trinity?: TrinityProvider;
  }
}

export {};
