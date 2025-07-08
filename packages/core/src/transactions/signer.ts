/**
 * Transaction signing
 * Signs and broadcasts transactions
 */

import type { ChainProvider } from '../networks/provider';
import type { Keyring } from '../wallet/keyring';
import {
  type LegacyTransaction,
  type EIP1559Transaction,
  type SignedTransaction,
  type TransactionReceipt,
  type TransactionHistoryEntry,
  TransactionStatus,
} from './types';
import { TransactionBuilder } from './builder';

/**
 * Transaction signer and broadcaster
 */
export class TransactionSigner {
  private builder: TransactionBuilder;
  private provider: ChainProvider;
  private keyring: Keyring;

  constructor(provider: ChainProvider, keyring: Keyring) {
    this.provider = provider;
    this.keyring = keyring;
    this.builder = new TransactionBuilder(provider);
  }

  /**
   * Sign a transaction
   *
   * @param tx Transaction to sign
   * @returns Signed transaction
   */
  sign(tx: LegacyTransaction | EIP1559Transaction): SignedTransaction {
    const { serialized, hash } = this.builder.serializeUnsigned(tx);

    const signature = this.keyring.signTransaction(tx.from!, hash, tx.chainId!);

    return this.builder.attachSignature(tx, signature);
  }

  /**
   * Sign and broadcast a transaction
   *
   * @param tx Transaction to sign and send
   * @returns Transaction hash
   */
  async signAndSend(tx: LegacyTransaction | EIP1559Transaction): Promise<string> {
    const signed = this.sign(tx);
    return this.provider.sendRawTransaction(signed.rawTransaction);
  }

  /**
   * Wait for transaction confirmation
   *
   * @param txHash Transaction hash
   * @param confirmations Number of confirmations to wait for
   * @returns Transaction receipt
   */
  async waitForConfirmation(
    txHash: string,
    confirmations: number = 1
  ): Promise<TransactionReceipt | null> {
    const receipt = await this.provider.waitForTransaction(txHash, confirmations);

    if (!receipt) {
      return null;
    }

    return {
      transactionHash: receipt.hash,
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber,
      transactionIndex: receipt.index,
      from: receipt.from,
      to: receipt.to,
      contractAddress: receipt.contractAddress,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.gasPrice,
      cumulativeGasUsed: receipt.cumulativeGasUsed,
      status: receipt.status ?? 1,
      logs: receipt.logs.map(log => ({
        address: log.address,
        topics: [...log.topics],
        data: log.data,
        logIndex: log.index,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
      })),
    };
  }

  /**
   * Sign and send a transaction, wait for confirmation
   *
   * @param tx Transaction to process
   * @param confirmations Number of confirmations
   * @returns Receipt
   */
  async signSendAndWait(
    tx: LegacyTransaction | EIP1559Transaction,
    confirmations: number = 1
  ): Promise<{ hash: string; receipt: TransactionReceipt | null }> {
    const hash = await this.signAndSend(tx);
    const receipt = await this.waitForConfirmation(hash, confirmations);

    return { hash, receipt };
  }

  /**
   * Get transaction builder
   */
  getBuilder(): TransactionBuilder {
    return this.builder;
  }
}

/**
 * Transaction history manager
 */
export class TransactionHistory {
  private history: Map<string, TransactionHistoryEntry> = new Map();
  private addressHistory: Map<string, string[]> = new Map(); // address -> txHashes

  /**
   * Add a pending transaction
   */
  addPending(
    hash: string,
    tx: LegacyTransaction | EIP1559Transaction,
    isOutgoing: boolean
  ): TransactionHistoryEntry {
    const entry: TransactionHistoryEntry = {
      hash,
      chainId: tx.chainId!,
      from: tx.from!,
      to: tx.to ?? null,
      value: tx.value ?? 0n,
      gasLimit: tx.gasLimit!,
      gasPrice: 'gasPrice' in tx ? tx.gasPrice : tx.maxFeePerGas,
      status: TransactionStatus.PENDING,
      timestamp: Date.now(),
      data: tx.data,
      nonce: tx.nonce!,
      type: tx.type,
      isOutgoing,
    };

    this.history.set(hash.toLowerCase(), entry);
    this.addToAddressHistory(tx.from!, hash);

    if (tx.to) {
      this.addToAddressHistory(tx.to, hash);
    }

    return entry;
  }

