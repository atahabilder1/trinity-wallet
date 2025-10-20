/**
 * Inpage script - Injected into web pages
 * Provides window.ethereum for DApp interaction
 */

import { TrinityProvider } from './provider';

// Create and inject the provider
const provider = new TrinityProvider();

// Announce provider (EIP-6963)
const announceProvider = () => {
  const info = {
    uuid: 'trinity-wallet-uuid',
    name: 'Trinity Wallet',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,10 90,90 10,90" fill="%230ea5e9"/></svg>',
    rdns: 'dev.trinity-wallet',
  };

  window.dispatchEvent(
    new CustomEvent('eip6963:announceProvider', {
      detail: Object.freeze({ info, provider }),
    })
  );
};

// Listen for provider requests (EIP-6963)
window.addEventListener('eip6963:requestProvider', () => {
  announceProvider();
});

// Inject as window.ethereum
const injectProvider = () => {
  // If ethereum already exists, don't overwrite (let user choose)
  if (window.ethereum && !window.ethereum.isTrinity) {
    // Add Trinity to providers array
    if (!window.ethereum.providers) {
      window.ethereum.providers = [];
    }
    window.ethereum.providers.push(provider);
  } else {
    // Set as default
    Object.defineProperty(window, 'ethereum', {
      value: provider,
      writable: false,
      configurable: true,
    });
  }

  // Also expose as window.trinity
  Object.defineProperty(window, 'trinity', {
    value: provider,
    writable: false,
    configurable: true,
  });
};

// Inject immediately
injectProvider();

// Announce on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', announceProvider);
} else {
  announceProvider();
}

// Log injection
console.log('🔺 Trinity Wallet injected');
