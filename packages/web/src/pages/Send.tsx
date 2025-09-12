import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseEther, isAddress } from 'ethers';
import { useWalletStore } from '../stores/walletStore';
import { formatBalance } from '../utils/format';
import { getNativeCurrencySymbol } from '@trinity/core';

export function Send() {
  const navigate = useNavigate();
  const { currentAccount, balance, currentChainId } = useWalletStore();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'confirm' | 'sending' | 'success'>('input');
  const [txHash, setTxHash] = useState('');

  const symbol = getNativeCurrencySymbol(currentChainId);

  const validateInput = (): boolean => {
    if (!recipient) {
      setError('Please enter a recipient address');
      return false;
    }

    if (!isAddress(recipient)) {
      setError('Invalid recipient address');
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    try {
      const amountWei = parseEther(amount);
      if (amountWei > balance) {
        setError('Insufficient balance');
        return false;
      }
    } catch {
      setError('Invalid amount format');
      return false;
    }

    setError('');
    return true;
  };

  const handleContinue = () => {
    if (validateInput()) {
      setStep('confirm');
    }
  };

  const handleSend = async () => {
    setStep('sending');

    // Simulate transaction (in real implementation, this would use the transaction builder)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Fake tx hash for demo
      setTxHash(
        '0x' +
          Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      );
      setStep('success');
    } catch (err) {
      setError((err as Error).message);
      setStep('input');
    }
  };

  const handleSetMax = () => {
    // Leave some for gas (rough estimate)
    const gasBuffer = parseEther('0.01');
    const maxAmount = balance > gasBuffer ? balance - gasBuffer : 0n;
    setAmount(formatBalance(maxAmount, 18));
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Input Step */}
      {step === 'input' && (
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">Send {symbol}</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Recipient Address</label>
              <input
                type="text"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder="0x..."
                className="input w-full font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm text-gray-400">Amount</label>
                <button
                  onClick={handleSetMax}
                  className="text-sm text-trinity-500 hover:text-trinity-400"
                >
                  Max: {formatBalance(balance)} {symbol}
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="input w-full pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {symbol}
                </span>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button onClick={handleContinue} className="btn-primary w-full py-3">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Confirm Step */}
      {step === 'confirm' && (
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">Confirm Transaction</h2>

          <div className="bg-gray-900 rounded-lg p-4 mb-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">To</span>
              <span className="font-mono text-white text-sm">
                {recipient.slice(0, 10)}...{recipient.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount</span>
              <span className="text-white font-semibold">
                {amount} {symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Network Fee (est.)</span>
              <span className="text-white">~0.001 {symbol}</span>
            </div>
            <hr className="border-gray-700" />
            <div className="flex justify-between">
              <span className="text-gray-400">Total</span>
              <span className="text-white font-semibold">
                ~{(parseFloat(amount) + 0.001).toFixed(6)} {symbol}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('input')} className="btn-secondary flex-1">
              Back
            </button>
            <button onClick={handleSend} className="btn-primary flex-1">
              Send
            </button>
          </div>
        </div>
      )}

      {/* Sending Step */}
      {step === 'sending' && (
        <div className="card text-center">
          <div className="text-6xl mb-4 animate-bounce">⏳</div>
          <h2 className="text-xl font-bold text-white mb-2">Sending...</h2>
          <p className="text-gray-400">Please wait while your transaction is processed</p>
        </div>
      )}

      {/* Success Step */}
      {step === 'success' && (
        <div className="card text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-white mb-2">Transaction Sent!</h2>
          <p className="text-gray-400 mb-4">
            Your transaction has been submitted to the network.
          </p>

          <div className="bg-gray-900 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-400 mb-1">Transaction Hash</p>
            <p className="font-mono text-sm text-white break-all">{txHash}</p>
          </div>

          <button onClick={() => navigate('/')} className="btn-primary w-full">
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
