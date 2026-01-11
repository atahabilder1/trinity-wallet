/**
 * Shield/Unshield Operations
 *
 * Handles moving assets between public and private (shielded) state
 */

import { Contract, Wallet as EthersWallet, parseUnits } from 'ethers';
import { sha256Hex } from '../crypto/hashing';
import { getRandomBytes, bytesToHex } from '../crypto/random';
import type {
  ShieldRequest,
  UnshieldRequest,
  ShieldTransaction,
  UnshieldTransaction,
  TransactionReceipt,
  UTXO,
} from './types';
import { RailgunClient } from './client';
import { RailgunWalletManager } from './wallet';

// ERC20 ABI for approvals
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// Railgun Shield ABI (simplified)
const SHIELD_ABI = [
  'function shield(address token, uint256 amount, bytes32 commitment, bytes encryptedNote) external payable',
  'function unshield(uint256[] proof, bytes32 merkleRoot, bytes32 nullifier, address token, uint256 amount, address recipient) external',
];

/**
 * Shield Manager for moving assets in/out of privacy pool
 */
export class ShieldManager {
  private client: RailgunClient;
  private walletManager: RailgunWalletManager;

  constructor(client: RailgunClient, walletManager: RailgunWalletManager) {
    this.client = client;
    this.walletManager = walletManager;
  }

  /**
   * Shield tokens (move from public to private)
   */
  async shield(
    walletId: string,
    request: ShieldRequest,
    signer: EthersWallet
  ): Promise<TransactionReceipt> {
    const wallet = this.walletManager.getWallet(walletId);
    if (!wallet) {
      throw new Error('Railgun wallet not found');
    }

    const contracts = this.client.getContractAddresses();
    const recipientAddress = request.recipientRailgunAddress || wallet.railgunAddress;

    // Check if ERC20 and needs approval
    if (request.tokenAddress !== 'native') {
      await this.ensureApproval(
        request.tokenAddress,
        contracts.proxy,
        request.amount,
        signer
      );
    }

    // Create commitment for the shielded output
    const blinding = bytesToHex(getRandomBytes(32));
    const commitment = sha256Hex(
      recipientAddress + request.tokenAddress + request.amount + blinding
    );

    // Encrypt note data for recipient
    const encryptedNote = await this.encryptShieldNote(
      request.tokenAddress,
      request.amount,
      blinding,
      recipientAddress
    );

    // Execute shield transaction
    const shieldContract = new Contract(contracts.proxy, SHIELD_ABI, signer);

    try {
      const value = request.tokenAddress === 'native' ? BigInt(request.amount) : 0n;

      const tx = await shieldContract.shield(
        request.tokenAddress === 'native'
          ? '0x0000000000000000000000000000000000000000'
          : request.tokenAddress,
        request.amount,
        '0x' + commitment,
        encryptedNote,
        { value }
      );

      const receipt = await tx.wait();

      // Add UTXO to wallet
      if (receipt.status === 1) {
        const utxo: UTXO = {
          commitment,
          nullifier: sha256Hex(commitment + wallet.spendingKey),
          amount: request.amount,
          tokenAddress: request.tokenAddress,
          tree: 0, // Would be determined from event
          position: 0, // Would be determined from event
        };
        this.walletManager.addUTXO(walletId, utxo);
      }

      return {
        hash: tx.hash,
        status: receipt.status === 1 ? 'success' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.gasPrice?.toString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Shield failed: ${message}`);
    }
  }

  /**
   * Unshield tokens (move from private to public)
   */
  async unshield(
    walletId: string,
    request: UnshieldRequest,
    signer: EthersWallet
  ): Promise<TransactionReceipt> {
    const wallet = this.walletManager.getWallet(walletId);
    if (!wallet) {
      throw new Error('Railgun wallet not found');
    }

    // Get UTXOs to spend
    const utxos = this.walletManager.getUTXOs(walletId, request.tokenAddress);
    const { inputUtxos, totalAmount } = this.selectUTXOsForAmount(
      utxos,
      BigInt(request.amount)
    );

    if (inputUtxos.length === 0) {
      throw new Error('Insufficient shielded balance');
    }

    // Generate nullifiers
    const nullifiers = inputUtxos.map(utxo =>
      sha256Hex(utxo.commitment + wallet.spendingKey)
    );

    // Generate proof
    const proof = await this.generateUnshieldProof(
      inputUtxos,
      nullifiers,
      request.amount,
      request.recipientAddress,
      wallet
    );

    const contracts = this.client.getContractAddresses();
    const unshieldContract = new Contract(contracts.proxy, SHIELD_ABI, signer);

    try {
      const merkleRoot = await this.client.getMerkleRoot();

      const tx = await unshieldContract.unshield(
        proof,
        merkleRoot,
        '0x' + nullifiers[0],
        request.tokenAddress,
        request.amount,
        request.recipientAddress
      );

      const receipt = await tx.wait();

      // Mark UTXOs as spent
      if (receipt.status === 1) {
        this.walletManager.markUTXOsSpent(walletId, nullifiers);
      }

      return {
        hash: tx.hash,
        status: receipt.status === 1 ? 'success' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.gasPrice?.toString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Unshield failed: ${message}`);
    }
  }

