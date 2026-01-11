/**
 * Railgun Transactions
 *
 * Handles private transaction creation and submission
 */

import { Contract, JsonRpcProvider, Wallet as EthersWallet } from 'ethers';
import { sha256Hex, hashSha256 } from '../crypto/hashing';
import { getRandomBytes, bytesToHex } from '../crypto/random';
import type {
  PrivateTransferRequest,
  RailgunTransaction,
  PrivateTransaction,
  TransactionReceipt,
  ProofGenerationProgress,
  UTXO,
  MerkleProof,
} from './types';
import { RailgunClient } from './client';
import { RailgunWalletManager } from './wallet';

// Railgun contract ABI (simplified)
const RAILGUN_ABI = [
  'function transact(uint256[] proof, uint256 merkleRoot, uint256[] nullifiers, uint256[] commitments, bytes encryptedData) external',
  'function merkleRoot() view returns (uint256)',
];

/**
 * Transaction Builder for Railgun
 */
export class RailgunTransactionBuilder {
  private client: RailgunClient;
  private walletManager: RailgunWalletManager;
  private progressCallback?: (progress: ProofGenerationProgress) => void;

  constructor(client: RailgunClient, walletManager: RailgunWalletManager) {
    this.client = client;
    this.walletManager = walletManager;
  }

