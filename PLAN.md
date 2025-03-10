# Trinity Wallet - Development Plan

> A **privacy-first** cross-platform blockchain wallet (Browser Extension, Mobile, Desktop) with MetaMask-like features plus transaction simulation, portfolio dashboard, social recovery, and advanced privacy features including ZK transactions, stealth addresses, and network privacy.

---

## Competitive Analysis

### Trinity Wallet vs. Existing Wallets

| Feature | Trinity | MetaMask | Trust Wallet | Phantom | Coinbase Wallet |
|---------|:-------:|:--------:|:------------:|:-------:|:---------------:|
| **Platforms** |
| Browser Extension | ✅ | ✅ | ❌ | ✅ | ✅ |
| Mobile App | ✅ | ✅ | ✅ | ✅ | ✅ |
| Desktop App | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Privacy Features** |
| Stealth Addresses (EIP-5564) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Address Rotation | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tor/Proxy Support | ✅ | ❌ | ❌ | ❌ | ❌ |
| RPC Rotation | ✅ | ❌ | ❌ | ❌ | ❌ |
| Flashbots Protect (MEV) | ✅ | ❌ | ❌ | ❌ | ❌ |
| ZK Private Transactions | ✅ | ❌ | ❌ | ❌ | ❌ |
| Zero Telemetry | ✅ | ❌ | ❌ | ❌ | ❌ |
| Hidden Balance Mode | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Security Features** |
| ZK Social Recovery | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transaction Simulation | ✅ | ⚠️ Snap | ❌ | ✅ | ✅ |
| Phishing Detection | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hardware Wallet Support | ✅ | ✅ | ✅ | ✅ | ✅ |
| **User Features** |
| Portfolio Dashboard | ✅ | ⚠️ Basic | ✅ | ✅ | ✅ |
| Built-in Swap | ✅ | ✅ | ✅ | ✅ | ✅ |
| NFT Gallery | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-chain | ✅ EVM | ✅ EVM | ✅ Multi | ✅ Multi | ✅ Multi |
| **Philosophy** |
| Open Source | ✅ | ✅ | ❌ | ❌ | ⚠️ Partial |
| Fully Decentralized | ✅ | ⚠️ Infura | ❌ | ⚠️ | ❌ |
| No Corporate Backing | ✅ | ❌ ConsenSys | ❌ Binance | ❌ VC | ❌ Coinbase |

### Key Differentiators

1. **Privacy-First Architecture**
   - Only wallet with comprehensive privacy stack (stealth addresses + Tor + ZK)
   - No data collection, no telemetry, no tracking
   - Every network call goes through privacy layer

2. **ZK Social Recovery**
   - Recover wallet without revealing guardian identities
   - No other wallet offers this

3. **True Cross-Platform**
   - Native desktop app (not just browser + mobile like competitors)
   - Shared core = consistent experience everywhere

4. **Community-Owned**
   - No corporate backing means no profit motive to compromise privacy
   - Fully open source from day one

---

## Additional Innovative Features (Future Roadmap)

Beyond the core differentiators, here are additional features to consider for future phases:

### 1. Intent-Based Transactions
Instead of manually crafting transactions, express what you want:
```
"Swap 1 ETH for maximum USDC across any DEX"
"Send $100 worth of ETH to alice.eth"
"Buy NFT floor from collection X under 0.5 ETH"
```
Wallet finds optimal route, handles approvals, executes atomically.

### 2. Programmable Automation (Trinity Triggers)
Set up automated actions without coding:
- "If ETH drops below $2000, swap 50% to USDC"
- "Every month, DCA $500 into ETH"
- "If gas < 20 gwei, execute pending transactions"
- "Alert me if any token drops 20%"

### 3. Inheritance Planning (Dead Man's Switch)
- Set up beneficiaries with time-delayed access
- If wallet inactive for X months, beneficiaries can recover
- Uses time-locked cryptography, no smart contracts needed
- Privacy-preserving: beneficiaries don't know until triggered

