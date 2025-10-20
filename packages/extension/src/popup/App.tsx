import { useEffect, useState } from 'react';
import { formatEther } from 'ethers';
import { CHAINS_BY_ID, getNativeCurrencySymbol } from '@trinity/core';

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

function App() {
  const [state, setState] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<bigint>(0n);

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
      const response = await chrome.runtime.sendMessage({
        type: 'popup',
        payload: { action: 'getState' },
      });

      if (response.result) {
        setState(response.result);

        if (response.result.isUnlocked) {
          loadBalance();
        }
      }
    } catch (err) {
      console.error('Failed to load state:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'popup',
        payload: { action: 'getBalance' },
      });

      if (response.result !== undefined) {
        setBalance(BigInt(response.result));
      }
    } catch (err) {
      console.error('Failed to load balance:', err);
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
      const response = await chrome.runtime.sendMessage({
        type: 'popup',
        payload: { action: 'createWallet', data: { password } },
      });

      if (response.error) {
        setError(response.error);
      } else {
        setMnemonic(response.result);
        await loadState();
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleImport = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'popup',
        payload: {
          action: 'importWallet',
          data: { mnemonic: importMnemonic, password },
        },
      });

      if (response.error) {
        setError(response.error);
      } else {
        await loadState();
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleUnlock = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'popup',
        payload: { action: 'unlock', data: password },
      });

      if (response.error) {
        setError(response.error);
      } else if (response.result) {
        await loadState();
        loadBalance();
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleLock = async () => {
    await chrome.runtime.sendMessage({
      type: 'popup',
      payload: { action: 'lock' },
    });
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
      <div className="h-full bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Not initialized - show onboarding
  if (!state?.isInitialized) {
    return (
      <div className="h-full bg-gray-900 p-4">
        {step === 'welcome' && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">🔺</div>
            <h1 className="text-xl font-bold text-white mb-2">Trinity Wallet</h1>
            <p className="text-gray-400 text-sm mb-8">Privacy-First Blockchain Wallet</p>

            <div className="w-full space-y-3">
              <button onClick={() => setStep('create')} className="btn-primary w-full">
                Create New Wallet
              </button>
              <button onClick={() => setStep('import')} className="btn-secondary w-full">
                Import Existing
              </button>
            </div>
          </div>
        )}

        {step === 'create' && (
          <div className="h-full flex flex-col">
            <button onClick={() => setStep('welcome')} className="text-gray-400 mb-4">
              ← Back
            </button>
            <h2 className="text-lg font-bold text-white mb-4">Create Wallet</h2>

            <div className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password (min 8 chars)"
                className="input w-full"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="input w-full"
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button onClick={handleCreate} className="btn-primary w-full">
                Create
              </button>
            </div>

            {mnemonic && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Save your recovery phrase:</p>
                <p className="text-white text-sm font-mono break-all">{mnemonic}</p>
              </div>
            )}
          </div>
        )}

        {step === 'import' && (
          <div className="h-full flex flex-col">
            <button onClick={() => setStep('welcome')} className="text-gray-400 mb-4">
              ← Back
            </button>
            <h2 className="text-lg font-bold text-white mb-4">Import Wallet</h2>

            <div className="space-y-3">
              <textarea
                value={importMnemonic}
                onChange={e => setImportMnemonic(e.target.value)}
                placeholder="Enter recovery phrase"
                rows={3}
                className="input w-full resize-none"
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="input w-full"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="input w-full"
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button onClick={handleImport} className="btn-primary w-full">
                Import
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Locked - show unlock
  if (!state.isUnlocked) {
    return (
      <div className="h-full bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-lg font-bold text-white mb-4">Unlock Wallet</h2>

        <div className="w-full space-y-3">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="input w-full"
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button onClick={handleUnlock} className="btn-primary w-full">
            Unlock
          </button>
        </div>
      </div>
    );
  }

  // Unlocked - show main UI
  const chainId = parseInt(state.chainId, 16);
  const chain = CHAINS_BY_ID[chainId];
  const symbol = getNativeCurrencySymbol(chainId);

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔺</span>
          <span className="font-semibold text-white">Trinity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-gray-700 px-2 py-1 rounded text-xs text-white">
            {chain?.shortName ?? 'Unknown'}
          </span>
          <button onClick={handleLock} className="text-gray-400 hover:text-white">
            🔒
          </button>
        </div>
      </div>

      {/* Account */}
      <div className="p-4 text-center border-b border-gray-800">
        <p className="text-gray-400 text-sm">{state.currentAccount?.name}</p>
        <button
          onClick={copyAddress}
          className="font-mono text-white hover:text-sky-400 transition-colors"
        >
          {state.currentAccount && formatAddress(state.currentAccount.address)}
        </button>
      </div>

      {/* Balance */}
      <div className="p-6 text-center">
        <p className="text-3xl font-bold text-white">
          {parseFloat(formatEther(balance)).toFixed(4)} {symbol}
        </p>
        <p className="text-gray-400 text-sm mt-1">on {chain?.name}</p>
      </div>

      {/* Actions */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <button className="btn-primary py-3">↗️ Send</button>
        <button className="btn-secondary py-3">↙️ Receive</button>
      </div>

      {/* Footer */}
      <div className="mt-auto p-3 text-center text-xs text-gray-500">
        Trinity Wallet v0.1.0
      </div>
    </div>
  );
}

export default App;