  /**
   * Set progress callback for proof generation
   */
  onProgress(callback: (progress: ProofGenerationProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Create a private transfer transaction
   */
  async createPrivateTransfer(
    walletId: string,
    request: PrivateTransferRequest
  ): Promise<{
    proof: string[];
    publicInputs: string[];
    encryptedData: string;
  }> {
    this.emitProgress('start', 0, 'Starting proof generation...');

    const wallet = this.walletManager.getWallet(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Get UTXOs to spend
    const utxos = this.walletManager.getUTXOs(walletId, request.tokenAddress);
    const { inputUtxos, changeAmount } = this.selectUTXOs(utxos, BigInt(request.amount));

    if (inputUtxos.length === 0) {
      throw new Error('Insufficient shielded balance');
    }

    this.emitProgress('proving', 25, 'Generating nullifiers...');

    // Generate nullifiers for input UTXOs
    const nullifiers = inputUtxos.map(utxo =>
      sha256Hex(utxo.commitment + wallet.spendingKey)
    );

    this.emitProgress('proving', 50, 'Creating output commitments...');

    // Create output commitments
    const outputCommitments = await this.createOutputCommitments(
      request.tokenAddress,
      request.amount,
      request.recipientRailgunAddress,
      changeAmount,
      wallet.railgunAddress
    );

    this.emitProgress('proving', 75, 'Generating ZK proof...');

    // Generate the ZK proof
    // In production, this uses snarkjs or a Rust WASM module
    const proof = await this.generateProof(
      inputUtxos,
      nullifiers,
      outputCommitments,
      wallet
    );

    this.emitProgress('complete', 100, 'Proof generation complete');

    // Encrypt transaction data for recipients
    const encryptedData = await this.encryptOutputs(
      outputCommitments,
      request.recipientRailgunAddress,
      request.memo
    );

    return {
      proof: proof.proofElements,
      publicInputs: [
        await this.client.getMerkleRoot(),
        ...nullifiers,
        ...outputCommitments.map(c => c.hash),
      ],
      encryptedData,
    };
  }

  /**
   * Submit a private transaction
   */
  async submitTransaction(
    walletId: string,
    signer: EthersWallet,
    proof: string[],
    publicInputs: string[],
    encryptedData: string
  ): Promise<TransactionReceipt> {
    const contracts = this.client.getContractAddresses();
    const contract = new Contract(contracts.proxy, RAILGUN_ABI, signer);

    try {
      const tx = await contract.transact(
        proof,
        publicInputs[0], // merkle root
        publicInputs.slice(1, publicInputs.length / 2), // nullifiers
        publicInputs.slice(publicInputs.length / 2), // commitments
        encryptedData
      );

      const receipt = await tx.wait();

      return {
        hash: tx.hash,
        status: receipt.status === 1 ? 'success' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.gasPrice?.toString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Transaction failed: ${message}`);
    }
  }

  /**
   * Submit via relayer (for gas abstraction)
   */
  async submitViaRelayer(
    relayerUrl: string,
    proof: string[],
    publicInputs: string[],
    encryptedData: string
  ): Promise<TransactionReceipt> {
    try {
      const response = await fetch(`${relayerUrl}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof,
          publicInputs,
          encryptedData,
          chainId: this.client.getConfig().chainId,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const result = await response.json();

      return {
        hash: result.hash,
        status: 'pending',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Relayer submission failed: ${message}`);
    }
  }

  /**
   * Select UTXOs to spend
   */
  private selectUTXOs(
    utxos: UTXO[],
    targetAmount: bigint
  ): { inputUtxos: UTXO[]; changeAmount: bigint } {
    // Sort by amount descending
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
      return { inputUtxos: [], changeAmount: 0n };
    }

    return {
      inputUtxos: selected,
      changeAmount: total - targetAmount,
    };
  }

  /**
   * Create output commitments
   */
  private async createOutputCommitments(
    tokenAddress: string,
    amount: string,
    recipientAddress: string,
    changeAmount: bigint,
    senderAddress: string
  ): Promise<Array<{ hash: string; blinding: string }>> {
    const commitments: Array<{ hash: string; blinding: string }> = [];

    // Main output to recipient
    const recipientBlinding = bytesToHex(getRandomBytes(32));
    const recipientCommitment = sha256Hex(
      recipientAddress + tokenAddress + amount + recipientBlinding
    );
    commitments.push({ hash: recipientCommitment, blinding: recipientBlinding });

    // Change output to sender (if any)
    if (changeAmount > 0n) {
      const changeBlinding = bytesToHex(getRandomBytes(32));
      const changeCommitment = sha256Hex(
        senderAddress + tokenAddress + changeAmount.toString() + changeBlinding
      );
      commitments.push({ hash: changeCommitment, blinding: changeBlinding });
    }

    return commitments;
  }

  /**
   * Generate ZK proof
   */
  private async generateProof(
    inputUtxos: UTXO[],
    nullifiers: string[],
    outputCommitments: Array<{ hash: string; blinding: string }>,
    wallet: { viewingKey: string; spendingKey: string }
  ): Promise<{ proofElements: string[] }> {
    // In production, this would:
    // 1. Load the proving key
    // 2. Create the witness from inputs
    // 3. Generate a groth16 proof using snarkjs or similar

    // For simulation, return placeholder proof elements
    const proofElements: string[] = [];
    for (let i = 0; i < 8; i++) {
      proofElements.push(bytesToHex(getRandomBytes(32)));
    }

    // Simulate proof generation time
    await new Promise(resolve => setTimeout(resolve, 100));

    return { proofElements };
  }

  /**
   * Encrypt output data for recipients
   */
  private async encryptOutputs(
    commitments: Array<{ hash: string; blinding: string }>,
    recipientAddress: string,
    memo?: string
  ): Promise<string> {
    // In production, this encrypts the output note data
    // so only the recipient can decrypt and spend it

    const data = {
      commitments,
      recipient: recipientAddress,
      memo,
      timestamp: Date.now(),
    };

    // Simulated encryption - would use recipient's viewing key
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * Emit progress update
   */
  private emitProgress(
    stage: ProofGenerationProgress['stage'],
    progress: number,
    message: string
  ): void {
    if (this.progressCallback) {
      this.progressCallback({ stage, progress, message });
    }
  }
}

/**
 * Create a transaction builder
 */
export function createTransactionBuilder(
  client: RailgunClient,
  walletManager: RailgunWalletManager
): RailgunTransactionBuilder {
  return new RailgunTransactionBuilder(client, walletManager);
}

/**
 * Estimate private transfer gas
 */
export async function estimatePrivateTransferGas(
  inputCount: number,
  outputCount: number
): Promise<bigint> {
  // Base gas + per-input + per-output
  const baseGas = 200000n;
  const perInput = 50000n;
  const perOutput = 30000n;

  return baseGas + BigInt(inputCount) * perInput + BigInt(outputCount) * perOutput;
}
