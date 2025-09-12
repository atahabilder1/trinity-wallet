import { Link, useLocation } from 'react-router-dom';
import { useWalletStore } from '../stores/walletStore';
import { formatAddress } from '../utils/format';
import { CHAINS_BY_ID } from '@trinity/core';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { currentAccount, currentChainId, lock } = useWalletStore();

  const chain = CHAINS_BY_ID[currentChainId];

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/send', label: 'Send', icon: '↗️' },
    { path: '/receive', label: 'Receive', icon: '↙️' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔺</span>
            <h1 className="text-xl font-bold text-white">Trinity Wallet</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Network */}
            <div className="bg-gray-700 px-3 py-1 rounded-full text-sm">
              {chain?.shortName ?? 'Unknown'}
            </div>

            {/* Account */}
            {currentAccount && (
              <div className="bg-gray-700 px-3 py-1 rounded-full text-sm font-mono">
                {formatAddress(currentAccount.address)}
              </div>
            )}

            {/* Lock */}
            <button
              onClick={lock}
              className="text-gray-400 hover:text-white transition-colors"
              title="Lock Wallet"
            >
              🔒
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto flex">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 transition-colors',
                location.pathname === item.path
                  ? 'bg-gray-700 text-white border-b-2 border-trinity-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-4">
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-4 py-3 text-center text-sm text-gray-500">
        Trinity Wallet v0.1.0 - Privacy First
      </footer>
    </div>
  );
}
