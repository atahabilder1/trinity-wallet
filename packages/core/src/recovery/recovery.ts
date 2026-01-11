/**
 * Wallet Recovery
 *
 * Handles the recovery process using guardian shares
 */

import { sha256Hex } from '../crypto/hashing';
import { decrypt } from '../crypto/encryption';
import { combineShares, verifyShares } from './shamir';
import { createZKRecoveryProof, verifyZKProof } from './zkproof';
import type {
  RecoveryRequest,
  RecoveryShare,
  RecoveryResult,
  ShamirShare,
  Guardian,
} from './types';
import { bytesToHex, hexToBytes, getRandomBytes } from '../crypto/random';

// ECDH for decryption
import { secp256k1 } from '@noble/curves/secp256k1';

/**
 * Recovery Manager class
 */
export class RecoveryManager {
  private pendingRequests: Map<string, RecoveryRequest> = new Map();
  private storage: Storage | null;
  private storageKey = 'trinity_recovery_requests';

  constructor(storage?: Storage) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.loadRequests();
  }

  /**
   * Initiate a recovery request
   */
  async initiateRecovery(
    walletAddress: string,
    threshold: number,
    requesterPrivateKey: Uint8Array
  ): Promise<RecoveryRequest> {
    // Create wallet commitment (doesn't reveal address)
    const walletCommitment = sha256Hex(walletAddress);

    // Create ZK proof that requester is legitimate
    const requesterProof = await createZKRecoveryProof(walletAddress, requesterPrivateKey);

    const request: RecoveryRequest = {
      id: bytesToHex(getRandomBytes(16)),
      walletCommitment,
      requesterProof: JSON.stringify(requesterProof),
      threshold,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: Date.now(),
      status: 'pending',
      receivedShares: [],
    };

    this.pendingRequests.set(request.id, request);
    this.saveRequests();

    return request;
  }

  /**
   * Submit a recovery share (from guardian)
   */
  async submitShare(
    requestId: string,
    guardianId: string,
    encryptedShare: string,
    proof: string
  ): Promise<boolean> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error('Recovery request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Recovery request is not pending');
    }

    if (Date.now() > request.expiresAt) {
      request.status = 'expired';
      this.saveRequests();
      throw new Error('Recovery request has expired');
    }

    // Check if guardian already submitted
    if (request.receivedShares.some(s => s.guardianId === guardianId)) {
      throw new Error('Guardian has already submitted a share');
    }

    // Verify the proof
    const proofValid = await verifyZKProof(JSON.parse(proof));
    if (!proofValid) {
      throw new Error('Invalid share proof');
    }

    // Add share
    request.receivedShares.push({
      guardianId,
      encryptedShare,
      proof,
      submittedAt: Date.now(),
    });

    // Check if we have enough shares
    if (request.receivedShares.length >= request.threshold) {
      request.status = 'complete';
    }

    this.saveRequests();
    return true;
  }

  /**
   * Complete recovery with collected shares
   */
  async completeRecovery(
    requestId: string,
    guardians: Guardian[],
    decryptionKey: Uint8Array
  ): Promise<RecoveryResult> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      return { success: false, error: 'Recovery request not found' };
    }

    if (request.status !== 'complete') {
      return { success: false, error: `Recovery not complete. Need ${request.threshold} shares, have ${request.receivedShares.length}` };
    }

    try {
      // Decrypt and collect shares
      const shamirShares: ShamirShare[] = [];

      for (const receivedShare of request.receivedShares) {
        const guardian = guardians.find(g => g.id === receivedShare.guardianId);
        if (!guardian) continue;

        const share = await this.decryptShare(
          receivedShare.encryptedShare,
          decryptionKey,
          guardian.publicKey
        );

        if (share) {
          shamirShares.push(share);
        }
      }

      if (shamirShares.length < request.threshold) {
        return { success: false, error: 'Not enough valid shares' };
      }

      // Verify shares are consistent
      if (!verifyShares(shamirShares, request.threshold)) {
        return { success: false, error: 'Shares are inconsistent' };
      }

      // Combine shares to recover mnemonic
      const mnemonicHex = combineShares(shamirShares.slice(0, request.threshold));
      const mnemonic = Buffer.from(mnemonicHex, 'hex').toString('utf8');

      // Clean up request
      this.pendingRequests.delete(requestId);
      this.saveRequests();

      return { success: true, mnemonic };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Recovery failed',
      };
    }
  }

  /**
   * Cancel a recovery request
   */
  cancelRecovery(requestId: string): boolean {
    const request = this.pendingRequests.get(requestId);
    if (!request) return false;

    request.status = 'cancelled';
    this.saveRequests();
    return true;
  }

  /**
   * Get recovery request status
   */
  getRequest(requestId: string): RecoveryRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  /**
   * Get all pending requests
   */
  getPendingRequests(): RecoveryRequest[] {
    return Array.from(this.pendingRequests.values()).filter(r => r.status === 'pending');
  }

  /**
   * Clean up expired requests
   */
  cleanupExpired(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [id, request] of this.pendingRequests) {
      if (request.expiresAt < now && request.status === 'pending') {
        request.status = 'expired';
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.saveRequests();
    }

    return cleaned;
  }

  /**
   * Decrypt a share using ECDH
   */
  private async decryptShare(
    encryptedShareJson: string,
    privateKey: Uint8Array,
    guardianPublicKey: string
  ): Promise<ShamirShare | null> {
    try {
      const encrypted = JSON.parse(encryptedShareJson);

      // Derive shared secret using ECDH
      const ephemeralPubKey = hexToBytes(encrypted.ephemeralPublicKey);
      const sharedPoint = secp256k1.getSharedSecret(privateKey, ephemeralPubKey);
      const sharedSecret = sha256Hex(bytesToHex(sharedPoint));

      // Decrypt
      const decrypted = await decrypt(
        {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.nonce,
          salt: '', // Not used in this context
          version: 1,
        },
        sharedSecret
      );

      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch {
      return null;
    }
  }

  /**
   * Load requests from storage
   */
  private loadRequests(): void {
    if (!this.storage) return;

    try {
      const stored = this.storage.getItem(this.storageKey);
      if (stored) {
        const requests: RecoveryRequest[] = JSON.parse(stored);
        for (const request of requests) {
          this.pendingRequests.set(request.id, request);
        }
      }
    } catch (error) {
      console.warn('Failed to load recovery requests:', error);
    }
  }

  /**
   * Save requests to storage
   */
  private saveRequests(): void {
    if (!this.storage) return;

    try {
      const requests = Array.from(this.pendingRequests.values());
      this.storage.setItem(this.storageKey, JSON.stringify(requests));
    } catch (error) {
      console.warn('Failed to save recovery requests:', error);
    }
  }
}

/**
 * Create a recovery manager instance
 */
export function createRecoveryManager(storage?: Storage): RecoveryManager {
  return new RecoveryManager(storage);
}