  /**
   * Estimate shield gas cost
   */
  async estimateShieldGas(tokenAddress: string): Promise<bigint> {
    // Shield transactions typically cost 200k-400k gas
    // Native token shields are cheaper
    if (tokenAddress === 'native') {
      return 200000n;
    }
    return 300000n; // Includes ERC20 transfer
  }

  /**
   * Estimate unshield gas cost
   */
  async estimateUnshieldGas(inputCount: number): Promise<bigint> {
    // Base gas + per UTXO
    return 250000n + BigInt(inputCount) * 50000n;
  }

  /**
   * Check if token needs approval and approve if necessary
   */
  private async ensureApproval(
    tokenAddress: string,
    spender: string,
    amount: string,
    signer: EthersWallet
  ): Promise<void> {
    const token = new Contract(tokenAddress, ERC20_ABI, signer);
    const currentAllowance = await token.allowance(await signer.getAddress(), spender);

    if (currentAllowance < BigInt(amount)) {
      // Approve max amount
      const tx = await token.approve(
        spender,
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      );
      await tx.wait();
    }
  }

  /**
   * Select UTXOs for a target amount
   */
  private selectUTXOsForAmount(
    utxos: UTXO[],
    targetAmount: bigint
  ): { inputUtxos: UTXO[]; totalAmount: bigint } {
    const sorted = [...utxos].sort((a, b) =>
      Number(BigInt(b.amount) - BigInt(a.amount))
    );

    const selected: UTXO[] = [];
    let total = 0n;

    for (const utxo of sorted) {
      if (total >= targetAmount) break;
      selected.push(utxo);
      total += BigInt(utxo.amount);
    }

    if (total < targetAmount) {
      return { inputUtxos: [], totalAmount: 0n };
    }

    return { inputUtxos: selected, totalAmount: total };
  }

  /**
   * Encrypt shield note for recipient
   */
  private async encryptShieldNote(
    tokenAddress: string,
    amount: string,
    blinding: string,
    recipientAddress: string
  ): Promise<string> {
    const noteData = {
      token: tokenAddress,
      amount,
      blinding,
      recipient: recipientAddress,
      timestamp: Date.now(),
    };

    // In production, encrypt with recipient's viewing key
    return '0x' + Buffer.from(JSON.stringify(noteData)).toString('hex');
  }

  /**
   * Generate unshield proof
   */
  private async generateUnshieldProof(
    inputUtxos: UTXO[],
    nullifiers: string[],
    amount: string,
    recipient: string,
    wallet: { viewingKey: string; spendingKey: string }
  ): Promise<string[]> {
    // In production, generate actual ZK proof
    const proof: string[] = [];
    for (let i = 0; i < 8; i++) {
      proof.push('0x' + bytesToHex(getRandomBytes(32)));
    }
    return proof;
  }
}

/**
 * Create a shield manager
 */
export function createShieldManager(
  client: RailgunClient,
  walletManager: RailgunWalletManager
): ShieldManager {
  return new ShieldManager(client, walletManager);
}

/**
 * Get shielded token balance summary
 */
export async function getShieldedBalanceSummary(
  walletManager: RailgunWalletManager,
  walletId: string
): Promise<{
  totalTokens: number;
  totalValueUsd: number;
  tokens: Array<{
    address: string;
    symbol: string;
    balance: string;
    valueUsd: number;
  }>;
}> {
  const balances = await walletManager.getShieldedBalances(walletId);

  return {
    totalTokens: balances.length,
    totalValueUsd: 0, // Would need price service
    tokens: balances.map(b => ({
      address: b.tokenAddress,
      symbol: b.symbol,
      balance: b.balanceFormatted,
      valueUsd: 0,
    })),
  };
}