### 4. Multi-Signature Support
- Native multi-sig without smart contracts (MPC)
- Or integrate with Safe (Gnosis Safe)
- Shared team/family wallets

### 5. Cross-Chain Identity
- Unified identity across all EVM chains
- Link ENS, Lens, Farcaster profiles
- Portable reputation/history

### 6. AI Transaction Explainer
- Natural language explanation of any transaction
- "This transaction will swap your ETH for USDC on Uniswap, with 0.3% fee and 2% slippage tolerance"
- Risk assessment in plain English

### 7. Privacy Score Dashboard
- Real-time score showing how private your wallet is
- Suggestions to improve privacy
- Track which addresses are linked

### 8. Batch Transactions
- Combine multiple operations into one
- Save gas, reduce complexity
- "Send tokens to 10 addresses in one transaction"

### 9. Session Keys (Coming: EIP-7702)
- Grant limited permissions to DApps
- "This DApp can spend up to 0.1 ETH for the next hour"
- No need to approve every transaction

### 10. Local-First Sync
- Wallet state syncs across devices without central server
- Encrypted P2P sync or via user's own cloud

---

## Overview

**Supported Platforms:**
- Browser Extension (Chrome, Firefox, Edge, Brave)
- Mobile App (iOS, Android via React Native)
- Desktop App (Windows, macOS, Linux via Electron)

**Supported Networks (EVM):**
- Ethereum Mainnet & Goerli/Sepolia testnets
- Polygon (Matic)
- BNB Smart Chain (BSC)
- Arbitrum One
- Optimism
- Avalanche C-Chain
- Base
- Custom RPC networks

---

## Privacy Architecture

Trinity Wallet is built with privacy as a core design principle, not an afterthought.

### Privacy Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRINITY PRIVACY STACK                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Layer 5: UI Privacy                                     │    │
│  │  • Hidden balances mode    • Anti-screenshot            │    │
│  │  • Decoy transactions UI   • Stealth mode               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Layer 4: ZK Protocols (Phase 6)                        │    │
│  │  • Railgun integration     • Private transfers          │    │
│  │  • ZK social recovery      • Balance proofs             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Layer 3: Transaction Privacy                            │    │
│  │  • Stealth addresses       • Address rotation           │    │
│  │  • Flashbots Protect       • MEV protection             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Layer 2: Network Privacy                                │    │
│  │  • Tor/Proxy support       • Multiple RPC rotation      │    │
│  │  • No IP correlation       • Local node option          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Layer 1: Data Privacy (Core)                            │    │
│  │  • Zero telemetry          • Local-only storage         │    │
│  │  • No analytics            • No third-party tracking    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Privacy Features Detail

#### 1. Network Privacy (MVP Core)

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **RPC Rotation** | Rotate between multiple RPC endpoints | Round-robin with fallback |
| **Tor Support** | Route RPC calls through Tor network | SOCKS5 proxy support |
| **Flashbots Protect** | Hide transactions from MEV bots | Use Flashbots RPC for Ethereum |
| **Local Node** | Connect to user's own node | Custom RPC configuration |
| **No IP Leaks** | Never expose IP to blockchain APIs | All calls through privacy layer |

```typescript
// Privacy-preserving RPC configuration
interface PrivacyConfig {
  useTor: boolean;
  torProxy: string;  // e.g., "socks5://127.0.0.1:9050"
  useFlashbots: boolean;
  rpcRotation: boolean;
  localNodeUrl?: string;
}
```

#### 2. Stealth Addresses (MVP Core)

Stealth addresses allow receiving funds without linking to your public address.

**How it works:**
1. User generates a stealth meta-address (public)
2. Sender computes one-time address from meta-address
3. Only recipient can detect and spend funds
4. Each transaction uses a unique address

**Standard:** EIP-5564 (Stealth Address Standard)

