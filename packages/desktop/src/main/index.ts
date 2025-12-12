import { app, BrowserWindow, ipcMain, shell, nativeTheme } from 'electron';
import { join } from 'path';
import Store from 'electron-store';

// Initialize secure storage
const store = new Store({
  encryptionKey: 'trinity-wallet-encryption-key',
  name: 'trinity-vault',
});

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#111827',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Set dark theme
  nativeTheme.themeSource = 'dark';

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent navigation away from app
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event) => {
    event.preventDefault();
  });
});

// IPC Handlers for wallet operations
ipcMain.handle('store:get', (_, key: string) => {
  return store.get(key);
});

ipcMain.handle('store:set', (_, key: string, value: unknown) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('store:delete', (_, key: string) => {
  store.delete(key);
  return true;
});

ipcMain.handle('store:has', (_, key: string) => {
  return store.has(key);
});

ipcMain.handle('store:clear', () => {
  store.clear();
  return true;
});

// Wallet state handlers
ipcMain.handle('wallet:getState', () => {
  const hasVault = store.has('vault');
  const isUnlocked = store.get('isUnlocked', false);
  const accounts = store.get('accounts', []);
  const currentAccount = store.get('currentAccount', null);
  const chainId = store.get('chainId', '0x1');

  return {
    isInitialized: hasVault,
    isUnlocked,
    accounts,
    currentAccount,
    chainId,
  };
});

ipcMain.handle('wallet:lock', () => {
  store.set('isUnlocked', false);
  return true;
});

// App info
ipcMain.handle('app:getInfo', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
  };
});