  /**
   * Update transaction status to confirmed
   */
  confirm(
    hash: string,
    receipt: TransactionReceipt
  ): TransactionHistoryEntry | null {
    const entry = this.history.get(hash.toLowerCase());
    if (!entry) return null;

    entry.status = receipt.status === 1 ? TransactionStatus.CONFIRMED : TransactionStatus.FAILED;
    entry.blockNumber = receipt.blockNumber;
    entry.gasUsed = receipt.gasUsed;

    return entry;
  }

  /**
   * Mark transaction as dropped
   */
  markDropped(hash: string): TransactionHistoryEntry | null {
    const entry = this.history.get(hash.toLowerCase());
    if (!entry) return null;

    entry.status = TransactionStatus.DROPPED;
    return entry;
  }

  /**
   * Get transaction by hash
   */
  get(hash: string): TransactionHistoryEntry | undefined {
    return this.history.get(hash.toLowerCase());
  }

  /**
   * Get all transactions for an address
   */
  getForAddress(address: string): TransactionHistoryEntry[] {
    const hashes = this.addressHistory.get(address.toLowerCase()) ?? [];
    return hashes
      .map(hash => this.history.get(hash))
      .filter((entry): entry is TransactionHistoryEntry => entry !== undefined)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get pending transactions
   */
  getPending(): TransactionHistoryEntry[] {
    return Array.from(this.history.values())
      .filter(entry => entry.status === TransactionStatus.PENDING)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get all transactions
   */
  getAll(): TransactionHistoryEntry[] {
    return Array.from(this.history.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Remove old transactions
   *
   * @param maxAge Maximum age in milliseconds
   */
  prune(maxAge: number): number {
    const cutoff = Date.now() - maxAge;
    let removed = 0;

    for (const [hash, entry] of this.history) {
      if (entry.timestamp < cutoff && entry.status !== TransactionStatus.PENDING) {
        this.history.delete(hash);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Export history for persistence
   */
  export(): TransactionHistoryEntry[] {
    return Array.from(this.history.values()).map(entry => ({
      ...entry,
      value: entry.value.toString() as any,
      gasLimit: entry.gasLimit.toString() as any,
      gasPrice: entry.gasPrice.toString() as any,
      gasUsed: entry.gasUsed?.toString() as any,
      tokenTransfer: entry.tokenTransfer
        ? { ...entry.tokenTransfer, amount: entry.tokenTransfer.amount.toString() as any }
        : undefined,
    }));
  }

  /**
   * Import history from persistence
   */
  import(entries: any[]): void {
    for (const entry of entries) {
      const parsed: TransactionHistoryEntry = {
        ...entry,
        value: BigInt(entry.value),
        gasLimit: BigInt(entry.gasLimit),
        gasPrice: BigInt(entry.gasPrice),
        gasUsed: entry.gasUsed ? BigInt(entry.gasUsed) : undefined,
        tokenTransfer: entry.tokenTransfer
          ? { ...entry.tokenTransfer, amount: BigInt(entry.tokenTransfer.amount) }
          : undefined,
      };

      this.history.set(parsed.hash.toLowerCase(), parsed);
      this.addToAddressHistory(parsed.from, parsed.hash);

      if (parsed.to) {
        this.addToAddressHistory(parsed.to, parsed.hash);
      }
    }
  }

  private addToAddressHistory(address: string, hash: string): void {
    const normalized = address.toLowerCase();
    const hashes = this.addressHistory.get(normalized) ?? [];

    if (!hashes.includes(hash.toLowerCase())) {
      hashes.push(hash.toLowerCase());
      this.addressHistory.set(normalized, hashes);
    }
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history.clear();
    this.addressHistory.clear();
  }
}
