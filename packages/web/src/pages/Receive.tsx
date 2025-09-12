import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useWalletStore } from '../stores/walletStore';
import { copyToClipboard } from '../utils/format';
import { CHAINS_BY_ID } from '@trinity/core';

export function Receive() {
  const { currentAccount, currentChainId } = useWalletStore();
  const [copied, setCopied] = useState(false);

  const chain = CHAINS_BY_ID[currentChainId];

  const handleCopy = async () => {
    if (currentAccount) {
      const success = await copyToClipboard(currentAccount.address);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (!currentAccount) {
    return <div>No account selected</div>;
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card text-center">
        <h2 className="text-xl font-bold text-white mb-2">Receive</h2>
        <p className="text-gray-400 text-sm mb-6">
          Scan this QR code or copy the address below to receive {chain?.nativeCurrency.symbol} and
          tokens on {chain?.name}.
        </p>

        {/* QR Code */}
        <div className="bg-white p-4 rounded-xl inline-block mb-6">
          <QRCodeSVG
            value={currentAccount.address}
            size={200}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Address */}
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <p className="font-mono text-sm text-white break-all">{currentAccount.address}</p>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-trinity-600 hover:bg-trinity-700 text-white'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy Address'}
        </button>

        {/* Warning */}
        <div className="mt-6 bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
          <p className="text-yellow-400 text-sm">
            ⚠️ Only send {chain?.nativeCurrency.symbol} and ERC-20 tokens on{' '}
            {chain?.name} to this address. Sending other assets may result in permanent loss.
          </p>
        </div>
      </div>

      {/* Privacy Tip */}
      <div className="card mt-4 bg-gradient-to-r from-trinity-900/50 to-gray-800">
        <h3 className="font-semibold text-white mb-2">🔒 Privacy Tip</h3>
        <p className="text-gray-400 text-sm">
          For enhanced privacy, consider using a fresh address for each transaction. Trinity
          Wallet supports address rotation to help protect your financial privacy.
        </p>
      </div>
    </div>
  );
}
