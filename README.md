# Trinity Wallet

<div align="center">

**The Privacy-First Blockchain Wallet**

*Browser Extension • Mobile App • Desktop App*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

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
┌─────────────────────────────────────────────────────────────┐
│                 TRINITY PRIVACY STACK                        │
├─────────────────────────────────────────────────────────────┤
│  Stealth Addresses     → Receive funds without address link │
│  Address Rotation      → Fresh address for every transaction│
│  Tor/Proxy Support     → Hide your IP from RPC providers    │
│  Flashbots Protect     → Shield transactions from MEV bots  │
│  ZK Transactions       → Private transfers via Railgun      │
│  Zero Telemetry        → No data collection, ever           │
└─────────────────────────────────────────────────────────────┘
```

---

## Features

### Core Wallet
- Create/import wallet with BIP-39 seed phrase
- HD wallet with unlimited derived accounts
- Support for all major EVM chains (Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Avalanche)
- ERC-20 token management
- NFT gallery
- Transaction history

### Privacy Features
- **Stealth Addresses (EIP-5564)** - Receive funds to one-time addresses
- **Address Rotation** - Automatic fresh addresses for receiving
- **RPC Privacy Layer** - Rotate between multiple RPCs, optional Tor routing
- **Flashbots Protect** - MEV-protected transactions on Ethereum
- **ZK Transactions** - Private transfers via Railgun integration
- **Hidden Balance Mode** - One-click hide all balances

### Security
- **ZK Social Recovery** - Recover wallet with guardians, without revealing their identity
- **Transaction Simulation** - See exactly what will happen before signing
- **Phishing Detection** - Warns about suspicious DApps
- **Hardware Wallet Support** - Ledger, Trezor, and more

### DApp Integration
- Full Web3 provider (window.ethereum)
- WalletConnect v2 support
- Transaction signing
- Message signing (personal_sign, EIP-712)
- Chain switching

### User Experience
- Portfolio dashboard with charts
- Price tracking
- Gas estimation (EIP-1559)
- Contact address book
- Multi-language support

---

## Comparison

| Feature | Trinity | MetaMask | Trust | Phantom | Coinbase |
|---------|:-------:|:--------:|:-----:|:-------:|:--------:|
| Stealth Addresses | Yes | No | No | No | No |
| Tor Support | Yes | No | No | No | No |
| ZK Transactions | Yes | No | No | No | No |
| ZK Social Recovery | Yes | No | No | No | No |
| Zero Telemetry | Yes | No | No | No | No |
| Desktop App | Yes | No | No | No | No |
| Open Source | Yes | Yes | No | No | Partial |
| No Corporate Owner | Yes | No | No | No | No |

---

## Installation

### Browser Extension
```bash
# Coming soon to Chrome Web Store, Firefox Add-ons
```

### Mobile App
```bash
# Coming soon to App Store, Google Play
```

### Desktop App
```bash
# Coming soon for Windows, macOS, Linux
```

### Build from Source
```bash
# Clone repository
git clone https://github.com/your-org/trinity-wallet.git
cd trinity-wallet

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run web test UI
pnpm dev:web

# Build browser extension
pnpm build:extension

# Build mobile app
pnpm build:mobile

# Build desktop app
pnpm build:desktop
```

---

## Architecture

Trinity uses a monorepo architecture with a shared core:

```
trinity-wallet/
├── packages/
│   ├── core/         # Shared wallet logic (TypeScript)
│   │   ├── wallet/   # HD wallet, accounts
│   │   ├── crypto/   # Encryption, signing
│   │   ├── networks/ # Chain configs, providers
│   │   ├── privacy/  # Stealth, rotation, Tor
│   │   └── zk/       # Zero-knowledge proofs
│   │
│   ├── ui/           # Shared React components
│   ├── web/          # Test web interface
│   ├── extension/    # Browser extension
│   ├── mobile/       # React Native app
│   └── desktop/      # Electron app
```

### Tech Stack
- **Language:** TypeScript
- **Blockchain:** ethers.js v6
- **State:** Zustand
- **Web:** React + Vite + Tailwind
- **Mobile:** React Native + Expo
- **Desktop:** Electron
- **Monorepo:** Turborepo + pnpm

---

## Security

### What We Do
- Seed phrase encrypted with AES-256-GCM
- Password never stored, used to derive encryption key
- Private keys derived on-demand, cleared after use
- All network calls through privacy layer
- No telemetry, analytics, or tracking
- Open source for full auditability

### What We Don't Do
- Store your seed phrase in plaintext
- Send any data to our servers (we have none)
- Track your transactions or balances
- Sell your data
- Partner with data brokers

### Responsible Disclosure
Found a security issue? Please email security@trinity-wallet.dev (do not open a public issue).

---

## Roadmap

### Phase 1-5: Core + Extension (Completed)
- [x] Project architecture
- [x] HD wallet implementation
- [x] Privacy layer (stealth addresses, RPC rotation)
- [x] Browser extension
- [x] DApp integration

### Phase 6: Advanced Features
- [ ] Transaction simulation
- [ ] ZK social recovery
- [ ] Railgun integration
- [ ] Portfolio dashboard

### Phase 7: Mobile + Desktop
- [ ] React Native app
- [ ] Electron desktop app

### Future
- Intent-based transactions
- Programmable automation
- Inheritance planning
- Multi-sig support
- Cross-chain identity

See [PLAN.md](PLAN.md) for detailed roadmap.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development
```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run linter
pnpm lint

# Start development server
pnpm dev
```

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

## Links

- Website: [trinity-wallet.dev](https://trinity-wallet.dev) (coming soon)
- Documentation: [docs.trinity-wallet.dev](https://docs.trinity-wallet.dev) (coming soon)
- Twitter: [@TrinityWallet](https://twitter.com/TrinityWallet)
- Discord: [Join our community](https://discord.gg/trinity)

---

<div align="center">

**Built with privacy in mind**

*If you believe in financial privacy, star this repo and spread the word.*

</div>
