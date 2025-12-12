import { contextBridge, ipcRenderer } from 'electron';

// Expose protected APIs to renderer
contextBridge.exposeInMainWorld('electron', {
  // Store operations
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
    has: (key: string) => ipcRenderer.invoke('store:has', key),
    clear: () => ipcRenderer.invoke('store:clear'),
  },

  // Wallet operations
  wallet: {
    getState: () => ipcRenderer.invoke('wallet:getState'),
    lock: () => ipcRenderer.invoke('wallet:lock'),
  },

  // App info
  app: {
    getInfo: () => ipcRenderer.invoke('app:getInfo'),
  },

  // Platform info
  platform: process.platform,
});

// Type definitions for renderer
declare global {
  interface Window {
    electron: {
      store: {
        get: (key: string) => Promise<unknown>;
        set: (key: string, value: unknown) => Promise<boolean>;
        delete: (key: string) => Promise<boolean>;
        has: (key: string) => Promise<boolean>;
        clear: () => Promise<boolean>;
      };
      wallet: {
        getState: () => Promise<{
          isInitialized: boolean;
          isUnlocked: boolean;
          accounts: string[];
          currentAccount: { name: string; address: string } | null;
          chainId: string;
        }>;
        lock: () => Promise<boolean>;
      };
      app: {
        getInfo: () => Promise<{
          version: string;
          platform: string;
          arch: string;
        }>;
      };
      platform: string;
    };
  }
}
