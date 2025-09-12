import { useState } from 'react';
import { useWalletStore } from '../stores/walletStore';
import { SUPPORTED_CHAINS } from '@trinity/core';

export function Settings() {
  const {
    accounts,
    currentAccount,
    currentChainId,
    switchAccount,
    switchChain,
    addAccount,
    exportMnemonic,
  } = useWalletStore();

  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [newAccountName, setNewAccountName] = useState('');

  const handleShowMnemonic = () => {
    const phrase = exportMnemonic();
    if (phrase) {
      setMnemonic(phrase);
      setShowMnemonic(true);
    }
  };

  const handleAddAccount = async () => {
    try {
      await addAccount(newAccountName || undefined);
      setNewAccountName('');
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Accounts */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Accounts</h3>

        <div className="space-y-2 mb-4">
          {accounts.map(account => (
            <button
              key={account.id}
              onClick={() => switchAccount(account.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                account.id === currentAccount?.id
                  ? 'bg-trinity-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{account.name}</p>
                  <p className="font-mono text-sm text-gray-300">
                    {account.address.slice(0, 10)}...{account.address.slice(-8)}
                  </p>
                </div>
                {account.isPrimary && (
                  <span className="text-xs bg-yellow-600 px-2 py-1 rounded">Primary</span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newAccountName}
            onChange={e => setNewAccountName(e.target.value)}
            placeholder="New account name (optional)"
            className="input flex-1"
          />
          <button onClick={handleAddAccount} className="btn-secondary">
            Add Account
          </button>
        </div>
      </div>

      {/* Networks */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Network</h3>

        <div className="grid grid-cols-2 gap-2">
          {SUPPORTED_CHAINS.map(chain => (
            <button
              key={chain.chainId}
              onClick={() => switchChain(chain.chainId)}
              className={`p-3 rounded-lg text-left transition-colors ${
                chain.chainId === currentChainId
                  ? 'bg-trinity-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <p className="font-medium text-white">{chain.name}</p>
              <p className="text-xs text-gray-300">
                {chain.nativeCurrency.symbol} • Chain {chain.chainId}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Security</h3>

        {!showMnemonic ? (
          <div>
            <p className="text-gray-400 text-sm mb-4">
              Your recovery phrase is the only way to restore your wallet. Keep it safe and
              never share it with anyone.
            </p>
            <button onClick={handleShowMnemonic} className="btn-danger">
              Show Recovery Phrase
            </button>
          </div>
        ) : (
          <div>
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">
                ⚠️ Never share your recovery phrase. Anyone with these words can steal your
                funds.
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-3 gap-2">
                {mnemonic.split(' ').map((word, index) => (
                  <div
                    key={index}
                    className="bg-gray-800 px-2 py-1 rounded text-sm font-mono"
                  >
                    <span className="text-gray-500 mr-1">{index + 1}.</span>
                    {word}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setShowMnemonic(false);
                setMnemonic('');
              }}
              className="btn-secondary"
            >
              Hide Recovery Phrase
            </button>
          </div>
        )}
      </div>

      {/* Privacy Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Privacy</h3>

        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-white">RPC Rotation</p>
              <p className="text-gray-400 text-sm">Rotate between RPC endpoints</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="text-white">Address Rotation</p>
              <p className="text-gray-400 text-sm">Use fresh addresses for receiving</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="text-white">Hide Balances</p>
              <p className="text-gray-400 text-sm">Show asterisks instead of amounts</p>
            </div>
            <input type="checkbox" className="w-5 h-5 rounded" />
          </label>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">About</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Version</span>
            <span className="text-white">0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Build</span>
            <span className="text-white">Development</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            Trinity Wallet is open source software. Your keys never leave your device.
          </p>
        </div>
      </div>
    </div>
  );
}
