/**
 * Transaction Risk Assessment
 *
 * Analyzes transactions for potential risks and security issues
 */

import type {
  SimulationRequest,
  SimulationResult,
  RiskLevel,
  RiskWarning,
  ApprovalChange,
  BalanceChange,
} from './types';
import { isUnlimitedApproval, decodeApproval, isApproval } from './decoder';

// Known malicious addresses (sample - in production this would be a larger database)
const MALICIOUS_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000', // Null address
]);

// Known phishing contracts patterns
const PHISHING_PATTERNS = [
  /claim.*airdrop/i,
  /free.*mint/i,
  /security.*update/i,
  /verify.*wallet/i,
];

// Risk codes
export const RISK_CODES = {
  UNLIMITED_APPROVAL: 'UNLIMITED_APPROVAL',
  NEW_CONTRACT: 'NEW_CONTRACT',
  UNVERIFIED_CONTRACT: 'UNVERIFIED_CONTRACT',
  LARGE_VALUE: 'LARGE_VALUE',
  APPROVAL_TO_EOA: 'APPROVAL_TO_EOA',
  DRAINING_APPROVAL: 'DRAINING_APPROVAL',
  MALICIOUS_ADDRESS: 'MALICIOUS_ADDRESS',
  SUSPICIOUS_PATTERN: 'SUSPICIOUS_PATTERN',
  LOSS_OF_FUNDS: 'LOSS_OF_FUNDS',
  FIRST_INTERACTION: 'FIRST_INTERACTION',
  HIGH_GAS: 'HIGH_GAS',
  FAILED_SIMULATION: 'FAILED_SIMULATION',
} as const;

/**
 * Analyze transaction for risks
 */
export function analyzeRisks(
  request: SimulationRequest,
  result: Partial<SimulationResult>
): { level: RiskLevel; warnings: RiskWarning[] } {
  const warnings: RiskWarning[] = [];

  // Check for simulation failure
  if (!result.success && result.error) {
    warnings.push({
      level: 'high',
      code: RISK_CODES.FAILED_SIMULATION,
      title: 'Simulation Failed',
      description: `Transaction may fail: ${result.error}`,
    });
  }

  // Check approvals
  if (result.approvalChanges) {
    for (const approval of result.approvalChanges) {
      warnings.push(...analyzeApproval(approval));
    }
  }

  // Check balance changes
  if (result.balanceChanges) {
    warnings.push(...analyzeBalanceChanges(result.balanceChanges, request.from));
  }

  // Check for malicious addresses
  if (MALICIOUS_ADDRESSES.has(request.to.toLowerCase())) {
    warnings.push({
      level: 'critical',
      code: RISK_CODES.MALICIOUS_ADDRESS,
      title: 'Known Malicious Address',
      description: 'This address has been flagged as malicious. Do not proceed.',
    });
  }

  // Check for unverified contract
  if (result.contractInteraction && !result.contractInteraction.isVerified) {
    warnings.push({
      level: 'medium',
      code: RISK_CODES.UNVERIFIED_CONTRACT,
      title: 'Unverified Contract',
      description: 'This contract is not verified on the block explorer.',
    });
  }

  // Check for high gas usage
  if (result.gasUsed) {
    const gasUsed = BigInt(result.gasUsed);
    if (gasUsed > 500000n) {
      warnings.push({
        level: 'low',
        code: RISK_CODES.HIGH_GAS,
        title: 'High Gas Usage',
        description: 'This transaction uses a significant amount of gas.',
      });
    }
  }

  // Determine overall risk level
  const level = calculateOverallRisk(warnings);

  return { level, warnings };
}

/**
 * Analyze approval for risks
 */
