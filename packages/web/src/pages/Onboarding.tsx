import { useState } from 'react';
import { useWalletStore } from '../stores/walletStore';

type Step = 'welcome' | 'create' | 'import' | 'backup' | 'confirm';

export function Onboarding() {
  const [step, setStep] = useState<Step>('welcome');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);

  const { createWallet, importWallet } = useWalletStore();

  const handleCreate = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const newMnemonic = await createWallet(password);
      setMnemonic(newMnemonic);
      setStep('backup');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
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

    if (!importMnemonic.trim()) {
      setError('Please enter your recovery phrase');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await importWallet(importMnemonic.trim(), password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackupConfirm = () => {
    if (backupConfirmed) {
      setStep('confirm');
    } else {
      setError('Please confirm you have saved your recovery phrase');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Welcome */}
        {step === 'welcome' && (
          <div className="card text-center">
            <div className="text-6xl mb-4">🔺</div>
            <h1 className="text-2xl font-bold text-white mb-2">Trinity Wallet</h1>
            <p className="text-gray-400 mb-8">Privacy-First Blockchain Wallet</p>

            <div className="space-y-3">
              <button
                onClick={() => setStep('create')}
                className="btn-primary w-full py-3"
              >
                Create New Wallet
              </button>

              <button
                onClick={() => setStep('import')}
                className="btn-secondary w-full py-3"
              >
                Import Existing Wallet
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              Your keys, your coins. Fully non-custodial.
            </p>
          </div>
        )}

        {/* Create */}
        {step === 'create' && (
          <div className="card">
            <button
              onClick={() => setStep('welcome')}
              className="text-gray-400 hover:text-white mb-4"
            >
              ← Back
            </button>

            <h2 className="text-xl font-bold text-white mb-4">Create New Wallet</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password (min 8 characters)"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="input w-full"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? 'Creating...' : 'Create Wallet'}
              </button>
            </div>
          </div>
        )}

        {/* Import */}
        {step === 'import' && (
          <div className="card">
            <button
              onClick={() => setStep('welcome')}
              className="text-gray-400 hover:text-white mb-4"
            >
              ← Back
            </button>

            <h2 className="text-xl font-bold text-white mb-4">Import Wallet</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Recovery Phrase
                </label>
                <textarea
                  value={importMnemonic}
                  onChange={e => setImportMnemonic(e.target.value)}
                  placeholder="Enter your 12 or 24 word recovery phrase"
                  rows={3}
                  className="input w-full resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="input w-full"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                onClick={handleImport}
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? 'Importing...' : 'Import Wallet'}
              </button>
            </div>
          </div>
        )}

        {/* Backup */}
        {step === 'backup' && (
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">
              ⚠️ Backup Your Recovery Phrase
            </h2>

            <p className="text-gray-400 text-sm mb-4">
              Write down these 12 words in order and keep them safe. This is the ONLY
              way to recover your wallet if you lose access.
            </p>

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

            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">
                ⚠️ Never share your recovery phrase. Anyone with these words can
                steal your funds.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-400 mb-4">
              <input
                type="checkbox"
                checked={backupConfirmed}
                onChange={e => setBackupConfirmed(e.target.checked)}
                className="rounded"
              />
              I have saved my recovery phrase securely
            </label>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <button
              onClick={handleBackupConfirm}
              className="btn-primary w-full py-3"
            >
              Continue
            </button>
          </div>
        )}

        {/* Confirm - wallet is ready */}
        {step === 'confirm' && (
          <div className="card text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-white mb-2">Wallet Created!</h2>
            <p className="text-gray-400 mb-6">
              Your wallet is ready to use. You can now send and receive crypto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