```typescript
// Stealth address flow
const stealthMeta = wallet.generateStealthMetaAddress();
// Share stealthMeta.address publicly

// Sender side (in DApp or another wallet)
const { stealthAddress, ephemeralPubKey } = generateStealthAddress(stealthMeta);
// Send funds to stealthAddress, publish ephemeralPubKey

// Receiver side (scanning)
const funds = await wallet.scanStealthTransfers(fromBlock, toBlock);
// Automatically detects funds sent to stealth addresses
```

#### 3. Address Rotation (MVP Core)

Automatically use fresh addresses to prevent tracking.

| Scenario | Behavior |
|----------|----------|
| **Receiving** | Generate new address for each receive request |
| **Change** | Send change to new derived address |
| **DApp Connection** | Option to use derived address per-site |

```typescript
// HD path for address rotation
// m/44'/60'/0'/0/0 - Main address
// m/44'/60'/0'/0/1 - Receive address #1
// m/44'/60'/0'/0/2 - Receive address #2
// ...
```

#### 4. ZK Transactions (Phase 6)

Integration with privacy protocols for shielded transfers.

**Supported Protocols:**
- **Railgun** - Private transfers on Ethereum, Polygon, BSC, Arbitrum
- **Aztec Connect** - Private DeFi on Ethereum (when available)

```typescript
// Private transfer flow
const privatePool = await wallet.connectPrivacyProtocol('railgun');

// Shield funds (public → private)
await privatePool.shield(tokenAddress, amount);

// Private transfer
await privatePool.transfer(recipientShieldedAddress, amount);

// Unshield funds (private → public)
await privatePool.unshield(amount, destinationAddress);
```

#### 5. ZK Social Recovery (Phase 6)

Zero-knowledge proofs for guardian-based recovery without revealing identities.

**How it works:**
1. User sets up N guardians (threshold M-of-N)
2. Guardians are stored as commitments (hashes), not addresses
3. During recovery, guardians prove knowledge without revealing identity
4. ZK proof verifies M guardians approved without linking to addresses

```typescript
// Setup guardians
await wallet.setupZKRecovery({
  threshold: 3,  // Need 3-of-5
  guardians: [
    { commitment: hash(guardian1Secret) },
    { commitment: hash(guardian2Secret) },
    // ... guardians don't need to be addresses
  ]
});

// Recovery flow
const proof = await generateRecoveryProof(guardianSecrets);
await wallet.executeRecovery(proof, newSeedPhrase);
```

#### 6. UI Privacy Features

| Feature | Description |
|---------|-------------|
| **Hidden Balances** | One-click hide all balance amounts |
| **Stealth Mode** | Minimize to tray, no notifications |
| **Anti-Screenshot** | Blur sensitive data on screen capture (mobile) |
| **Decoy Mode** | Show fake balances to observers |
| **Privacy Score** | Show user how private their setup is |

---

## Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Language** | TypeScript | Type safety, shared across platforms |
| **Monorepo** | Turborepo + pnpm | Fast builds, shared dependencies |
| **Blockchain** | ethers.js v6 | Mature, well-documented, smaller than web3.js |
| **State** | Zustand | Lightweight, works in all JS environments |
| **Browser Extension** | React + Vite + Manifest V3 | Modern build, Chrome requires MV3 |
| **Mobile** | React Native + Expo | Cross-platform, shared React knowledge |
| **Desktop** | Electron + React | Native desktop experience |
| **Styling** | Tailwind CSS / NativeWind | Consistent design, utility-first |
| **Testing** | Vitest + React Testing Library | Fast, modern testing |
| **Encryption** | Web Crypto API | Native, secure, no dependencies |

---

## Project Structure

