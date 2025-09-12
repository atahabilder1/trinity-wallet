import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWalletStore } from '../stores/walletStore';
import { formatBalance, formatAddress, copyToClipboard } from '../utils/format';
import { CHAINS_BY_ID, getNativeCurrencySymbol } from '@trinity/core';

export function Dashboard() {
  const {
    currentAccount,
    balance,
    balanceLoading,
    currentChainId,
    refreshBalance,
  } = useWalletStore();

  useEffect(() => {
    refreshBalance();
    // Refresh every 30 seconds
    const interval = setInterval(refreshBalance, 30000);
    return () => clearInterval(interval);
  }, [refreshBalance, currentAccount]);

  const chain = CHAINS_BY_ID[currentChainId];
  const symbol = getNativeCurrencySymbol(currentChainId);

  const handleCopyAddress = async () => {
    if (currentAccount) {
      const success = await copyToClipboard(currentAccount.address);
      if (success) {
        // Could show a toast here
        alert('Address copied!');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="card text-center">
        <p className="text-gray-400 text-sm mb-2">Total Balance</p>
        <div className="text-4xl font-bold text-white mb-1">
          {balanceLoading ? (
            <span className="animate-pulse">...</span>
          ) : (
            `${formatBalance(balance)} ${symbol}`
          )}
        </div>
        <p className="text-gray-500 text-sm">on {chain?.name ?? 'Unknown Network'}</p>
      </div>

      {/* Address Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Your Address</span>
          <button
            onClick={handleCopyAddress}
            className="text-trinity-500 hover:text-trinity-400 text-sm"
          >
            Copy
          </button>
        </div>
        <p className="font-mono text-white break-all">{currentAccount?.address}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/send" className="card text-center hover:bg-gray-700 transition-colors">
          <div className="text-3xl mb-2">↗️</div>
          <p className="font-medium text-white">Send</p>
          <p className="text-gray-400 text-sm">Transfer funds</p>
        </Link>

        <Link
          to="/receive"
          className="card text-center hover:bg-gray-700 transition-colors"
        >
          <div className="text-3xl mb-2">↙️</div>
          <p className="font-medium text-white">Receive</p>
          <p className="text-gray-400 text-sm">Get your address</p>
        </Link>
      </div>

      {/* Account Info */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-3">Account</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Name</span>
            <span className="text-white">{currentAccount?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Type</span>
            <span className="text-white capitalize">{currentAccount?.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Address</span>
            <span className="font-mono text-white">
              {currentAccount && formatAddress(currentAccount.address)}
            </span>
          </div>
        </div>
      </div>

      {/* Network Info */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-3">Network</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Name</span>
            <span className="text-white">{chain?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Chain ID</span>
            <span className="text-white">{currentChainId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Currency</span>
            <span className="text-white">{symbol}</span>
          </div>
        </div>
      </div>

      {/* Privacy Status */}
      <div className="card bg-gradient-to-r from-trinity-900/50 to-gray-800">
        <h3 className="text-lg font-semibold text-white mb-2">🔒 Privacy Status</h3>
        <p className="text-gray-400 text-sm mb-3">
          Trinity Wallet protects your privacy with multiple layers of security.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded text-xs">
            ✓ Zero Telemetry
          </span>
          <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded text-xs">
            ✓ Local Storage Only
          </span>
          <span className="bg-yellow-900/50 text-yellow-400 px-2 py-1 rounded text-xs">
            ○ RPC Rotation Available
          </span>
        </div>
      </div>
    </div>
  );
}
