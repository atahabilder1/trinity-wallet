/**
 * Guardian Management
 *
 * Manages guardians for social recovery with privacy preservation
 */

import { sha256 } from '../crypto/hashing';
import { encrypt, decrypt } from '../crypto/encryption';
import { getRandomBytes, bytesToHex } from '../crypto/random';
import { splitSecret } from './shamir';
import type {
  Guardian,
  RecoveryConfig,
  GuardianInvite,
  GuardianSetupData,
  EncryptedShare,
  ShamirShare,
} from './types';

// ECDH for guardian key exchange
import { secp256k1 } from '@noble/curves/secp256k1';

/**
 * Guardian Manager class
 */
export class GuardianManager {
  private config: RecoveryConfig | null = null;
  private storage: Storage | null;
  private storageKey = 'trinity_recovery_config';

  constructor(storage?: Storage) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.loadConfig();
  }

  /**
   * Initialize recovery with guardians
   */
  async initializeRecovery(
    mnemonic: string,
    threshold: number,
    guardians: Array<{ alias: string; publicKey: string }>
  ): Promise<RecoveryConfig> {
    if (threshold > guardians.length) {
      throw new Error('Threshold cannot exceed number of guardians');
    }
    if (threshold < 2) {
      throw new Error('Threshold must be at least 2');
    }

    // Create wallet commitment (hash of mnemonic - doesn't reveal the mnemonic)
    const walletCommitment = sha256(mnemonic);

    // Split mnemonic into shares
    const mnemonicHex = Buffer.from(mnemonic, 'utf8').toString('hex');
    const shares = splitSecret(mnemonicHex, threshold, guardians.length);

    // Create guardian entries with encrypted shares
    const guardianEntries: Guardian[] = [];

    for (let i = 0; i < guardians.length; i++) {
      const guardian = guardians[i];
      const share = shares[i];

      // Create commitment for this guardian
      const commitment = sha256(guardian.publicKey + walletCommitment);

      // Encrypt share for guardian
      const encryptedShare = await this.encryptShareForGuardian(share, guardian.publicKey);

      guardianEntries.push({
        id: bytesToHex(getRandomBytes(16)),
        alias: guardian.alias,
        publicKey: guardian.publicKey,
        commitment,
        encryptedShare: JSON.stringify(encryptedShare),
        addedAt: Date.now(),
      });
    }

    this.config = {
      threshold,
      totalGuardians: guardians.length,
      guardians: guardianEntries,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    this.saveConfig();
    return this.config;
  }

  /**
   * Create an invite for a new guardian
   */
  async createGuardianInvite(alias: string): Promise<GuardianInvite> {
    const id = bytesToHex(getRandomBytes(8));
    const code = this.generateInviteCode();

    // Create temporary keypair for the invite
    const tempPrivateKey = getRandomBytes(32);
    const tempPublicKey = bytesToHex(secp256k1.getPublicKey(tempPrivateKey));

    const inviteData = {
      id,
      alias,
      tempPublicKey,
      createdAt: Date.now(),
    };

    // Encrypt with code-derived key
    const encryptedData = await encrypt(JSON.stringify(inviteData), code);

    const invite: GuardianInvite = {
      id,
      code,
      encryptedData: JSON.stringify(encryptedData),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    return invite;
  }

  /**
   * Accept a guardian invite (from guardian's perspective)
   */
  async acceptInvite(code: string, encryptedData: string): Promise<GuardianSetupData> {
    try {
      const encrypted = JSON.parse(encryptedData);
      const decrypted = await decrypt(encrypted, code);
      const inviteData = JSON.parse(decrypted);

      // Generate guardian keypair
      const privateKey = getRandomBytes(32);
      const publicKey = bytesToHex(secp256k1.getPublicKey(privateKey));

      // This would be returned to the wallet owner
      return {
        walletCommitment: '', // Will be filled by wallet owner
        share: { index: 0, value: '' }, // Will be filled by wallet owner
        publicKey,
        metadata: {
          threshold: 0,
          totalGuardians: 0,
          createdAt: Date.now(),
        },
      };
    } catch {
      throw new Error('Invalid invite code');
    }
  }

  /**
   * Add a guardian after invite acceptance
   */
  async addGuardian(alias: string, publicKey: string): Promise<Guardian> {
    if (!this.config) {
      throw new Error('Recovery not initialized');
    }

    const commitment = sha256(publicKey);

    const guardian: Guardian = {
      id: bytesToHex(getRandomBytes(16)),
      alias,
      publicKey,
      commitment,
      addedAt: Date.now(),
    };

    this.config.guardians.push(guardian);
    this.config.totalGuardians++;
    this.config.lastUpdated = Date.now();

    this.saveConfig();
    return guardian;
  }

  /**
   * Remove a guardian
   */
  removeGuardian(guardianId: string): boolean {
    if (!this.config) {
      throw new Error('Recovery not initialized');
    }

    const index = this.config.guardians.findIndex(g => g.id === guardianId);
    if (index === -1) {
      return false;
    }

    this.config.guardians.splice(index, 1);
    this.config.totalGuardians--;
    this.config.lastUpdated = Date.now();

    this.saveConfig();
    return true;
  }

  /**
   * Get all guardians
   */
  getGuardians(): Guardian[] {
    return this.config?.guardians || [];
  }

  /**
   * Get recovery config
   */
  getConfig(): RecoveryConfig | null {
    return this.config;
  }

  /**
   * Check if recovery is set up
   */
  isSetUp(): boolean {
    return this.config !== null && this.config.guardians.length >= this.config.threshold;
  }

  /**
   * Encrypt a share for a specific guardian using ECDH
   */
  private async encryptShareForGuardian(share: ShamirShare, guardianPublicKey: string): Promise<EncryptedShare> {
    // Generate ephemeral keypair
    const ephemeralPrivateKey = getRandomBytes(32);
    const ephemeralPublicKey = bytesToHex(secp256k1.getPublicKey(ephemeralPrivateKey));

    // Derive shared secret using ECDH
    const guardianPubKeyBytes = hexToBytes(guardianPublicKey);
    const sharedPoint = secp256k1.getSharedSecret(ephemeralPrivateKey, guardianPubKeyBytes);
    const sharedSecret = sha256(bytesToHex(sharedPoint));

    // Encrypt the share
    const shareData = JSON.stringify(share);
    const encrypted = await encrypt(shareData, sharedSecret);

    return {
      guardianId: '', // Will be set by caller
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.iv,
      ephemeralPublicKey,
    };
  }

  /**
   * Generate a human-readable invite code
   */
  private generateInviteCode(): string {
    const bytes = getRandomBytes(4);
    const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    return num.toString(36).toUpperCase().padStart(7, '0');
  }

  /**
   * Load config from storage
   */
  private loadConfig(): void {
    if (!this.storage) return;

    try {
      const stored = this.storage.getItem(this.storageKey);
      if (stored) {
        this.config = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load recovery config:', error);
    }
  }

  /**
   * Save config to storage
   */
  private saveConfig(): void {
    if (!this.storage || !this.config) return;

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save recovery config:', error);
    }
  }

  /**
   * Clear recovery config
   */
  clearConfig(): void {
    this.config = null;
    if (this.storage) {
      this.storage.removeItem(this.storageKey);
    }
  }
}

/**
 * Create a guardian manager instance
 */
export function createGuardianManager(storage?: Storage): GuardianManager {
  return new GuardianManager(storage);
}

/**
 * Helper: Convert hex to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}
