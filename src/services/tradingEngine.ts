/**
 * Trading Engine for Flip
 * Connects directly to Somnia Shannon Testnet via Browser Wallet (MetaMask/Injected)
 * or executes verifiable on-chain transactions.
 */

import { BinaryMarket, SimpleTradeSide, publicClient, probabilityToPrice } from './dreamdex';
import { SOMNIA_CONFIG } from '../contracts/chain';
import { WalletSigner } from './walletSigner';

export interface Position {
  id: string;
  userAddress?: string; // Tied strictly to creator wallet
  marketId: string;
  marketTitle: string;
  underlyingAsset: string;
  marketCategory?: 'standard' | 'community' | 'squad';
  side: SimpleTradeSide; // UP or DOWN
  entryPrice: number; // probability at entry, e.g. 0.62 ($0.62)
  investedUSD: number; // e.g. $25
  contractsCount: number; // investedUSD / entryPrice
  potentialPayoutUSD: number; // contractsCount * $1.00
  potentialMultiplier: number; // potentialPayout / investedUSD
  currentPrice: number; // live probability, e.g. 0.74
  currentValueUSD: number; // contractsCount * currentPrice
  unrealizedPnLUSD: number;
  unrealizedPnLPercent: number;
  status: 'ACTIVE' | 'WON' | 'LOST' | 'CASHED_OUT';
  txHash?: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface UserStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winStreak: number;
  maxWinStreak: number;
  totalVolumeUSD: number;
  netPnLUSD: number;
}

export class TradingEngine {
  private static STORAGE_POSITIONS_KEY = 'flip_user_positions';
  private static STORAGE_STATS_KEY = 'flip_user_stats';

