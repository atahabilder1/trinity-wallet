/**
 * Portfolio Analytics
 *
 * Provides analytics and insights for portfolio performance
 */

import type {
  PortfolioSummary,
  PortfolioHistory,
  TokenHolding,
  ChainPortfolio,
} from './types';

/**
 * Portfolio performance metrics
 */
export interface PerformanceMetrics {
  absoluteReturn: number;
  percentageReturn: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  volatility?: number;
  bestPerformer?: TokenHolding;
  worstPerformer?: TokenHolding;
}

/**
 * Diversification analysis
 */
export interface DiversificationAnalysis {
  score: number; // 0-100
  chainConcentration: number;
  tokenConcentration: number;
  recommendations: string[];
}

/**
 * Calculate performance metrics
 */
export function calculatePerformance(
  currentValue: number,
  history: PortfolioHistory
): PerformanceMetrics {
  const absoluteReturn = history.change;
  const percentageReturn = history.changePercent;

  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = 0;

  for (const point of history.points) {
    if (point.valueUsd > peak) {
      peak = point.valueUsd;
    }
    const drawdown = peak > 0 ? ((peak - point.valueUsd) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Calculate volatility (standard deviation of returns)
  let volatility: number | undefined;

  if (history.points.length >= 2) {
    const returns: number[] = [];
    for (let i = 1; i < history.points.length; i++) {
      const prevValue = history.points[i - 1].valueUsd;
      const currValue = history.points[i].valueUsd;
      if (prevValue > 0) {
        returns.push((currValue - prevValue) / prevValue);
      }
    }

    if (returns.length > 0) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
      volatility = Math.sqrt(variance) * 100;
    }
  }

  return {
    absoluteReturn,
    percentageReturn,
    maxDrawdown,
    volatility,
  };
}

/**
 * Analyze portfolio diversification
 */
export function analyzeDiversification(
  portfolio: PortfolioSummary,
  chainPortfolios: ChainPortfolio[]
): DiversificationAnalysis {
  const recommendations: string[] = [];

  // Calculate chain concentration (Herfindahl-Hirschman Index)
  const chainShares = chainPortfolios.map(c => c.allocation / 100);
  const chainHHI = chainShares.reduce((sum, share) => sum + share * share, 0);
  const chainConcentration = chainHHI * 100;

  // Calculate token concentration
  const tokenShares = portfolio.holdings.map(h => h.allocation / 100);
  const tokenHHI = tokenShares.reduce((sum, share) => sum + share * share, 0);
  const tokenConcentration = tokenHHI * 100;

  // Diversification score (inverse of concentration)
  const avgConcentration = (chainConcentration + tokenConcentration) / 2;
  const score = Math.max(0, Math.min(100, 100 - avgConcentration));

  // Generate recommendations
  if (chainPortfolios.length === 1) {
    recommendations.push('Consider diversifying across multiple chains for better risk management');
  }

  if (portfolio.holdings.length > 0) {
    const topHolding = portfolio.holdings[0];
    if (topHolding.allocation > 50) {
      recommendations.push(
        `${topHolding.token.symbol} represents ${topHolding.allocation.toFixed(1)}% of your portfolio. Consider rebalancing.`
      );
    }
  }

  if (portfolio.holdings.length < 3) {
    recommendations.push('Having more assets can reduce portfolio risk');
  }

  // Check for stablecoin allocation
  const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX'];
  const stablecoinAllocation = portfolio.holdings
    .filter(h => stablecoins.includes(h.token.symbol.toUpperCase()))
    .reduce((sum, h) => sum + h.allocation, 0);

  if (stablecoinAllocation === 0 && portfolio.totalValueUsd > 1000) {
    recommendations.push('Consider holding some stablecoins for stability');
  }

  if (stablecoinAllocation > 80) {
    recommendations.push('High stablecoin allocation may limit growth potential');
  }

  return {
    score,
    chainConcentration,
    tokenConcentration,
    recommendations,
  };
}

/**
 * Find best and worst performing tokens
 */
export function findPerformers(holdings: TokenHolding[]): {
  best: TokenHolding | undefined;
  worst: TokenHolding | undefined;
} {
  if (holdings.length === 0) {
    return { best: undefined, worst: undefined };
  }

  let best = holdings[0];
  let worst = holdings[0];

  for (const holding of holdings) {
    const change = holding.price?.priceChange24h ?? 0;
    const bestChange = best.price?.priceChange24h ?? 0;
    const worstChange = worst.price?.priceChange24h ?? 0;

    if (change > bestChange) {
      best = holding;
    }
    if (change < worstChange) {
      worst = holding;
    }
  }

  return { best, worst };
}

/**
 * Calculate portfolio allocation by asset type
 */
export function calculateAssetTypeAllocation(
  holdings: TokenHolding[]
): Record<string, number> {
  const allocation: Record<string, number> = {
    native: 0,
    stablecoin: 0,
    defi: 0,
    meme: 0,
    other: 0,
  };

  const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'TUSD', 'USDP'];
  const defiTokens = ['UNI', 'AAVE', 'COMP', 'MKR', 'SNX', 'CRV', 'SUSHI', 'YFI'];
  const memeTokens = ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK'];

  for (const holding of holdings) {
    const symbol = holding.token.symbol.toUpperCase();

    if (holding.token.tokenAddress === 'native') {
      allocation.native += holding.allocation;
    } else if (stablecoins.includes(symbol)) {
      allocation.stablecoin += holding.allocation;
    } else if (defiTokens.includes(symbol)) {
      allocation.defi += holding.allocation;
    } else if (memeTokens.includes(symbol)) {
      allocation.meme += holding.allocation;
    } else {
      allocation.other += holding.allocation;
    }
  }

  return allocation;
}