```
trinity-wallet/
├── packages/
│   │
│   ├── core/                     # Shared wallet logic (platform-agnostic)
│   │   ├── src/
│   │   │   ├── wallet/
│   │   │   │   ├── hdwallet.ts       # HD wallet (BIP-39, BIP-44)
│   │   │   │   ├── account.ts        # Account management
│   │   │   │   └── keyring.ts        # Key management
│   │   │   │
│   │   │   ├── crypto/
│   │   │   │   ├── encryption.ts     # AES-256-GCM encryption
│   │   │   │   ├── hashing.ts        # Keccak, SHA256
│   │   │   │   └── random.ts         # Secure random generation
│   │   │   │
│   │   │   ├── networks/
│   │   │   │   ├── chains.ts         # Chain configurations
│   │   │   │   ├── provider.ts       # RPC provider management
│   │   │   │   └── types.ts          # Network types
│   │   │   │
│   │   │   ├── transactions/
│   │   │   │   ├── builder.ts        # Transaction builder
│   │   │   │   ├── gas.ts            # Gas estimation
│   │   │   │   ├── signer.ts         # Transaction signing
│   │   │   │   └── history.ts        # Transaction history
│   │   │   │
│   │   │   ├── tokens/
│   │   │   │   ├── erc20.ts          # ERC-20 interactions
│   │   │   │   ├── balances.ts       # Balance fetching
│   │   │   │   ├── prices.ts         # Price fetching
│   │   │   │   └── registry.ts       # Token list management
│   │   │   │
│   │   │   ├── simulation/
│   │   │   │   ├── simulator.ts      # Transaction simulation
│   │   │   │   └── decoder.ts        # Transaction decoding
│   │   │   │
│   │   │   ├── privacy/              # Privacy layer (NEW)
│   │   │   │   ├── stealth.ts        # EIP-5564 stealth addresses
│   │   │   │   ├── rotation.ts       # Address rotation
│   │   │   │   ├── rpc-privacy.ts    # RPC rotation, Tor support
│   │   │   │   ├── flashbots.ts      # Flashbots Protect integration
│   │   │   │   └── railgun.ts        # Railgun SDK integration
│   │   │   │
│   │   │   ├── zk/                   # Zero-knowledge proofs (NEW)
│   │   │   │   ├── recovery.ts       # ZK social recovery
│   │   │   │   ├── proofs.ts         # Proof generation/verification
│   │   │   │   └── circuits/         # ZK circuits (circom/snarkjs)
│   │   │   │
│   │   │   ├── storage/
│   │   │   │   ├── interface.ts      # Storage interface
│   │   │   │   ├── encrypted.ts      # Encrypted storage
│   │   │   │   └── vault.ts          # Vault management
│   │   │   │
│   │   │   └── index.ts              # Public API
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                       # Shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button/
│   │   │   │   ├── Input/
│   │   │   │   ├── Card/
│   │   │   │   ├── Modal/
│   │   │   │   ├── TokenList/
│   │   │   │   ├── TransactionItem/
│   │   │   │   ├── NetworkSelector/
│   │   │   │   ├── AccountSelector/
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useWallet.ts
│   │   │   │   ├── useNetwork.ts
│   │   │   │   ├── useTokens.ts
│   │   │   │   ├── useTransactions.ts
│   │   │   │   └── usePrice.ts
│   │   │   │
│   │   │   └── stores/
│   │   │       ├── walletStore.ts
│   │   │       ├── networkStore.ts
│   │   │       └── settingsStore.ts
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                      # Test web UI (development)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Onboarding/
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── Send/
│   │   │   │   ├── Receive/
│   │   │   │   ├── Settings/
│   │   │   │   └── History/
│   │   │   │
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   │
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.js
│   │
│   ├── extension/                # Browser extension
│   │   ├── src/
│   │   │   ├── background/
│   │   │   │   ├── index.ts          # Service worker
│   │   │   │   ├── controller.ts     # Wallet controller
│   │   │   │   └── rpc-handler.ts    # DApp RPC handler
│   │   │   │
│   │   │   ├── content/
│   │   │   │   └── inject.ts         # Provider injection
│   │   │   │
│   │   │   ├── inpage/
│   │   │   │   └── provider.ts       # Injected Web3 provider
│   │   │   │
│   │   │   ├── popup/
│   │   │   │   ├── pages/
│   │   │   │   ├── App.tsx
│   │   │   │   └── main.tsx
│   │   │   │
│   │   │   └── notification/         # Full-page approval UI
│   │   │       └── ...
│   │   │
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   └── icons/
│   │   │
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── mobile/                   # React Native app (Phase 7)
│   │   └── ...
│   │
│   └── desktop/                  # Electron app (Phase 7)
│       └── ...
│
├── package.json                  # Root package.json
├── pnpm-workspace.yaml           # pnpm workspace config
├── turbo.json                    # Turborepo config
├── tsconfig.base.json            # Shared TypeScript config
├── .eslintrc.js                  # ESLint config
├── .prettierrc                   # Prettier config
└── README.md
```