  public static getStoredPositions(): Position[] {
    try {
      const data = localStorage.getItem(this.STORAGE_POSITIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static savePositions(positions: Position[]): void {
    try {
      localStorage.setItem(this.STORAGE_POSITIONS_KEY, JSON.stringify(positions));
    } catch (err) {
      console.error('Failed to save positions:', err);
    }
  }

  public static clearStoredPositions(): void {
    try {
      localStorage.removeItem(this.STORAGE_POSITIONS_KEY);
      localStorage.removeItem(this.STORAGE_STATS_KEY);
    } catch (err) {
      console.error('Failed to clear positions:', err);
    }
  }

  public static getStoredStats(): UserStats {
    try {
      const data = localStorage.getItem(this.STORAGE_STATS_KEY);
      return data
        ? JSON.parse(data)
        : {
            totalTrades: 0,
            wins: 0,
            losses: 0,
            winStreak: 0,
            maxWinStreak: 0,
            totalVolumeUSD: 0,
            netPnLUSD: 0,
          };
    } catch {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winStreak: 0,
        maxWinStreak: 0,
        totalVolumeUSD: 0,
        netPnLUSD: 0,
      };
    }
  }

  public static saveStats(stats: UserStats): void {
    try {
      localStorage.setItem(this.STORAGE_STATS_KEY, JSON.stringify(stats));
    } catch (err) {
      console.error('Failed to save stats:', err);
    }
  }

  /**
   * Execute real on-chain transaction or wallet-prompted trade on Somnia Shannon
   */
  public static async executeQuickBet(params: {
    market: BinaryMarket;
    side: SimpleTradeSide;
    amountUSD: number;
    userAddress?: string;
  }): Promise<{ position: Position; txHash: string }> {
    const { market, side, amountUSD, userAddress } = params;

    const entryPrice = side === 'UP' ? market.bestUpProbability : market.bestDownProbability;
    const contractsCount = amountUSD / entryPrice;
    const potentialPayoutUSD = contractsCount * 1.0;
    const potentialMultiplier = potentialPayoutUSD / amountUSD;

    let txHash: string;

    if (userAddress) {
      // Prompt connected wallet for real on-chain transaction or signature
      const result = await WalletSigner.requestTradeSigning({
        userAddress,
        market,
        side,
        amountUSD,
        entryPrice,
      });
      txHash = result.txHash;
    } else {
      throw new Error('Please connect your Web3 wallet to place a flip.');
    }

    const newPosition: Position = {
      id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userAddress: userAddress ? userAddress.toLowerCase() : undefined,
      marketId: market.marketId,
      marketTitle: market.title,
      underlyingAsset: market.underlyingAsset,
      marketCategory: market.marketId.startsWith('custom-') ? 'community' : 'standard',
      side,
      entryPrice,
      investedUSD: amountUSD,
      contractsCount,
      potentialPayoutUSD,
      potentialMultiplier,
      currentPrice: entryPrice,
      currentValueUSD: amountUSD,
      unrealizedPnLUSD: 0,
      unrealizedPnLPercent: 0,
      status: 'ACTIVE',
      txHash,
      createdAt: Date.now(),
    };

    const positions = this.getStoredPositions();
    positions.unshift(newPosition);
    this.savePositions(positions);

    // Update user stats
    const stats = this.getStoredStats();
    stats.totalTrades += 1;
    stats.totalVolumeUSD += amountUSD;
    this.saveStats(stats);

    return { position: newPosition, txHash };
  }

  /**
   * Record a Squad Challenge wager in unified Activity / Positions
   */
  public static recordSquadPosition(params: {
    challengeId: string;
    title: string;
    underlyingAsset: string;
    side: SimpleTradeSide;
    amountUSD: number;
    userAddress?: string;
    txHash?: string;
  }): Position {
    const { challengeId, title, underlyingAsset, side, amountUSD, userAddress, txHash } = params;
    const newPosition: Position = {
      id: `squad-pos-${challengeId}-${Date.now()}`,
      userAddress: userAddress ? userAddress.toLowerCase() : undefined,
      marketId: challengeId,
      marketTitle: title,
      underlyingAsset,
      marketCategory: 'squad',
      side,
      entryPrice: 0.5,
      investedUSD: amountUSD,
      contractsCount: amountUSD * 2,
      potentialPayoutUSD: amountUSD * 2,
      potentialMultiplier: 2.0,
      currentPrice: 0.5,
      currentValueUSD: amountUSD,
      unrealizedPnLUSD: 0,
      unrealizedPnLPercent: 0,
      status: 'ACTIVE',
      txHash,
      createdAt: Date.now(),
    };

    const positions = this.getStoredPositions();
    positions.unshift(newPosition);
    this.savePositions(positions);

    const stats = this.getStoredStats();
    stats.totalTrades += 1;
    stats.totalVolumeUSD += amountUSD;
    this.saveStats(stats);

    return newPosition;
  }

  /**
   * Cash out an active position with wallet signature
   */
  public static async cashOutPosition(positionId: string, userAddress?: string): Promise<Position | null> {
    const positions = this.getStoredPositions();
    const idx = positions.findIndex((p) => p.id === positionId);
    if (idx === -1) return null;

    const pos = positions[idx];
    if (pos.status !== 'ACTIVE') return pos;

    if (userAddress) {
      // Prompt wallet signature for claiming/cashing out
      await WalletSigner.requestCashOutSigning({
        userAddress,
        position: pos,
      });
    }

    pos.status = 'CASHED_OUT';
    pos.resolvedAt = Date.now();

    const pnl = pos.currentValueUSD - pos.investedUSD;
    const stats = this.getStoredStats();
    stats.netPnLUSD += pnl;
    if (pnl > 0) {
      stats.wins += 1;
      stats.winStreak += 1;
      if (stats.winStreak > stats.maxWinStreak) stats.maxWinStreak = stats.winStreak;
    } else {
      stats.losses += 1;
      stats.winStreak = 0;
    }
    this.saveStats(stats);
    this.savePositions(positions);

    return pos;
  }
}
