# Trinity Wallet

<div align="center">

<img src="docs/assets/logo.png" alt="Trinity Wallet" width="120" />

**The Privacy-First Blockchain Wallet**

*Browser Extension • Mobile App • Desktop App*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Website](https://trinity-wallet.dev) • [Documentation](https://docs.trinity-wallet.dev) • [Discord](https://discord.gg/trinity)

</div>

---

## Table of Contents

- [Why Trinity?](#why-trinity)
- [Features](#features)
- [Comparison](#comparison)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Architecture](#architecture)
- [Core Modules](#core-modules)
- [Privacy Features](#privacy-features-deep-dive)
- [Security](#security)
- [Supported Networks](#supported-networks)
- [API Reference](#api-reference)
- [Development](#development)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Why Trinity?

Every blockchain transaction you make is public. Your wallet address can be linked to your identity, your holdings tracked, and your financial life exposed. **Existing wallets don't protect you.**

Trinity Wallet is different. Built from the ground up with privacy as a core principle—not an afterthought.

### The Problem with Current Wallets

| Wallet | Issues |
|--------|--------|
| MetaMask | Routes through Infura (centralized), no privacy features, ConsenSys owned |
| Trust Wallet | Binance owned, closed source, collects data |
| Phantom | VC-backed, no privacy features, closed source |
| Coinbase Wallet | Coinbase owned, recovery tied to centralized service |

### Trinity's Solution

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRINITY PRIVACY STACK                         │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Stealth Addresses    → One-time receiving addresses   │
│  Layer 2: Address Rotation     → Fresh address per transaction  │
│  Layer 3: RPC Privacy          → Rotate providers, hide IP      │
│  Layer 4: MEV Protection       → Flashbots for front-run shield │
│  Layer 5: ZK Transactions      → Private transfers via Railgun  │
│  Layer 6: Zero Telemetry       → No data collection, ever       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

### Core Wallet
- **HD Wallet** - BIP-39 mnemonic with BIP-44 derivation paths
- **Multi-Account** - Unlimited derived accounts from single seed
- **Multi-Chain** - 10+ EVM networks supported out of the box
- **Token Management** - ERC-20 tokens with balance tracking
- **Transaction Builder** - EIP-1559 gas estimation and signing
- **Encrypted Storage** - AES-256-GCM vault encryption

### Privacy Features
- **Stealth Addresses (EIP-5564)** - Generate one-time addresses for receiving
- **Address Rotation** - Automatic fresh addresses for each transaction
- **RPC Privacy Layer** - Rotate between multiple RPC providers
- **Flashbots Protect** - MEV-protected transactions on Ethereum
- **ZK Transactions** - Private transfers via Railgun integration
- **Hidden Balance Mode** - One-click hide all balances

### Security
- **ZK Social Recovery** - Recover wallet with guardians using Shamir secret sharing
- **Transaction Simulation** - Preview state changes before signing
- **Risk Assessment** - Automatic detection of risky approvals and transfers
- **Biometric Auth** - Face ID / Fingerprint on mobile

### DApp Integration
- **EIP-1193 Provider** - Full Web3 compatibility (`window.ethereum`)
- **WalletConnect v2** - Connect to any WalletConnect-enabled DApp
- **Message Signing** - Support for `personal_sign` and EIP-712 typed data
- **Chain Switching** - Seamless network changes

### Portfolio & Analytics
- **Portfolio Dashboard** - Track holdings across all chains
- **Price Tracking** - Real-time prices from CoinGecko/DefiLlama
- **Performance Analytics** - Returns, volatility, diversification score
- **Transaction History** - Labeled history with USD values

---

## Comparison

| Feature | Trinity | MetaMask | Trust | Phantom | Coinbase |
|---------|:-------:|:--------:|:-----:|:-------:|:--------:|
| Stealth Addresses | ✅ | ❌ | ❌ | ❌ | ❌ |
| ZK Transactions | ✅ | ❌ | ❌ | ❌ | ❌ |
| ZK Social Recovery | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transaction Simulation | ✅ | ❌ | ❌ | ❌ | ✅ |
| RPC Rotation | ✅ | ❌ | ❌ | ❌ | ❌ |
| Zero Telemetry | ✅ | ❌ | ❌ | ❌ | ❌ |
| Desktop App | ✅ | ❌ | ❌ | ❌ | ❌ |
| Mobile App | ✅ | ✅ | ✅ | ✅ | ✅ |
| Browser Extension | ✅ | ✅ | ✅ | ✅ | ✅ |
| Open Source | ✅ | ✅ | ❌ | ❌ | Partial |
| No Corporate Owner | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/AnikTahabilder/trinity-wallet.git
cd trinity-wallet

# Install dependencies
pnpm install

# Start development
pnpm dev:web        # Web test UI
pnpm dev:extension  # Browser extension
pnpm dev:mobile     # Mobile app (Expo)
pnpm dev:desktop    # Desktop app (Electron)
```

---

## Installation

### Browser Extension

```bash
# Build the extension
pnpm build:extension

# Load in Chrome:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select packages/extension/dist
```

### Mobile App

```bash
# Start Expo development server
cd packages/mobile
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android
```

### Desktop App

```bash
# Development
pnpm dev:desktop

# Build for production
pnpm build:desktop

# Package for distribution
cd packages/desktop
pnpm package:mac    # macOS
pnpm package:win    # Windows
pnpm package:linux  # Linux
```

---

## Architecture

Trinity uses a monorepo architecture with a shared core library:

```
trinity-wallet/
├── packages/
│   ├── core/              # Shared wallet logic (TypeScript)
│   │   ├── crypto/        # AES-256-GCM encryption, hashing
│   │   ├── wallet/        # HD wallet, accounts, keyring
│   │   ├── storage/       # Encrypted vault storage
│   │   ├── networks/      # Chain configs, providers
│   │   ├── transactions/  # TX builder, gas estimation, signing
│   │   ├── tokens/        # ERC-20 support, balances
│   │   ├── privacy/       # Stealth addresses, RPC rotation
│   │   ├── simulation/    # TX simulation, risk assessment
│   │   ├── portfolio/     # Price tracking, analytics
│   │   ├── recovery/      # ZK social recovery, Shamir
│   │   └── railgun/       # ZK transactions integration
│   │
│   ├── web/               # Test web interface (React + Vite)
│   ├── extension/         # Browser extension (Manifest V3)
│   ├── mobile/            # React Native app (Expo)
│   └── desktop/           # Electron app
│
├── turbo.json             # Turborepo configuration
├── pnpm-workspace.yaml    # pnpm workspace config
└── tsconfig.base.json     # Shared TypeScript config
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript 5.3 |
| Blockchain | ethers.js v6 |
| Cryptography | @noble/curves, @noble/hashes, @scure/bip39 |
| State Management | Zustand |
| Web Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Mobile | React Native + Expo |
| Desktop | Electron |
| Monorepo | Turborepo + pnpm |

---

## Core Modules

### Crypto (`@trinity/core/crypto`)

AES-256-GCM encryption with PBKDF2 key derivation.

```typescript
import { encrypt, decrypt } from '@trinity/core';

// Encrypt sensitive data
const encrypted = await encrypt('my secret data', 'password123');
// { ciphertext: '...', iv: '...', salt: '...' }

// Decrypt
const decrypted = await decrypt(encrypted, 'password123');
// 'my secret data'
```

### HD Wallet (`@trinity/core/wallet`)

BIP-39 mnemonic generation with BIP-44 derivation.

```typescript
import { HDWallet } from '@trinity/core';

// Generate new wallet
const { mnemonic, wallet } = HDWallet.generate(12);
// mnemonic: "abandon abandon abandon..."

// Import existing wallet
const wallet = HDWallet.fromMnemonic(mnemonic);

// Derive accounts
const account0 = wallet.deriveAccount(0);
// { address: '0x...', privateKey: '...', publicKey: '...' }

const account1 = wallet.deriveAccount(1);
```

### Vault (`@trinity/core/storage`)

Secure encrypted storage for seed phrases.

```typescript
import { Vault } from '@trinity/core';

const vault = new Vault(storage);

// Initialize with password
await vault.initialize('password123', mnemonic);

// Unlock
const mnemonic = await vault.unlock('password123');

// Lock
vault.lock();
```

### Networks (`@trinity/core/networks`)

Multi-chain configuration and provider management.

```typescript
import { CHAINS, CHAINS_BY_ID, createProvider } from '@trinity/core';

// Get chain config
const ethereum = CHAINS_BY_ID[1];
// { id: 1, name: 'Ethereum', rpcUrls: [...], ... }

// Create provider
const provider = createProvider(1);
```

### Privacy (`@trinity/core/privacy`)

Stealth addresses and RPC rotation.

```typescript
import {
  generateStealthMetaAddress,
  generateStealthAddress,
  createRPCRotator
} from '@trinity/core';

// Generate stealth meta-address (public)
const metaAddress = generateStealthMetaAddress(spendingKey, viewingKey);

// Generate one-time stealth address
const { stealthAddress, ephemeralPublicKey } = generateStealthAddress(metaAddress);

// RPC rotation for privacy
const rotator = createRPCRotator(chainId);
const provider = rotator.getNextProvider();
```

### Transaction Simulation (`@trinity/core/simulation`)

Preview transactions before signing.

```typescript
import { createSimulator } from '@trinity/core';

const simulator = createSimulator(rpcUrl);

const result = await simulator.simulate({
  from: '0x...',
  to: '0x...',
  value: '1000000000000000000',
  data: '0x...',
  chainId: 1,
});

// result.balanceChanges - what will change
// result.tokenTransfers - token movements
// result.approvalChanges - approval changes
// result.riskLevel - 'low' | 'medium' | 'high' | 'critical'
// result.warnings - array of risk warnings
```

### ZK Social Recovery (`@trinity/core/recovery`)

Recover wallet using guardians with privacy preservation.

```typescript
import { GuardianManager, RecoveryManager, splitSecret } from '@trinity/core';

// Split mnemonic into shares
const shares = splitSecret(mnemonic, 3, 5); // 3-of-5 threshold

// Initialize recovery
const guardianManager = createGuardianManager();
await guardianManager.initializeRecovery(mnemonic, 3, guardians);

// Recover with shares
const recoveryManager = createRecoveryManager();
const result = await recoveryManager.completeRecovery(requestId, guardians, key);
```

### Railgun (`@trinity/core/railgun`)

Private ZK transactions.

```typescript
import { createRailgunClient, createRailgunWalletManager } from '@trinity/core';

// Initialize client
const client = createRailgunClient({
  networkName: 'Ethereum',
  chainId: 1,
  rpcUrl: '...',
});

// Create Railgun wallet
const walletManager = createRailgunWalletManager(client);
const wallet = await walletManager.createWallet(mnemonic);

// Shield tokens (public → private)
await shieldManager.shield(walletId, {
  tokenAddress: '0x...',
  amount: '1000000000000000000',
});

// Private transfer
await transactionBuilder.createPrivateTransfer(walletId, {
  tokenAddress: '0x...',
  amount: '1000000000000000000',
  recipientRailgunAddress: '0zk...',
});
```

---

## Privacy Features Deep Dive

### Stealth Addresses (EIP-5564)

Stealth addresses allow you to receive funds without revealing your main address. Each sender generates a unique one-time address that only you can spend from.

```
Sender                          Recipient
  │                                 │
  │ 1. Get recipient's meta-address │
  │◄────────────────────────────────│
  │                                 │
  │ 2. Generate ephemeral keypair   │
  │ 3. Compute stealth address      │
  │ 4. Send to stealth address      │
  │────────────────────────────────►│
  │                                 │
  │                    5. Scan for payments
  │                    6. Derive stealth key
  │                    7. Spend funds
```

### RPC Privacy Layer

Your RPC provider sees all your requests. Trinity rotates between multiple providers to prevent any single provider from building a complete profile.

```typescript
// Automatic rotation
const rotator = createRPCRotator(1, {
  providers: ['alchemy', 'infura', 'quicknode'],
  rotationStrategy: 'round-robin', // or 'random'
});
```

### Railgun ZK Transactions

Shield your tokens into a private pool, transfer privately, then unshield when needed.

```
Public Balance ──► Shield ──► Private Pool ──► Transfer ──► Unshield ──► Public Balance
     │                             │                              │
     │                    (Zero-Knowledge)                        │
     │                    Nobody can see:                         │
     │                    - Sender                                │
     │                    - Receiver                              │
     │                    - Amount                                │
```

---

## Security

### Encryption

| Data | Encryption |
|------|------------|
| Seed Phrase | AES-256-GCM + PBKDF2 (100k iterations) |
| Private Keys | Derived on-demand, never stored |
| Vault Password | Never stored, used for key derivation |
| Local Storage | Encrypted with user password |

### Key Derivation

```
Password ──► PBKDF2 (100k iterations) ──► Encryption Key
                      │
                      └── Salt (random 16 bytes)
```

### What We Do
- Seed phrase encrypted with AES-256-GCM
- Password never stored, used only for key derivation
- Private keys derived on-demand, cleared after use
- All network calls through privacy layer
- No telemetry, analytics, or tracking
- Open source for full auditability
- Secure enclave support on mobile (iOS Keychain, Android Keystore)

### What We Don't Do
- Store your seed phrase in plaintext
- Send any data to our servers (we have none)
- Track your transactions or balances
- Sell your data
- Partner with data brokers
- Include any analytics SDKs

### Responsible Disclosure

Found a security issue? Please email **security@trinity-wallet.dev** (do not open a public issue).

---

## Supported Networks

| Network | Chain ID | Native Token | Status |
|---------|----------|--------------|--------|
| Ethereum | 1 | ETH | ✅ Full Support |
| Polygon | 137 | MATIC | ✅ Full Support |
| BNB Chain | 56 | BNB | ✅ Full Support |
| Arbitrum | 42161 | ETH | ✅ Full Support |
| Optimism | 10 | ETH | ✅ Full Support |
| Base | 8453 | ETH | ✅ Full Support |
| Avalanche | 43114 | AVAX | ✅ Full Support |
| zkSync Era | 324 | ETH | ✅ Full Support |
| Linea | 59144 | ETH | ✅ Full Support |
| Sepolia | 11155111 | ETH | ✅ Testnet |

---

## API Reference

### Browser Extension

The extension injects `window.trinity` and `window.ethereum` (for compatibility).

```typescript
// Check if Trinity is installed
if (window.trinity) {
  console.log('Trinity Wallet detected!');
}

// Request accounts
const accounts = await window.ethereum.request({
  method: 'eth_requestAccounts',
});

// Send transaction
const txHash = await window.ethereum.request({
  method: 'eth_sendTransaction',
  params: [{
    from: accounts[0],
    to: '0x...',
    value: '0x...',
  }],
});

// Sign message
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: [message, accounts[0]],
});

// Switch chain
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x89' }], // Polygon
});
```

### Events

```typescript
// Account changed
window.ethereum.on('accountsChanged', (accounts) => {
  console.log('Active account:', accounts[0]);
});

// Chain changed
window.ethereum.on('chainChanged', (chainId) => {
  console.log('Chain ID:', chainId);
});

// Disconnect
window.ethereum.on('disconnect', () => {
  console.log('Wallet disconnected');
});
```

---

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+

### Setup

```bash
# Clone repository
git clone https://github.com/AnikTahabilder/trinity-wallet.git
cd trinity-wallet

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm dev:web` | Start web test UI |
| `pnpm dev:extension` | Start extension dev |
| `pnpm dev:mobile` | Start Expo dev server |
| `pnpm dev:desktop` | Start Electron dev |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm clean` | Clean build artifacts |

### Project Structure

```
packages/
├── core/           # Shared library - the brain
├── web/            # Web test UI
├── extension/      # Chrome/Firefox extension
├── mobile/         # React Native app
└── desktop/        # Electron app
```

---

## Roadmap

### Completed

- [x] **Phase 1-5: Core + Extension**
  - HD wallet implementation
  - Multi-chain support
  - Privacy layer (stealth addresses, RPC rotation)
  - Browser extension with DApp support
  - ERC-20 token management

- [x] **Phase 6: Advanced Features**
  - Transaction simulation
  - ZK social recovery
  - Railgun integration
  - Portfolio dashboard

- [x] **Phase 7: Mobile + Desktop**
  - React Native mobile app
  - Electron desktop app

### Future

- [ ] Hardware wallet support (Ledger, Trezor)
- [ ] WalletConnect v2 integration
- [ ] Built-in DEX aggregator
- [ ] NFT gallery
- [ ] Account abstraction (ERC-4337)
- [ ] Cross-chain bridging
- [ ] Multi-signature support
- [ ] Inheritance planning

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Conventional commits

---

## Philosophy

Trinity is built on these principles:

1. **Privacy is a right, not a feature** - Every design decision prioritizes user privacy
2. **Your keys, your coins** - Non-custodial, always
3. **No corporate masters** - Community-owned, no VC pressure to monetize your data
4. **Transparency** - Fully open source, auditable code
5. **Simplicity** - Privacy shouldn't require a PhD to use

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [ethers.js](https://github.com/ethers-io/ethers.js) - Ethereum library
- [noble-curves](https://github.com/paulmillr/noble-curves) - Cryptographic curves
- [scure-bip39](https://github.com/paulmillr/scure-bip39) - BIP-39 implementation
- [Railgun](https://railgun.org) - ZK transaction protocol
- [Flashbots](https://flashbots.net) - MEV protection

---

<div align="center">

**Built with privacy in mind**

*If you believe in financial privacy, star this repo and spread the word.*

[Website](https://trinity-wallet.dev) • [Twitter](https://twitter.com/TrinityWallet) • [Discord](https://discord.gg/trinity)

</div>