---

## Development Phases

### Phase 1: Foundation (Core Setup + Privacy Foundation)

**Goal:** Set up monorepo, implement core wallet cryptography, and establish privacy-first architecture.

**Tasks:**
- [ ] Initialize monorepo with Turborepo + pnpm
- [ ] Set up TypeScript configuration
- [ ] Set up ESLint + Prettier
- [ ] Implement HD wallet (BIP-39 mnemonic, BIP-44 derivation)
- [ ] Implement encryption layer (AES-256-GCM)
- [ ] Implement secure storage interface
- [ ] Create vault for encrypted seed storage
- [ ] **Privacy: Implement address rotation system**
- [ ] **Privacy: Implement RPC rotation layer**
- [ ] **Privacy: Zero telemetry policy (no external calls except RPC)**
- [ ] Add unit tests for crypto functions
- [ ] Set up CI pipeline

**Key Files:**
- `packages/core/src/wallet/hdwallet.ts`
- `packages/core/src/crypto/encryption.ts`
- `packages/core/src/storage/vault.ts`
- `packages/core/src/privacy/rotation.ts` (NEW)
- `packages/core/src/privacy/rpc-privacy.ts` (NEW)

**Deliverables:**
- Can generate new wallet from seed phrase
- Can derive multiple accounts from seed
- Can encrypt/decrypt vault with password
- Can sign messages and transactions
- **Address rotation ready from day one**
- **RPC requests routed through privacy layer**

---

### Phase 2: Network & Transactions

**Goal:** Connect to EVM networks and send transactions.

**Tasks:**
- [ ] Define chain configurations (chainId, RPC, explorer, etc.)
- [ ] Implement provider management (connect, switch networks)
- [ ] Implement ETH balance fetching
- [ ] Implement gas estimation (EIP-1559 support)
- [ ] Implement transaction builder
- [ ] Implement transaction signing
- [ ] Implement transaction broadcasting
- [ ] Implement transaction history tracking
- [ ] Add nonce management

**Key Files:**
- `packages/core/src/networks/chains.ts`
- `packages/core/src/networks/provider.ts`
- `packages/core/src/transactions/builder.ts`
- `packages/core/src/transactions/gas.ts`

**Deliverables:**
- Can connect to any EVM network
- Can fetch ETH balance
- Can send ETH transactions
- Can track transaction status

---

### Phase 3: Test Web UI

**Goal:** Build a functional web UI to test core functionality.

**Tasks:**
- [ ] Set up Vite + React + Tailwind
- [ ] Create Zustand stores for state management
- [ ] Build onboarding flow (create/import wallet)
- [ ] Build unlock screen (password entry)
- [ ] Build dashboard (balance display, recent activity)
- [ ] Build send flow (recipient, amount, gas, confirm)
- [ ] Build receive screen (address display, QR code)
- [ ] Build transaction history view
- [ ] Build network selector
- [ ] Build account selector/manager
- [ ] Build settings page

**Key Screens:**
1. **Onboarding:** Create new wallet / Import existing
2. **Unlock:** Password entry to decrypt vault
3. **Dashboard:** Balance, tokens, quick actions
4. **Send:** Enter recipient, amount, review, confirm
5. **Receive:** Show address + QR code
6. **History:** Transaction list with status
7. **Settings:** Network, accounts, security, about

