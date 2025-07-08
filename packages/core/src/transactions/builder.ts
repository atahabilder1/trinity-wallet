/**
 * Transaction builder
 * Constructs and prepares transactions for signing
 */

import { Transaction, parseEther, formatEther, hexlify, toBeArray } from 'ethers';
import type { ChainProvider } from '../networks/provider';
import {
  TransactionType,
  type TransactionRequest,
  type LegacyTransaction,
  type EIP1559Transaction,
  type SignedTransaction,
  type SendTransactionOptions,
} from './types';
import { estimateGas, getGasPriceForSpeed } from './gas';
import { checksumAddress } from '../crypto/hashing';

/**
 * Transaction builder class
 */
export class TransactionBuilder {
  private provider: ChainProvider;

  constructor(provider: ChainProvider) {
    this.provider = provider;
  }

  /**
   * Build a simple ETH transfer transaction
   *
   * @param from Sender address
   * @param to Recipient address
   * @param value Amount in wei
   * @param options Transaction options
   * @returns Prepared transaction
   */
  async buildTransfer(
    from: string,
    to: string,
    value: bigint,
    options: SendTransactionOptions = {}
  ): Promise<LegacyTransaction | EIP1559Transaction> {
    const tx: TransactionRequest = {
      from: checksumAddress(from),
      to: checksumAddress(to),
      value,
      data: '0x',
    };

    return this.buildTransaction(tx, options);
  }

  /**
   * Build a contract call transaction
   *
   * @param from Sender address
   * @param to Contract address
   * @param data Encoded function call
   * @param value Optional value to send
   * @param options Transaction options
   * @returns Prepared transaction
   */
  async buildContractCall(
    from: string,
    to: string,
    data: string,
    value: bigint = 0n,
    options: SendTransactionOptions = {}
  ): Promise<LegacyTransaction | EIP1559Transaction> {
    const tx: TransactionRequest = {
      from: checksumAddress(from),
      to: checksumAddress(to),
      value,
      data,
    };

    return this.buildTransaction(tx, options);
  }

  /**
   * Build a contract deployment transaction
   *
   * @param from Deployer address
   * @param bytecode Contract bytecode
   * @param value Optional value to send
   * @param options Transaction options
   * @returns Prepared transaction
   */
  async buildContractDeploy(
    from: string,
    bytecode: string,
    value: bigint = 0n,
    options: SendTransactionOptions = {}
  ): Promise<LegacyTransaction | EIP1559Transaction> {
    const tx: TransactionRequest = {
      from: checksumAddress(from),
      to: undefined, // No 'to' for contract creation
      value,
      data: bytecode,
    };

    return this.buildTransaction(tx, options);
  }

  /**
   * Build a transaction with full parameters
   *
   * @param tx Transaction request
   * @param options Transaction options
   * @returns Prepared transaction
   */
  async buildTransaction(
    tx: TransactionRequest,
    options: SendTransactionOptions = {}
  ): Promise<LegacyTransaction | EIP1559Transaction> {
    const chainConfig = this.provider.getChainConfig();
    const speed = options.speed ?? 'standard';

    // Get nonce
    const nonce = options.nonce ?? (await this.provider.getTransactionCount(tx.from!));

    // Estimate gas
    const estimation = await estimateGas(this.provider, tx);
    const gasLimit = options.gasLimit ?? estimation.gasLimit;

    // Determine transaction type and gas parameters
    if (chainConfig.supportsEip1559) {
      const gasParams = getGasPriceForSpeed(estimation, speed);

      const eip1559Tx: EIP1559Transaction = {
        type: TransactionType.EIP1559,
        from: tx.from,
        to: tx.to,
        value: tx.value ?? 0n,
        data: tx.data ?? '0x',
        nonce,
        gasLimit,
        chainId: chainConfig.chainId,
        maxFeePerGas: options.maxFeePerGas ?? gasParams.maxFeePerGas!,
        maxPriorityFeePerGas: options.maxPriorityFeePerGas ?? gasParams.maxPriorityFeePerGas!,
      };

      return eip1559Tx;
    } else {
      const gasParams = getGasPriceForSpeed(estimation, speed);

      const legacyTx: LegacyTransaction = {
        type: TransactionType.LEGACY,
        from: tx.from,
        to: tx.to,
        value: tx.value ?? 0n,
        data: tx.data ?? '0x',
        nonce,
        gasLimit,
        chainId: chainConfig.chainId,
        gasPrice: options.gasPrice ?? gasParams.gasPrice,
      };

      return legacyTx;
    }
  }

