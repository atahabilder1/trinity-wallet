/**
 * Background Service Worker
 * Handles wallet operations and RPC requests
 */

import { WalletController } from './controller';

// Initialize wallet controller
const controller = new WalletController();

// Handle RPC requests from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'rpc') {
    handleRpcRequest(message.payload, sender)
      .then(result => sendResponse({ result }))
      .catch(error => sendResponse({ error: { code: -32603, message: error.message } }));

    // Keep channel open for async response
    return true;
  }

  if (message.type === 'popup') {
    handlePopupMessage(message.payload)
      .then(result => sendResponse({ result }))
      .catch(error => sendResponse({ error: error.message }));

    return true;
  }
});

// Handle RPC requests
async function handleRpcRequest(
  payload: { id: number; method: string; params?: unknown[]; origin: string },
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  const { method, params, origin } = payload;

  switch (method) {
    // Connection
    case 'eth_requestAccounts':
      return controller.requestAccounts(origin);

    case 'eth_accounts':
      return controller.getAccounts(origin);

    // Chain
    case 'eth_chainId':
      return controller.getChainId();

    case 'net_version':
      return controller.getNetworkVersion();

    case 'wallet_switchEthereumChain':
      return controller.switchChain(params?.[0] as { chainId: string });

    case 'wallet_addEthereumChain':
      return controller.addChain(params?.[0]);

    // Transactions
    case 'eth_sendTransaction':
      return controller.sendTransaction(params?.[0], origin);

    case 'eth_getTransactionReceipt':
      return controller.getTransactionReceipt(params?.[0] as string);

    // Signing
    case 'personal_sign':
      return controller.personalSign(params?.[0] as string, params?.[1] as string, origin);

    case 'eth_sign':
      return controller.ethSign(params?.[0] as string, params?.[1] as string, origin);

    case 'eth_signTypedData':
    case 'eth_signTypedData_v3':
    case 'eth_signTypedData_v4':
      return controller.signTypedData(
        params?.[0] as string,
        params?.[1] as string | object,
        origin
      );

    // Balance & Nonce
    case 'eth_getBalance':
      return controller.getBalance(params?.[0] as string, params?.[1] as string);

    case 'eth_getTransactionCount':
      return controller.getTransactionCount(params?.[0] as string, params?.[1] as string);

    // Gas
    case 'eth_gasPrice':
      return controller.getGasPrice();

    case 'eth_estimateGas':
      return controller.estimateGas(params?.[0]);

    // Block
    case 'eth_blockNumber':
      return controller.getBlockNumber();

    case 'eth_getBlockByNumber':
      return controller.getBlockByNumber(params?.[0] as string, params?.[1] as boolean);

    // Call
    case 'eth_call':
      return controller.call(params?.[0], params?.[1] as string);

    // Trinity specific
    case 'trinity_getState':
      return controller.getState();

    default:
      throw new Error(`Method ${method} not supported`);
  }
}

// Handle popup messages
async function handlePopupMessage(payload: { action: string; data?: unknown }): Promise<unknown> {
  const { action, data } = payload;

  switch (action) {
    case 'getState':
      return controller.getState();

    case 'unlock':
      return controller.unlock(data as string);

    case 'lock':
      return controller.lock();

    case 'createWallet':
      return controller.createWallet((data as { password: string }).password);

    case 'importWallet':
      const { mnemonic, password } = data as { mnemonic: string; password: string };
      return controller.importWallet(mnemonic, password);

    case 'getAccounts':
      return controller.getAllAccounts();

    case 'addAccount':
      return controller.addAccount((data as { name?: string })?.name);

    case 'switchAccount':
      return controller.switchAccount((data as { id: string }).id);

    case 'switchChain':
      return controller.switchChain({ chainId: (data as { chainId: string }).chainId });

    case 'getBalance':
      return controller.getCurrentBalance();

    case 'approveRequest':
      return controller.approveRequest((data as { requestId: string }).requestId);

    case 'rejectRequest':
      return controller.rejectRequest((data as { requestId: string }).requestId);

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// Notify tabs of events
export function notifyTabs(event: string, data: unknown) {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'event',
          payload: { event, data },
        }).catch(() => {
          // Tab might not have content script
        });
      }
    });
  });
}

// Extension installed
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    // Open onboarding page
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html#/onboarding'),
    });
  }
});

console.log('🔺 Trinity Wallet Background Service Worker Started');