**Deliverables:**
- Fully functional wallet in browser
- Can create/import wallet
- Can send/receive ETH
- Can switch networks and accounts

---

### Phase 4: Token Support

**Goal:** Support ERC-20 tokens.

**Tasks:**
- [ ] Implement ERC-20 contract interactions
- [ ] Implement token balance fetching
- [ ] Implement token transfers
- [ ] Implement token approval
- [ ] Add token list management (add/remove custom tokens)
- [ ] Integrate token price API (CoinGecko)
- [ ] Show token values in USD/preferred currency
- [ ] Auto-detect tokens (via token lists or APIs)
- [ ] Update UI for token display

**Key Files:**
- `packages/core/src/tokens/erc20.ts`
- `packages/core/src/tokens/balances.ts`
- `packages/core/src/tokens/prices.ts`
- `packages/core/src/tokens/registry.ts`

**Deliverables:**
- Can view ERC-20 token balances
- Can send ERC-20 tokens
- Can add custom tokens
- Can see USD values

---

### Phase 5: Browser Extension

**Goal:** Package as Chrome/Firefox extension with DApp support.

**Tasks:**
- [ ] Set up Manifest V3 configuration
- [ ] Implement service worker (background script)
- [ ] Implement content script for provider injection
- [ ] Implement inpage provider (window.ethereum)
- [ ] Port web UI to extension popup
- [ ] Implement notification page for approvals
- [ ] Implement message passing (popup <-> background)
- [ ] Handle `eth_requestAccounts` (connection request)
- [ ] Handle `eth_sendTransaction` (transaction approval)
- [ ] Handle `personal_sign` (message signing)
- [ ] Handle `eth_signTypedData_v4` (typed data signing)
- [ ] Handle `wallet_switchEthereumChain`
- [ ] Handle `wallet_addEthereumChain`
- [ ] Add connected sites management
- [ ] Add phishing detection

**Key Files:**
- `packages/extension/public/manifest.json`
- `packages/extension/src/background/index.ts`
- `packages/extension/src/inpage/provider.ts`
- `packages/extension/src/content/inject.ts`

**Deliverables:**
- Working Chrome extension
- Can connect to DApps (Uniswap, OpenSea, etc.)
- Can approve transactions from DApps
- Can sign messages from DApps

---

### Phase 6: Advanced Features

**Goal:** Add differentiation features.

#### 6a: Transaction Simulation

