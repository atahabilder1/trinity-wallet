# Trinity Wallet Documentation

> Privacy-First Multi-Platform Blockchain Wallet

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Getting Started](#getting-started)
4. [Core Modules](#core-modules)
5. [Privacy Features](#privacy-features)
6. [Security Model](#security-model)
7. [API Reference](#api-reference)
8. [Platform Guides](#platform-guides)
9. [Development Guide](#development-guide)
10. [Deployment](#deployment)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)
13. [Contributing](#contributing)
14. [License](#license)

---

## Introduction

Trinity Wallet is a privacy-first, multi-platform blockchain wallet designed for the EVM ecosystem. It provides a unified experience across web browsers, browser extensions, mobile devices, and desktop applications while prioritizing user privacy and security.

### Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Platform** | Web, Browser Extension, Mobile (iOS/Android), Desktop (macOS/Windows/Linux) |
| **Privacy-First** | Stealth addresses, RPC rotation, Railgun ZK transactions |
| **Multi-Chain** | Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Avalanche |
| **HD Wallet** | BIP-39 mnemonic with BIP-44 derivation paths |
| **Secure Storage** | AES-256-GCM encryption with PBKDF2 key derivation |
| **Transaction Simulation** | Pre-execution analysis with risk assessment |
| **Social Recovery** | ZK-based recovery using Shamir Secret Sharing |
| **DApp Support** | EIP-1193 provider with WalletConnect compatibility |

### Comparison with Other Wallets

| Feature | Trinity | MetaMask | Rainbow | Rabby |
|---------|---------|----------|---------|-------|
| Stealth Addresses | Yes | No | No | No |
| RPC Rotation | Yes | No | No | No |
| ZK Transactions | Yes | No | No | No |
| Transaction Simulation | Yes | No | Yes | Yes |
| Social Recovery | Yes (ZK) | No | No | No |
| Open Source | Yes | Partial | Yes | Yes |
| Zero Telemetry | Yes | No | No | No |

---

## Architecture Overview

### Monorepo Structure

```
trinity-wallet/
├── packages/
│   ├── core/           # Shared wallet logic (TypeScript)
│   ├── web/            # Web application (React + Vite)
│   ├── extension/      # Browser extension (Manifest V3)
│   ├── mobile/         # Mobile app (React Native + Expo)
│   └── desktop/        # Desktop app (Electron)
├── docs/               # Documentation
├── turbo.json          # Turborepo configuration
├── pnpm-workspace.yaml # pnpm workspace configuration
└── package.json        # Root package.json
```

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      Applications                            │
├───────────┬───────────┬───────────┬───────────┬─────────────┤
│    Web    │ Extension │  Mobile   │  Desktop  │   Shared    │
│   React   │ Manifest  │   React   │  Electron │    Core     │
│   Vite    │    V3     │  Native   │   Vite    │ TypeScript  │
│ Tailwind  │  Chrome   │   Expo    │  React    │   ethers    │
└───────────┴───────────┴───────────┴───────────┴─────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     @trinity/core                            │
├─────────────────────────────────────────────────────────────┤
│  Crypto  │  Wallet  │  Storage  │ Networks │ Transactions  │
│  AES-256 │   HD     │   Vault   │  Multi   │   Builder     │
│  PBKDF2  │  BIP-39  │ Encrypted │  Chain   │   Signer      │
├──────────┴──────────┴───────────┴──────────┴───────────────┤
│  Tokens  │ Privacy  │ Simulation│ Portfolio│   Recovery    │
│  ERC-20  │ Stealth  │   Risk    │  Prices  │   Shamir      │
│  ERC-721 │   RPC    │  Decoder  │ Analytics│     ZK        │
├──────────┴──────────┴───────────┴──────────┴───────────────┤
│                        Railgun                               │
│              Private ZK Transactions                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Blockchain Networks                       │
│  Ethereum │ Polygon │ BSC │ Arbitrum │ Optimism │ Base     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action
    │
    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│     UI      │────▶│   Store     │────▶│    Core     │
│  Component  │     │  (Zustand)  │     │   Module    │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
            │   Vault     │           │  Provider   │           │  Privacy    │
            │  (Storage)  │           │  (Network)  │           │   Layer     │
            └─────────────┘           └─────────────┘           └─────────────┘
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
            │  Encrypted  │           │     RPC     │           │   Stealth   │
            │   Storage   │           │   Endpoint  │           │  Addresses  │
            └─────────────┘           └─────────────┘           └─────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **pnpm**: v8.0.0 or higher
- **Git**: Latest version

### Installation

```bash
# Clone the repository
git clone https://github.com/user/trinity-wallet.git
cd trinity-wallet

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development server (web)
pnpm dev
```

### Quick Start by Platform

#### Web Application
```bash
cd packages/web
pnpm dev
# Open http://localhost:5173
```

#### Browser Extension
```bash
cd packages/extension
pnpm dev
# Load unpacked extension from packages/extension/dist
```

#### Mobile Application
```bash
cd packages/mobile
pnpm start
# Scan QR code with Expo Go app
```

#### Desktop Application
```bash
cd packages/desktop
pnpm dev
# Electron app will launch automatically
```

---

## Core Modules

### 1. Cryptography (`@trinity/core/crypto`)

Provides cryptographic primitives for secure key management and data encryption.

#### Encryption

```typescript
import { encrypt, decrypt } from '@trinity/core';

// Encrypt sensitive data
const encrypted = await encrypt('my secret data', 'password123');
// Returns: { ciphertext, iv, salt, version }

// Decrypt data
const decrypted = await decrypt(encrypted, 'password123');
// Returns: Uint8Array
```

#### Hashing

```typescript
import { hashSha256, hashKeccak256, sha256Hex } from '@trinity/core';

// SHA-256 hash (returns Uint8Array)
const hash = hashSha256('data to hash');

// SHA-256 hash (returns hex string)
const hashHex = sha256Hex('data to hash');

// Keccak-256 for Ethereum addresses
const ethHash = hashKeccak256('data');
```

#### Key Derivation

```typescript
import { deriveKey } from '@trinity/core';

// PBKDF2 key derivation
const key = await deriveKey('password', salt, {
  iterations: 600000,
  keyLength: 32,
});
```

### 2. Wallet (`@trinity/core/wallet`)

HD wallet implementation with BIP-39/BIP-44 support.

#### Creating a Wallet

```typescript
import { HDWallet, generateMnemonic, validateMnemonic } from '@trinity/core';

// Generate new mnemonic
const mnemonic = generateMnemonic(12); // or 24 words

// Validate mnemonic
const isValid = validateMnemonic(mnemonic);

// Create HD wallet
const wallet = new HDWallet(mnemonic);

// Derive accounts
const account0 = wallet.deriveAccount(0);
const account1 = wallet.deriveAccount(1);

console.log(account0.address);    // 0x...
console.log(account0.publicKey);  // Compressed public key
```

#### Account Management

```typescript
import { Keyring } from '@trinity/core';

// Create keyring for transaction signing
const keyring = new Keyring();

// Add account from private key
keyring.addAccount(privateKey);

// Sign message
const signature = keyring.signMessage(address, 'Hello World');

// Sign transaction
const signedTx = keyring.signTransaction(address, txHash, chainId);
```

### 3. Storage (`@trinity/core/storage`)

Encrypted storage with vault management.

#### Vault Operations

```typescript
import { Vault } from '@trinity/core';

// Create vault
const vault = new Vault();

// Initialize with password
await vault.create('strong-password-123');

// Unlock vault
await vault.unlock('strong-password-123');

// Store mnemonic
await vault.storeMnemonic(mnemonic);

// Retrieve mnemonic
const mnemonic = await vault.getMnemonic();

// Lock vault
vault.lock();

// Change password
await vault.changePassword('old-password', 'new-password');
```

### 4. Networks (`@trinity/core/networks`)

Multi-chain network management with provider handling.

#### Supported Networks

| Chain | Chain ID | Native Token | L2 |
|-------|----------|--------------|-----|
| Ethereum | 1 | ETH | No |
| Polygon | 137 | MATIC | Yes |
| BSC | 56 | BNB | No |
| Arbitrum | 42161 | ETH | Yes |
| Optimism | 10 | ETH | Yes |
| Base | 8453 | ETH | Yes |
| Avalanche | 43114 | AVAX | No |
| zkSync Era | 324 | ETH | Yes |
| Linea | 59144 | ETH | Yes |

#### Network Configuration

```typescript
import {
  getChainById,
  SUPPORTED_CHAINS,
  ProviderManager
} from '@trinity/core';

// Get chain config
const ethereum = getChainById(1);
console.log(ethereum.name);        // 'Ethereum'
console.log(ethereum.rpcUrls);     // ['https://...', ...]

// Create provider manager
const providers = new ProviderManager();

// Connect to chain
await providers.switchChain(137); // Polygon

// Get current provider
const provider = providers.getCurrentProvider();
const balance = await provider.getBalance('0x...');
```

### 5. Transactions (`@trinity/core/transactions`)

Transaction building, signing, and broadcasting.

#### Building Transactions

```typescript
import { TransactionBuilder } from '@trinity/core';

const builder = new TransactionBuilder(provider);

// Build EIP-1559 transaction
const tx = await builder.buildEIP1559Transaction({
  to: '0x...',
  value: '1.5',  // in ETH
  data: '0x',
});

// Estimate gas
const gasLimit = await builder.estimateGas(tx);

// Get fee estimation
const fees = await provider.getFeeEstimate();
console.log(fees.standard.maxFeePerGas);
```

#### Signing and Broadcasting

```typescript
import { TransactionSigner } from '@trinity/core';

const signer = new TransactionSigner(provider, keyring);

// Sign transaction
const signedTx = signer.sign(tx);

// Broadcast transaction
const result = await signer.signAndSend(tx);
console.log(result.hash);

// Wait for confirmation
const receipt = await result.wait(1);
```

### 6. Tokens (`@trinity/core/tokens`)

ERC-20 and ERC-721 token management.

#### ERC-20 Operations

```typescript
import { ERC20Manager, BalanceManager } from '@trinity/core';

const erc20 = new ERC20Manager(provider);

// Get token info
const info = await erc20.getTokenInfo('0x...tokenAddress');
console.log(info.name, info.symbol, info.decimals);

// Get balance
const balance = await erc20.getBalance('0x...tokenAddress', '0x...ownerAddress');

// Build transfer transaction
const tx = await erc20.buildTransfer(
  '0x...tokenAddress',
  '0x...toAddress',
  '100.5'  // amount in token units
);

// Build approval transaction
const approveTx = await erc20.buildApprove(
  '0x...tokenAddress',
  '0x...spenderAddress',
  '1000'
);
```

#### Balance Tracking

```typescript
const balanceManager = new BalanceManager(provider);

// Add tokens to track
await balanceManager.addToken('0x...', 'USDC', 6);

// Get all balances
const balances = await balanceManager.getBalances('0x...ownerAddress');
```

---

## Privacy Features

### 1. Stealth Addresses (EIP-5564)

Generate one-time addresses that cannot be linked to your main wallet.

```typescript
import { StealthAddressManager } from '@trinity/core';

const stealth = new StealthAddressManager();

// Generate stealth meta-address
const metaAddress = stealth.generateMetaAddress(viewingKey, spendingKey);

// Generate stealth address for receiving
const { stealthAddress, ephemeralPublicKey } = stealth.generateStealthAddress(
  recipientMetaAddress
);

// Check if you can receive at a stealth address
const canReceive = stealth.checkStealthAddress(
  stealthAddress,
  ephemeralPublicKey,
  viewingKey
);

// Derive spending key for stealth address
const spendingKey = stealth.computeStealthKey(
  stealthAddress,
  ephemeralPublicKey,
  viewingPrivateKey,
  spendingPrivateKey
);
```

### 2. RPC Privacy

Automatic RPC endpoint rotation to prevent tracking.

```typescript
import { RPCPrivacyManager, AddressRotationManager } from '@trinity/core';

// RPC rotation
const rpcManager = new RPCPrivacyManager();

// Rotate to next RPC endpoint
await rpcManager.rotate();

// Get current endpoint
const currentRpc = rpcManager.getCurrentEndpoint();

// Address rotation
const addressRotation = new AddressRotationManager({
  autoRotateReceive: true,
  maxUsesPerAddress: 1,
  uniqueAddressPerDApp: true,
});

// Get fresh receive address
const receiveAddress = addressRotation.getNextReceiveAddress(wallet);
```

### 3. Railgun Integration (ZK Transactions)

Send transactions with complete privacy using zero-knowledge proofs.

```typescript
import {
  RailgunClient,
  RailgunWalletManager,
  ShieldManager
} from '@trinity/core';

// Initialize Railgun client
const railgun = new RailgunClient('ethereum');
await railgun.initialize();

// Create Railgun wallet
const walletManager = new RailgunWalletManager(railgun);
const railgunWallet = await walletManager.createWallet(mnemonic);

console.log(railgunWallet.railgunAddress); // 0zk...

// Shield tokens (public -> private)
const shieldManager = new ShieldManager(railgun, walletManager);
const shieldResult = await shieldManager.shield(walletId, {
  tokenAddress: '0x...USDC',
  amount: '1000000000', // 1000 USDC (6 decimals)
}, signer);

// Get shielded balance
const shieldedBalance = await walletManager.getBalance(walletId, 'USDC');

// Private transfer
const txBuilder = new RailgunTransactionBuilder(railgun, walletManager);
const proof = await txBuilder.createPrivateTransfer(walletId, {
  tokenAddress: '0x...USDC',
  amount: '500000000',
  recipientRailgunAddress: '0zk...',
});

// Unshield tokens (private -> public)
const unshieldResult = await shieldManager.unshield(walletId, {
  tokenAddress: '0x...USDC',
  amount: '250000000',
  recipientAddress: '0x...',
}, signer);
```

---

## Security Model

### Threat Model

Trinity Wallet is designed to protect against:

1. **Key Extraction**: Private keys never leave the secure enclave
2. **Memory Attacks**: Sensitive data is zeroed after use
3. **Network Surveillance**: RPC rotation prevents tracking
4. **Phishing**: Transaction simulation and risk warnings
5. **Supply Chain**: Minimal dependencies, audited libraries

### Encryption Specifications

| Component | Algorithm | Key Size | Notes |
|-----------|-----------|----------|-------|
| Vault Encryption | AES-256-GCM | 256-bit | With authentication tag |
| Key Derivation | PBKDF2-SHA256 | N/A | 600,000 iterations |
| Hashing | SHA-256, Keccak-256 | 256-bit | @noble/hashes |
| Signing | secp256k1 ECDSA | 256-bit | @noble/curves |

### Key Storage

```
┌─────────────────────────────────────────────────────────┐
│                    Encrypted Vault                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │              Master Key (derived)                │   │
│  │         PBKDF2(password, salt, 600000)          │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│                          ▼                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │           AES-256-GCM Encryption                 │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│                          ▼                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Encrypted Mnemonic                  │   │
│  │              Encrypted Accounts                  │   │
│  │              Encrypted Settings                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Security Best Practices

1. **Never expose private keys** in logs, errors, or analytics
2. **Use hardware wallets** for large holdings
3. **Enable biometric authentication** on mobile
4. **Regular security audits** of dependencies
5. **Minimal permissions** for browser extension

---

## API Reference

### Transaction Simulation

```typescript
import { TransactionSimulator, createSimulator } from '@trinity/core';

// Create simulator
const simulator = createSimulator('https://eth-mainnet.g.alchemy.com/v2/...');

// Simulate transaction
const result = await simulator.simulate({
  from: '0x...',
  to: '0x...contract',
  value: '0',
  data: '0x...',
  chainId: 1,
});

console.log(result.success);        // true/false
console.log(result.gasUsed);        // Estimated gas
console.log(result.riskLevel);      // 'low' | 'medium' | 'high' | 'critical'
console.log(result.warnings);       // Risk warnings
console.log(result.balanceChanges); // Token balance changes
console.log(result.approvalChanges);// Approval changes
```

### Portfolio Tracking

```typescript
import { PortfolioTracker, PriceService } from '@trinity/core';

// Create price service
const priceService = new PriceService({
  sources: ['coingecko', 'defillama'],
  cacheDuration: 60000,
});

// Create portfolio tracker
const portfolio = new PortfolioTracker(priceService);

// Add address to track
portfolio.addAddress('0x...', [1, 137, 42161]); // ETH, Polygon, Arbitrum

// Get portfolio summary
const summary = await portfolio.getPortfolioSummary('0x...');
console.log(summary.totalValueUsd);
console.log(summary.chains);
console.log(summary.topHoldings);

// Get historical data
const history = await portfolio.getHistory('0x...', '30d');
```

### Social Recovery

```typescript
import {
  GuardianManager,
  RecoveryManager,
  createZKRecoveryProof
} from '@trinity/core';

// Setup recovery with guardians
const guardianManager = new GuardianManager();
const config = await guardianManager.initializeRecovery(
  mnemonic,
  3,  // threshold (3 of 5)
  [
    { alias: 'Alice', publicKey: '0x...' },
    { alias: 'Bob', publicKey: '0x...' },
    { alias: 'Charlie', publicKey: '0x...' },
    { alias: 'David', publicKey: '0x...' },
    { alias: 'Eve', publicKey: '0x...' },
  ]
);

// Initiate recovery
const recoveryManager = new RecoveryManager();
const request = await recoveryManager.initiateRecovery(
  walletAddress,
  3,  // threshold
  requesterPrivateKey
);

// Submit guardian shares (done by each guardian)
await recoveryManager.submitShare(
  request.id,
  guardianId,
  encryptedShare,
  proof
);

// Complete recovery when threshold is met
const result = await recoveryManager.completeRecovery(request.id);
if (result.success) {
  const recoveredMnemonic = result.mnemonic;
}
```

---

## Platform Guides

### Web Application

The web application provides full wallet functionality in the browser.

**Features:**
- Create/import wallets
- Send/receive tokens
- View transaction history
- Connect to DApps
- Portfolio dashboard

**Technologies:**
- React 18
- Vite
- Tailwind CSS
- Zustand (state management)
- React Router

### Browser Extension

Manifest V3 extension for Chrome, Firefox, and Brave.

**Features:**
- Inject EIP-1193 provider
- DApp connection approval
- Transaction signing
- Network switching
- Account management

**Structure:**
```
extension/
├── src/
│   ├── background/     # Service worker
│   ├── content/        # Content script
│   ├── inpage/         # Injected provider
│   └── popup/          # Extension popup UI
├── public/
│   └── manifest.json
└── dist/               # Built extension
```

**Loading the Extension:**
1. Build: `pnpm build`
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `packages/extension/dist`

### Mobile Application

React Native app with Expo for iOS and Android.

**Features:**
- Biometric authentication (Face ID, Touch ID, Fingerprint)
- QR code scanning
- Push notifications
- Secure enclave storage
- WalletConnect support

**Running on Device:**
```bash
# Start Expo
pnpm start

# iOS Simulator
pnpm ios

# Android Emulator
pnpm android
```

### Desktop Application

Electron app for macOS, Windows, and Linux.

**Features:**
- Native system integration
- Hardware wallet support
- Auto-updates
- System tray
- Keyboard shortcuts

**Building Installers:**
```bash
# macOS
pnpm package:mac

# Windows
pnpm package:win

# Linux
pnpm package:linux
```

---

## Development Guide

### Setting Up Development Environment

```bash
# Clone and install
git clone https://github.com/user/trinity-wallet.git
cd trinity-wallet
pnpm install

# Start development (all packages)
pnpm dev

# Or start specific package
pnpm --filter @trinity/web dev
pnpm --filter @trinity/extension dev
pnpm --filter @trinity/mobile start
pnpm --filter @trinity/desktop dev
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (2 spaces, single quotes)
- **Linting**: ESLint with TypeScript rules
- **Commits**: Conventional commits

### Adding a New Feature

1. **Create branch**: `git checkout -b feature/my-feature`
2. **Implement in core**: Add to `packages/core/src/`
3. **Export from index**: Update `packages/core/src/index.ts`
4. **Add UI components**: Update platform packages
5. **Write tests**: Add to `__tests__/` directories
6. **Update docs**: Document the feature
7. **Submit PR**: Follow PR template

### Adding a New Chain

1. Add chain config to `packages/core/src/networks/chains.ts`:

```typescript
export const NEW_CHAIN: ChainConfig = {
  chainId: 12345,
  name: 'New Chain',
  shortName: 'NEW',
  network: 'mainnet',
  nativeCurrency: {
    name: 'New Token',
    symbol: 'NEW',
    decimals: 18,
  },
  rpcUrls: [
    'https://rpc.newchain.io',
    'https://rpc2.newchain.io',
  ],
  blockExplorers: [
    { name: 'NewScan', url: 'https://scan.newchain.io' },
  ],
  isEvm: true,
  supportsEip1559: true,
};
```

2. Add to `SUPPORTED_CHAINS` array
3. Update UI chain selectors

---

## Deployment

### Web Application

```bash
# Build for production
pnpm --filter @trinity/web build

# Output in packages/web/dist/
# Deploy to any static hosting (Vercel, Netlify, etc.)
```

### Browser Extension

```bash
# Build extension
pnpm --filter @trinity/extension build

# Create ZIP for store submission
cd packages/extension
zip -r trinity-extension.zip dist/
```

### Mobile Application

```bash
# Build for iOS
cd packages/mobile
eas build --platform ios

# Build for Android
eas build --platform android
```

### Desktop Application

```bash
# Build all platforms
cd packages/desktop
pnpm package

# Platform-specific
pnpm package:mac   # DMG and ZIP
pnpm package:win   # NSIS installer
pnpm package:linux # AppImage and DEB
```

---

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @trinity/core test

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch
```

### Test Structure

```
packages/core/
├── src/
│   └── crypto/
│       ├── encryption.ts
│       └── __tests__/
│           └── encryption.test.ts
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../encryption';

describe('Encryption', () => {
  it('should encrypt and decrypt data', async () => {
    const plaintext = 'secret data';
    const password = 'password123';

    const encrypted = await encrypt(plaintext, password);
    const decrypted = await decrypt(encrypted, password);

    expect(new TextDecoder().decode(decrypted)).toBe(plaintext);
  });
});
```

---

## Troubleshooting

### Common Issues

#### "Module not found" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules packages/*/node_modules
pnpm install
```

#### TypeScript errors after changes
```bash
# Rebuild core package
pnpm --filter @trinity/core build
```

#### Extension not loading
1. Check manifest.json is valid
2. Ensure all files are in dist/
3. Check browser console for errors

#### Mobile app not connecting
1. Ensure device and computer on same network
2. Check Expo server is running
3. Try clearing Expo cache: `expo start -c`

### Debug Mode

```typescript
// Enable debug logging
import { setDebugMode } from '@trinity/core';
setDebugMode(true);
```

### Getting Help

- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Ask questions and share ideas
- **Discord**: Real-time community support

---

## Contributing

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read our Code of Conduct before contributing.

### How to Contribute

1. **Fork** the repository
2. **Clone** your fork
3. **Create** a feature branch
4. **Commit** your changes
5. **Push** to your fork
6. **Submit** a pull request

### Pull Request Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation
- Keep PRs focused and small
- Write clear commit messages

### Reporting Security Issues

Please report security vulnerabilities privately to security@trinity-wallet.dev. Do not create public issues for security concerns.

---

## License

Trinity Wallet is open source software licensed under the MIT License.

```
MIT License

Copyright (c) 2025 Trinity Wallet Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Acknowledgments

Trinity Wallet is built on the shoulders of giants:

- [ethers.js](https://ethers.org/) - Ethereum library
- [@noble/hashes](https://github.com/paulmillr/noble-hashes) - Cryptographic hashing
- [@noble/curves](https://github.com/paulmillr/noble-curves) - Elliptic curves
- [@scure/bip39](https://github.com/paulmillr/scure-bip39) - BIP-39 mnemonic
- [Railgun](https://railgun.org/) - ZK privacy protocol
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

<p align="center">
  <strong>Trinity Wallet</strong><br>
  Privacy-First Blockchain Wallet<br>
  <a href="https://trinity-wallet.dev">Website</a> |
  <a href="https://github.com/user/trinity-wallet">GitHub</a> |
  <a href="https://docs.trinity-wallet.dev">Docs</a>
</p>
