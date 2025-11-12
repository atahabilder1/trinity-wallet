/**
 * ZK Social Recovery Types
 */

export interface Guardian {
  id: string;
  alias: string; // User-friendly name (only stored locally)
  publicKey: string; // Guardian's public key for encryption
  commitment: string; // Hash commitment to verify guardian
  encryptedShare?: string; // Guardian's encrypted share
  addedAt: number;
  lastVerified?: number;
}

export interface RecoveryConfig {
  threshold: number; // Minimum guardians needed for recovery
  totalGuardians: number;
  guardians: Guardian[];
  createdAt: number;
  lastUpdated: number;
}

export interface ShamirShare {
  index: number;
  value: string; // Hex encoded share value
}

export interface EncryptedShare {
  guardianId: string;
  ciphertext: string;
  nonce: string;
  ephemeralPublicKey: string;
}

export interface RecoveryRequest {
  id: string;
  walletCommitment: string; // Commitment to wallet identity (doesn't reveal address)
  requesterProof: string; // ZK proof that requester is legitimate
  threshold: number;
  expiresAt: number;
  createdAt: number;
  status: 'pending' | 'complete' | 'expired' | 'cancelled';
  receivedShares: RecoveryShare[];
}

export interface RecoveryShare {
  guardianId: string;
  encryptedShare: string;
  proof: string; // Proof that share is valid
  submittedAt: number;
}

export interface ZKProof {
  pi_a: [string, string];
  pi_b: [[string, string], [string, string]];
  pi_c: [string, string];
  protocol: 'groth16';
  publicInputs: string[];
}

export interface GuardianInvite {
  id: string;
  code: string; // Short code for sharing
  encryptedData: string; // Encrypted guardian setup data
  expiresAt: number;
}

export interface RecoveryProof {
  shareProofs: ZKProof[];
  combinedProof: ZKProof;
  recoveredSecret: string;
}

export interface RecoveryResult {
  success: boolean;
  mnemonic?: string;
  error?: string;
}

export interface GuardianSetupData {
  walletCommitment: string;
  share: ShamirShare;
  publicKey: string;
  metadata: {
    threshold: number;
    totalGuardians: number;
    createdAt: number;
  };
}

export interface VerificationResult {
  isValid: boolean;
  guardianId?: string;
  error?: string;
}
