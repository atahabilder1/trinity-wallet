import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useWalletStore } from './stores/walletStore';
import { Onboarding } from './pages/Onboarding';
import { Unlock } from './pages/Unlock';
import { Dashboard } from './pages/Dashboard';
import { Send } from './pages/Send';
import { Receive } from './pages/Receive';
import { Settings } from './pages/Settings';
import { Layout } from './components/Layout';

function App() {
  const { isInitialized, isUnlocked, initialize } = useWalletStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Not initialized - show onboarding
  if (!isInitialized) {
    return <Onboarding />;
  }

  // Initialized but locked - show unlock
  if (!isUnlocked) {
    return <Unlock />;
  }

  // Unlocked - show main app
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/send" element={<Send />} />
        <Route path="/receive" element={<Receive />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