function analyzeApproval(approval: ApprovalChange): RiskWarning[] {
  const warnings: RiskWarning[] = [];

  // Unlimited approval
  if (approval.isUnlimited) {
    warnings.push({
      level: 'high',
      code: RISK_CODES.UNLIMITED_APPROVAL,
      title: 'Unlimited Token Approval',
      description: `You are granting unlimited access to your ${approval.tokenSymbol || 'tokens'}. Consider approving only the needed amount.`,
    });
  }

  // Approval for all NFTs
  if (approval.approvalForAll) {
    warnings.push({
      level: 'high',
      code: RISK_CODES.DRAINING_APPROVAL,
      title: 'Approval for All NFTs',
      description: 'This grants access to ALL your NFTs in this collection.',
    });
  }

  return warnings;
}

/**
 * Analyze balance changes for risks
 */
function analyzeBalanceChanges(changes: BalanceChange[], userAddress: string): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  const userChanges = changes.filter(c => c.address.toLowerCase() === userAddress.toLowerCase());

  let totalLossUsd = 0;

  for (const change of userChanges) {
    const diff = BigInt(change.difference);

    // Significant outgoing transfer
    if (diff < 0n) {
      const absDiff = -diff;

      // Large native token transfer (> 1 ETH equivalent)
      if (change.isNative && absDiff > BigInt(10) ** BigInt(18)) {
        warnings.push({
          level: 'medium',
          code: RISK_CODES.LARGE_VALUE,
          title: 'Large Transfer',
          description: `You are sending a significant amount of ${change.assetSymbol}.`,
        });
      }
    }
  }

  // Check for net loss
  const hasNetLoss = userChanges.some(c => BigInt(c.difference) < 0n);
  const hasNetGain = userChanges.some(c => BigInt(c.difference) > 0n);

  if (hasNetLoss && !hasNetGain) {
    warnings.push({
      level: 'medium',
      code: RISK_CODES.LOSS_OF_FUNDS,
      title: 'Net Loss of Assets',
      description: 'This transaction results in a net loss of assets without receiving anything.',
    });
  }

  return warnings;
}

/**
 * Calculate overall risk level from warnings
 */
function calculateOverallRisk(warnings: RiskWarning[]): RiskLevel {
  if (warnings.some(w => w.level === 'critical')) {
    return 'critical';
  }
  if (warnings.some(w => w.level === 'high')) {
    return 'high';
  }
  if (warnings.some(w => w.level === 'medium')) {
    return 'medium';
  }
  return 'low';
}

/**
 * Quick risk check without full simulation
 */
export function quickRiskCheck(request: SimulationRequest): RiskWarning[] {
  const warnings: RiskWarning[] = [];

  // Check for malicious address
  if (MALICIOUS_ADDRESSES.has(request.to.toLowerCase())) {
    warnings.push({
      level: 'critical',
      code: RISK_CODES.MALICIOUS_ADDRESS,
      title: 'Known Malicious Address',
      description: 'This address has been flagged as malicious.',
    });
  }

  // Check for approval
  if (request.data && isApproval(request.data)) {
    const approval = decodeApproval(request.data);
    if (approval && isUnlimitedApproval(approval.amount)) {
      warnings.push({
        level: 'high',
        code: RISK_CODES.UNLIMITED_APPROVAL,
        title: 'Unlimited Approval',
        description: 'This transaction requests unlimited token approval.',
      });
    }
  }

  // Check for large value transfer
  if (request.value) {
    const value = BigInt(request.value);
    if (value > BigInt(10) ** BigInt(18)) {
      warnings.push({
        level: 'medium',
        code: RISK_CODES.LARGE_VALUE,
        title: 'Large Value Transfer',
        description: 'This transaction involves a significant amount of native tokens.',
      });
    }
  }

  return warnings;
}

/**
 * Get risk level color for UI
 */
export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'critical':
      return '#FF0000';
    case 'high':
      return '#FF6B00';
    case 'medium':
      return '#FFB800';
    case 'low':
      return '#00C853';
    default:
      return '#666666';
  }
}

/**
 * Get risk level label for UI
 */
export function getRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'critical':
      return 'Critical Risk';
    case 'high':
      return 'High Risk';
    case 'medium':
      return 'Medium Risk';
    case 'low':
      return 'Low Risk';
    default:
      return 'Unknown';
  }
}
