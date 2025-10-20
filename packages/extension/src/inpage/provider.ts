/**
 * Trinity Wallet Injected Provider
 * EIP-1193 compliant Ethereum provider
 */

import { EventEmitter } from './events';

export interface RequestArguments {
  method: string;
  params?: unknown[];
}

export interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

// EIP-1193 Provider
class TrinityProvider extends EventEmitter {
  public isTrinity = true;
  public isMetaMask = true; // For compatibility
  public selectedAddress: string | null = null;
  public chainId: string | null = null;
  public networkVersion: string | null = null;
  public isConnected: boolean = false;

  private requestId = 0;
  private pendingRequests: Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  > = new Map();

  constructor() {
    super();
    this.setupMessageListener();
    this.initialize();
  }

  private async initialize() {
    try {
      // Get initial state from extension
      const state = await this.request({ method: 'trinity_getState' });
      if (state) {
        const { chainId, accounts } = state as { chainId: string; accounts: string[] };
        this.chainId = chainId;
        this.networkVersion = parseInt(chainId, 16).toString();
        this.selectedAddress = accounts[0] || null;
        this.isConnected = true;
      }
    } catch {
      // Extension not ready
    }
  }

  private setupMessageListener() {
    window.addEventListener('message', event => {
      if (event.source !== window) return;
      if (event.data?.target !== 'trinity-inpage') return;

      const { type, payload } = event.data;

      switch (type) {
        case 'response':
          this.handleResponse(payload);
          break;
        case 'event':
          this.handleEvent(payload);
          break;
      }
    });
  }

  private handleResponse(payload: {
    id: number;
    result?: unknown;
    error?: { code: number; message: string; data?: unknown };
  }) {
    const pending = this.pendingRequests.get(payload.id);
    if (!pending) return;

    this.pendingRequests.delete(payload.id);

    if (payload.error) {
      const error = new Error(payload.error.message) as ProviderRpcError;
      error.code = payload.error.code;
      error.data = payload.error.data;
      pending.reject(error);
    } else {
      pending.resolve(payload.result);
    }
  }

  private handleEvent(payload: { event: string; data: unknown }) {
    const { event, data } = payload;

    switch (event) {
      case 'connect':
        this.isConnected = true;
        this.emit('connect', { chainId: (data as { chainId: string }).chainId });
        break;

      case 'disconnect':
        this.isConnected = false;
        this.selectedAddress = null;
        this.emit('disconnect', data);
        break;

      case 'chainChanged':
        this.chainId = (data as { chainId: string }).chainId;
        this.networkVersion = parseInt(this.chainId, 16).toString();
        this.emit('chainChanged', this.chainId);
        break;

      case 'accountsChanged':
        const accounts = data as string[];
        this.selectedAddress = accounts[0] || null;
        this.emit('accountsChanged', accounts);
        break;

      case 'message':
        this.emit('message', data);
        break;
    }
  }

  async request(args: RequestArguments): Promise<unknown> {
    const { method, params } = args;

    // Handle some methods locally for speed
    switch (method) {
      case 'eth_chainId':
        return this.chainId;

      case 'eth_accounts':
        return this.selectedAddress ? [this.selectedAddress] : [];

      case 'net_version':
        return this.networkVersion;
    }

    // Send to extension
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;

      this.pendingRequests.set(id, { resolve, reject });

      window.postMessage(
        {
          target: 'trinity-content',
          type: 'request',
          payload: { id, method, params },
        },
        '*'
      );

      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timed out'));
        }
      }, 60000);
    });
  }

  // Legacy methods for compatibility
  async enable(): Promise<string[]> {
    return this.request({ method: 'eth_requestAccounts' }) as Promise<string[]>;
  }

  async send(method: string, params?: unknown[]): Promise<unknown> {
    return this.request({ method, params });
  }

  sendAsync(
    payload: { method: string; params?: unknown[] },
    callback: (error: Error | null, result?: unknown) => void
  ): void {
    this.request(payload)
      .then(result => callback(null, { result }))
      .catch(error => callback(error));
  }

  // Connection check
  isConnected(): boolean {
    return this.isConnected;
  }
}

export { TrinityProvider };
