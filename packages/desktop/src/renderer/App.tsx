import { useEffect, useState } from 'react';
import { formatEther } from 'ethers';
import { CHAINS_BY_ID, getNativeCurrencySymbol, HDWallet, Vault } from '@trinity/core';

interface WalletState {
  isInitialized: boolean;
  isUnlocked: boolean;
  chainId: string;
  accounts: string[];
  currentAccount: {
    name: string;
    address: string;
  } | null;
}

type View = 'home' | 'send' | 'receive' | 'portfolio' | 'privacy' | 'settings';

function App() {
  const [state, setState] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<bigint>(0n);
  const [currentView, setCurrentView] = useState<View>('home');

  // Onboarding state
  const [step, setStep] = useState<'welcome' | 'create' | 'import' | 'unlock'>('welcome');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const result = await window.electron.wallet.getState();
      setState(result);
    } catch (err) {
      console.error('Failed to load state:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const { mnemonic: newMnemonic, wallet } = HDWallet.generate(12);
      const account = wallet.deriveAccount(0);

      // Store encrypted vault
      await window.electron.store.set('vault', { encrypted: true });
      await window.electron.store.set('accounts', [{ name: 'Account 1', address: account.address }]);
      await window.electron.store.set('currentAccount', { name: 'Account 1', address: account.address });
      await window.electron.store.set('isUnlocked', true);

      setMnemonic(newMnemonic);
      await loadState();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleLock = async () => {
    await window.electron.wallet.lock();
    await loadState();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = () => {
    if (state?.currentAccount?.address) {
      navigator.clipboard.writeText(state.currentAccount.address);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔺</div>
          <div className="text-white text-xl">Loading Trinity Wallet...</div>
        </div>
      </div>
    );
  }

  // Not initialized - show onboarding
  if (!state?.isInitialized) {
    return (
      <div className="h-screen bg-gray-900 flex">
        {step === 'welcome' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-8xl mb-6">🔺</div>
            <h1 className="text-4xl font-bold text-white mb-2">Trinity Wallet</h1>
            <p className="text-gray-400 text-lg mb-12">Privacy-First Blockchain Wallet</p>

            <div className="w-full max-w-sm space-y-4">
              <button onClick={() => setStep('create')} className="btn-primary w-full py-4 text-lg">
                Create New Wallet
              </button>
              <button onClick={() => setStep('import')} className="btn-secondary w-full py-4 text-lg">
                Import Existing Wallet
              </button>
            </div>

            <div className="mt-12 text-gray-500 text-sm">
              Desktop App v0.1.0
            </div>
          </div>
        )}

        {step === 'create' && (
          <div className="flex-1 flex flex-col p-8 max-w-lg mx-auto">
            <button onClick={() => setStep('welcome')} className="text-gray-400 mb-8 self-start">
              ← Back
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Create Wallet</h2>

            <div className="space-y-4 mb-8">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password (min 8 characters)"
                className="input w-full"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="input w-full"
              />

              {error && <p className="text-red-500">{error}</p>}

              <button onClick={handleCreate} className="btn-primary w-full py-3">
                Create Wallet
              </button>
            </div>

            {mnemonic && (
              <div className="bg-gray-800 rounded-xl p-6">
                <p className="text-gray-400 mb-4">Save your recovery phrase:</p>
                <p className="text-white font-mono text-sm break-all bg-gray-700 p-4 rounded-lg">
                  {mnemonic}
                </p>
                <p className="text-yellow-500 text-sm mt-4">
                  ⚠️ Never share this phrase with anyone!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Locked - show unlock
  if (!state.isUnlocked) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-6">Unlock Wallet</h2>

          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="input w-full"
            />

            {error && <p className="text-red-500">{error}</p>}

            <button className="btn-primary w-full py-3">Unlock</button>
          </div>
        </div>
      </div>
    );
  }

  // Main app UI
  const chainId = parseInt(state.chainId, 16);
  const chain = CHAINS_BY_ID[chainId];
  const symbol = getNativeCurrencySymbol(chainId);

  return (
    <div className="h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 flex flex-col">
        {/* Title bar area (for macOS) */}
        <div className="titlebar h-12 flex items-center px-20">
          <span className="text-xl">🔺</span>
          <span className="ml-2 font-semibold text-white">Trinity</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <div
            className={`sidebar-item ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentView('home')}
          >
            <span>🏠</span>
            <span>Home</span>
          </div>
          <div
            className={`sidebar-item ${currentView === 'portfolio' ? 'active' : ''}`}
            onClick={() => setCurrentView('portfolio')}
          >
            <span>📊</span>
            <span>Portfolio</span>
          </div>
          <div
            className={`sidebar-item ${currentView === 'privacy' ? 'active' : ''}`}
            onClick={() => setCurrentView('privacy')}
          >
            <span>🛡️</span>
            <span>Privacy</span>
          </div>
          <div
            className={`sidebar-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentView('settings')}
          >
            <span>⚙️</span>
            <span>Settings</span>
          </div>
        </nav>

        {/* Account */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{state.currentAccount?.name}</p>
              <p className="text-white font-mono text-sm">
                {state.currentAccount && formatAddress(state.currentAccount.address)}
              </p>
            </div>
            <button onClick={handleLock} className="text-gray-400 hover:text-white">
              🔒
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {currentView === 'home' && (
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <div className="flex items-center gap-4">
                <span className="bg-gray-700 px-3 py-1 rounded-full text-sm text-white">
                  {chain?.shortName ?? 'Unknown'}
                </span>
              </div>
            </div>

            {/* Balance Card */}
            <div className="card mb-8">
              <p className="text-gray-400 mb-2">Total Balance</p>
              <p className="text-4xl font-bold text-white mb-1">
                {parseFloat(formatEther(balance)).toFixed(4)} {symbol}
              </p>
              <p className="text-gray-400">on {chain?.name}</p>

              <div className="flex gap-4 mt-6">
                <button className="btn-primary flex-1">↗️ Send</button>
                <button className="btn-secondary flex-1">↙️ Receive</button>
                <button className="btn-secondary flex-1">🔄 Swap</button>
              </div>
            </div>

            {/* Privacy Features */}
            <h2 className="text-lg font-semibold text-white mb-4">Privacy Features</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="card cursor-pointer hover:bg-gray-700">
                <div className="text-2xl mb-2">🔒</div>
                <h3 className="text-white font-medium">Stealth Addresses</h3>
                <p className="text-gray-400 text-sm">Generate one-time receiving addresses</p>
              </div>
              <div className="card cursor-pointer hover:bg-gray-700">
                <div className="text-2xl mb-2">🛡️</div>
                <h3 className="text-white font-medium">ZK Transactions</h3>
                <p className="text-gray-400 text-sm">Private transfers via Railgun</p>
              </div>
              <div className="card cursor-pointer hover:bg-gray-700">
                <div className="text-2xl mb-2">🌐</div>
                <h3 className="text-white font-medium">RPC Privacy</h3>
                <p className="text-gray-400 text-sm">Rotate between multiple providers</p>
              </div>
              <div className="card cursor-pointer hover:bg-gray-700">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="text-white font-medium">Flashbots Protect</h3>
                <p className="text-gray-400 text-sm">Shield from MEV extraction</p>
              </div>
            </div>
          </div>
        )}

        {currentView === 'portfolio' && (
          <div className="p-8">
            <h1 className="text-2xl font-bold text-white mb-8">Portfolio</h1>
            <div className="card">
              <p className="text-gray-400">Portfolio tracking coming soon...</p>
            </div>
          </div>
        )}

        {currentView === 'privacy' && (
          <div className="p-8">
            <h1 className="text-2xl font-bold text-white mb-8">Privacy Center</h1>
            <div className="card">
              <p className="text-gray-400">Privacy features dashboard coming soon...</p>
            </div>
          </div>
        )}

        {currentView === 'settings' && (
          <div className="p-8">
            <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>
            <div className="space-y-4">
              <div className="card">
                <h3 className="text-white font-medium mb-4">Network</h3>
                <div className="flex gap-2 flex-wrap">
                  {Object.values(CHAINS_BY_ID).slice(0, 6).map(c => (
                    <button
                      key={c.id}
                      className={`px-4 py-2 rounded-lg ${
                        chainId === c.id ? 'bg-sky-600' : 'bg-gray-700'
                      } text-white`}
                    >
                      {c.shortName}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3 className="text-white font-medium mb-2">About</h3>
                <p className="text-gray-400">Trinity Wallet v0.1.0</p>
                <p className="text-gray-400">Desktop Edition</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