/**
 * Generate portfolio insights
 */
export function generateInsights(
  portfolio: PortfolioSummary,
  history: PortfolioHistory,
  diversification: DiversificationAnalysis
): string[] {
  const insights: string[] = [];

  // Portfolio size insights
  if (portfolio.totalValueUsd > 100000) {
    insights.push('Your portfolio qualifies for advanced security measures. Consider hardware wallet storage.');
  }

  // Performance insights
  if (history.changePercent > 10) {
    insights.push(`Strong performance! Your portfolio is up ${history.changePercent.toFixed(1)}% this period.`);
  } else if (history.changePercent < -10) {
    insights.push(`Market volatility detected. Your portfolio is down ${Math.abs(history.changePercent).toFixed(1)}%.`);
  }

  // Diversification insights
  if (diversification.score < 30) {
    insights.push('Your portfolio is highly concentrated. Consider diversifying.');
  } else if (diversification.score > 70) {
    insights.push('Your portfolio is well-diversified across assets and chains.');
  }

  // Add recommendations as insights
  insights.push(...diversification.recommendations);

  return insights;
}

/**
 * Calculate compound annual growth rate (CAGR)
 */
export function calculateCAGR(
  startValue: number,
  endValue: number,
  daysHeld: number
): number {
  if (startValue <= 0 || daysHeld <= 0) return 0;

  const years = daysHeld / 365;
  const cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;

  return cagr;
}

/**
 * Calculate portfolio beta vs reference asset (e.g., ETH)
 */
export function calculateBeta(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length < 2) {
    return 1;
  }

  // Calculate covariance
  const n = portfolioReturns.length;
  const portfolioMean = portfolioReturns.reduce((a, b) => a + b, 0) / n;
  const benchmarkMean = benchmarkReturns.reduce((a, b) => a + b, 0) / n;

  let covariance = 0;
  let benchmarkVariance = 0;

  for (let i = 0; i < n; i++) {
    covariance += (portfolioReturns[i] - portfolioMean) * (benchmarkReturns[i] - benchmarkMean);
    benchmarkVariance += Math.pow(benchmarkReturns[i] - benchmarkMean, 2);
  }

  covariance /= n;
  benchmarkVariance /= n;

  if (benchmarkVariance === 0) return 1;

  return covariance / benchmarkVariance;
}