**Tasks:**
- [ ] Integrate simulation API (Tenderly/Alchemy)
- [ ] Decode transaction data (function calls, parameters)
- [ ] Show asset changes preview (what you'll send/receive)
- [ ] Show gas cost estimate
- [ ] Detect potential risks/warnings
- [ ] Display human-readable transaction summary

**Deliverables:**
- Before signing, see exactly what will happen
- Warnings for suspicious transactions

#### 6b: Portfolio Dashboard

**Tasks:**
- [ ] Aggregate all token balances
- [ ] Fetch historical prices
- [ ] Calculate portfolio value over time
- [ ] Build chart component (line chart)
- [ ] Show 24h/7d/30d/1y views
- [ ] Show P&L calculations
- [ ] Show allocation breakdown (pie chart)

**Deliverables:**
- Visual portfolio overview
- Historical performance tracking

#### 6c: Social Recovery

**Tasks:**
- [ ] Design guardian system (trusted addresses)
- [ ] Implement recovery request flow
- [ ] Implement guardian approval collection
- [ ] Implement recovery execution
- [ ] Add guardian management UI
- [ ] Consider smart contract wallet integration (optional)

**Deliverables:**
- Can add guardians for recovery
- Can recover wallet if seed phrase lost

---

### Phase 7: Mobile & Desktop

**Goal:** Extend to mobile and desktop platforms.

#### Mobile (React Native)

**Tasks:**
- [ ] Set up React Native + Expo project
- [ ] Implement secure storage (Keychain/Keystore)
- [ ] Port UI components (NativeWind)
- [ ] Implement biometric authentication
- [ ] Implement push notifications
- [ ] Implement WalletConnect v2
- [ ] Implement deep linking
- [ ] Build and test on iOS/Android

#### Desktop (Electron)

**Tasks:**
- [ ] Set up Electron project
- [ ] Port web UI to Electron renderer
- [ ] Implement secure storage
- [ ] Implement system tray integration
- [ ] Implement auto-updates
- [ ] Build installers for Windows/macOS/Linux

---

## Security Considerations

### Critical Security Requirements

1. **Seed Phrase Protection**
   - Never stored in plaintext
   - Encrypted with user password using AES-256-GCM
   - Password never stored, only used to derive encryption key
   - Memory cleared after use

2. **Private Key Handling**
   - Keys derived on-demand from seed
   - Never logged or transmitted
   - Cleared from memory after signing

3. **Encryption**
   - AES-256-GCM for vault encryption
   - PBKDF2 with 600,000 iterations for key derivation
   - Random IV for each encryption

4. **Input Validation**
   - Address checksum validation
   - Amount validation (sufficient balance)
   - Gas limit sanity checks

5. **DApp Security**
   - Origin validation for all requests
   - Phishing detection (blocklist)
   - Clear transaction data display
   - User approval for all sensitive actions

6. **Extension Security**
   - Content Security Policy
   - No eval() or inline scripts
   - Minimal permissions in manifest

---

## API Design (Core Package)

```typescript
// Wallet creation
const wallet = await TrinityWallet.create(password);
const wallet = await TrinityWallet.import(seedPhrase, password);
const wallet = await TrinityWallet.unlock(password);

// Account management
const accounts = wallet.getAccounts();
const account = wallet.createAccount(name);
const account = wallet.getAccount(address);

// Network
wallet.setNetwork(chainId);
const network = wallet.getNetwork();
const balance = await wallet.getBalance(address);

// Transactions
const tx = await wallet.buildTransaction({ to, value, data });
const gasEstimate = await wallet.estimateGas(tx);
const signedTx = await wallet.signTransaction(tx);
const hash = await wallet.sendTransaction(signedTx);
const receipt = await wallet.waitForTransaction(hash);

// Tokens
const tokens = await wallet.getTokens(address);
const balance = await wallet.getTokenBalance(address, tokenAddress);
await wallet.transferToken(tokenAddress, to, amount);

// Signing
const signature = await wallet.signMessage(message);
const signature = await wallet.signTypedData(typedData);

// Simulation
const simulation = await wallet.simulateTransaction(tx);
```

---

## Testing Strategy

1. **Unit Tests** (Vitest)
   - Crypto functions
   - HD wallet derivation
   - Transaction building
   - Encoding/decoding

2. **Integration Tests**
   - Network connections (use testnets)
   - Transaction flow
   - Token operations

3. **E2E Tests** (Playwright)
   - Full user flows
   - DApp connection flow
   - Extension popup interactions

4. **Security Audit**
   - Before mainnet launch
   - Focus on crypto, storage, signing

---

## Success Criteria

### MVP (Phases 1-5)
- [ ] Create/import wallet with seed phrase
- [ ] View ETH and ERC-20 balances
- [ ] Send ETH and ERC-20 tokens
- [ ] Switch between networks
- [ ] Manage multiple accounts
- [ ] Connect to DApps
- [ ] Approve transactions from DApps
- [ ] Sign messages from DApps

### Full Product (All Phases)
- [ ] All MVP features
- [ ] Transaction simulation
- [ ] Portfolio dashboard
- [ ] Social recovery
- [ ] Mobile app (iOS/Android)
- [ ] Desktop app (Windows/macOS/Linux)

---

## Getting Started

Once this plan is approved, we'll begin with:

1. Initialize the monorepo structure
2. Set up the core package
3. Implement HD wallet functionality
4. Build encryption layer
5. Create the test web UI

Ready to start coding? Let me know!