  /**
   * Build a speed-up transaction (replace pending tx with higher gas)
   *
   * @param originalTx Original transaction
   * @param newGasPrice New gas price (should be at least 10% higher)
   * @returns Speed-up transaction
   */
  buildSpeedUp(
    originalTx: LegacyTransaction | EIP1559Transaction,
    newGasPrice?: bigint,
    newMaxFeePerGas?: bigint,
    newMaxPriorityFeePerGas?: bigint
  ): LegacyTransaction | EIP1559Transaction {
    if (originalTx.type === TransactionType.EIP1559) {
      const eip1559Tx = originalTx as EIP1559Transaction;
      const minIncrease = (eip1559Tx.maxFeePerGas * 10n) / 100n;

      return {
        ...eip1559Tx,
        maxFeePerGas: newMaxFeePerGas ?? eip1559Tx.maxFeePerGas + minIncrease,
        maxPriorityFeePerGas:
          newMaxPriorityFeePerGas ?? eip1559Tx.maxPriorityFeePerGas + minIncrease,
      };
    } else {
      const legacyTx = originalTx as LegacyTransaction;
      const minIncrease = (legacyTx.gasPrice * 10n) / 100n;

      return {
        ...legacyTx,
        gasPrice: newGasPrice ?? legacyTx.gasPrice + minIncrease,
      };
    }
  }

  /**
   * Build a cancel transaction (send 0 to self with same nonce)
   *
   * @param from Address to cancel from
   * @param nonce Nonce of transaction to cancel
   * @param gasPrice Higher gas price for cancel
   * @returns Cancel transaction
   */
  async buildCancel(
    from: string,
    nonce: number,
    gasPrice?: bigint,
    maxFeePerGas?: bigint,
    maxPriorityFeePerGas?: bigint
  ): Promise<LegacyTransaction | EIP1559Transaction> {
    const chainConfig = this.provider.getChainConfig();

    // Get current gas prices
    const feeEstimate = await this.provider.getFeeEstimate();

    if (chainConfig.supportsEip1559) {
      const baseFee = feeEstimate.fast.baseFee ?? feeEstimate.fast.gasPrice;
      const priorityFee = feeEstimate.fast.maxPriorityFee ?? (baseFee * 20n) / 100n;

      return {
        type: TransactionType.EIP1559,
        from: checksumAddress(from),
        to: checksumAddress(from), // Send to self
        value: 0n,
        data: '0x',
        nonce,
        gasLimit: 21000n, // Minimum gas for transfer
        chainId: chainConfig.chainId,
        maxFeePerGas: maxFeePerGas ?? baseFee + priorityFee,
        maxPriorityFeePerGas: maxPriorityFeePerGas ?? priorityFee,
      };
    } else {
      return {
        type: TransactionType.LEGACY,
        from: checksumAddress(from),
        to: checksumAddress(from),
        value: 0n,
        data: '0x',
        nonce,
        gasLimit: 21000n,
        chainId: chainConfig.chainId,
        gasPrice: gasPrice ?? (feeEstimate.fast.gasPrice * 120n) / 100n,
      };
    }
  }

  /**
   * Serialize transaction for signing
   *
   * @param tx Transaction to serialize
   * @returns Unsigned transaction hash for signing
   */
  serializeUnsigned(tx: LegacyTransaction | EIP1559Transaction): {
    serialized: string;
    hash: Uint8Array;
  } {
    const ethersTransaction = Transaction.from({
      type: tx.type,
      to: tx.to,
      nonce: tx.nonce,
      gasLimit: tx.gasLimit,
      data: tx.data,
      value: tx.value,
      chainId: tx.chainId,
      ...(tx.type === TransactionType.EIP1559
        ? {
            maxFeePerGas: (tx as EIP1559Transaction).maxFeePerGas,
            maxPriorityFeePerGas: (tx as EIP1559Transaction).maxPriorityFeePerGas,
          }
        : {
            gasPrice: (tx as LegacyTransaction).gasPrice,
          }),
    });

    const unsignedSerialized = ethersTransaction.unsignedSerialized;
    const hash = ethersTransaction.unsignedHash;

    return {
      serialized: unsignedSerialized,
      hash: toBeArray(hash),
    };
  }

  /**
   * Attach signature to transaction
   *
   * @param tx Transaction
   * @param signature Signature { r, s, v }
   * @returns Signed transaction
   */
  attachSignature(
    tx: LegacyTransaction | EIP1559Transaction,
    signature: { r: string; s: string; v: number }
  ): SignedTransaction {
    const ethersTransaction = Transaction.from({
      type: tx.type,
      to: tx.to,
      nonce: tx.nonce,
      gasLimit: tx.gasLimit,
      data: tx.data,
      value: tx.value,
      chainId: tx.chainId,
      ...(tx.type === TransactionType.EIP1559
        ? {
            maxFeePerGas: (tx as EIP1559Transaction).maxFeePerGas,
            maxPriorityFeePerGas: (tx as EIP1559Transaction).maxPriorityFeePerGas,
          }
        : {
            gasPrice: (tx as LegacyTransaction).gasPrice,
          }),
      signature: {
        r: '0x' + signature.r,
        s: '0x' + signature.s,
        v: signature.v,
      },
    });

    return {
      rawTransaction: ethersTransaction.serialized,
      hash: ethersTransaction.hash!,
      r: signature.r,
      s: signature.s,
      v: signature.v,
    };
  }
}

/**
 * Parse ether string to wei
 */
export function parseEth(value: string): bigint {
  return parseEther(value);
}

/**
 * Format wei to ether string
 */
export function formatEth(value: bigint): string {
  return formatEther(value);
}
