/**
 * Trading Engine for Flip
 * Connects directly to Somnia Shannon Testnet via Browser Wallet (MetaMask/Injected)
 * or executes verifiable on-chain transactions.
 */

import {
  BinaryMarket,
  SimpleTradeSide,
  publicClient,
  probabilityToPrice,
  computeDynamicMarketProbability,
} from './dreamdex';
import { SOMNIA_CONFIG } from '../contracts/chain';
import { WalletSigner } from './walletSigner';
import { livePriceStreamer } from './livePriceStream';

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
  status: 'ACTIVE' | 'WON' | 'LOST' | 'CASHED_OUT' | 'CLAIMED' | 'WITHDRAWN';
  txHash?: string;
  createdAt: number;
  resolvedAt?: number;
  // The market's strike price at the time the bet was placed — IMMUTABLE, never changes
  strikePrice?: number;
  // Round expiry at time of bet entry (ms) — used for time-decay cashout math
  marketExpiryMs?: number;
  // Dynamic Real-Time Market Spot Tracking Fields
  entrySpotPrice?: number; // Exact spot price at the moment user placed the bet
  currentSpotPrice?: number; // Real-time ticking spot price from Binance/Oracle
  priceDelta?: number; // currentSpotPrice - entrySpotPrice
  priceDeltaPercent?: number; // % change from entry spot
  favorDirection?: 'FAVORABLE' | 'UNFAVORABLE' | 'NEUTRAL'; // Whether movement favors or opposes prediction
  cashoutPayoutUSD?: number; // Total payout balance credited if cashed out at current price
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

  private static getBalanceKey(userAddress?: string): string {
    const addr = (userAddress || 'session').toLowerCase();
    return `flip_portfolio_balance_${addr}`;
  }

  /**
   * Retrieve the user's accumulated FLIP portfolio balance (capital + profits).
   * Initialized to $500.00 USDso for testnet sessions or reflects persistent deposits/winnings.
   */
  public static getPortfolioBalance(userAddress?: string): number {
    try {
      const key = this.getBalanceKey(userAddress);
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed)) return parsed;
      }
      // For connected Web3 wallets, default to 0 until queried from on-chain RPC
      const initial = userAddress && userAddress.startsWith('0x') ? 0.0 : 500.0;
      localStorage.setItem(key, initial.toString());
      return initial;
    } catch {
      return userAddress && userAddress.startsWith('0x') ? 0.0 : 500.0;
    }
  }

  public static setPortfolioBalance(balance: number, userAddress?: string): number {
    try {
      const key = this.getBalanceKey(userAddress);
      const rounded = Number(Math.max(0, balance).toFixed(2));
      localStorage.setItem(key, rounded.toString());
      return rounded;
    } catch {
      return balance;
    }
  }

  public static creditPortfolioBalance(amount: number, userAddress?: string): number {
    const current = this.getPortfolioBalance(userAddress);
    return this.setPortfolioBalance(current + amount, userAddress);
  }

  public static debitPortfolioBalance(amount: number, userAddress?: string): number {
    const current = this.getPortfolioBalance(userAddress);
    return this.setPortfolioBalance(current - amount, userAddress);
  }

  public static getStoredPositions(): Position[] {
    try {
      const data = localStorage.getItem(this.STORAGE_POSITIONS_KEY);
      if (!data) return [];
      const parsed: Position[] = JSON.parse(data);
      // Clean any legacy personal_sign signature strings (>66 chars) mistakenly stored as txHash
      return parsed.map((p) => {
        if (p.txHash && p.txHash.length > 66) {
          return { ...p, txHash: undefined };
        }
        return p;
      });
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

  /**
   * Clear resolved / settled trades from storage, strictly preserving any active
   * bets currently running and any won bets with unclaimed rewards.
   */
  public static clearResolvedPositions(userAddress?: string): Position[] {
    try {
      const positions = this.getStoredPositions();
      const normalizedUser = userAddress?.toLowerCase();

      const remaining = positions.filter((pos) => {
        // If position belongs to a different wallet, leave it untouched
        if (normalizedUser && pos.userAddress && pos.userAddress.toLowerCase() !== normalizedUser) {
          return true;
        }
        // Strictly preserve trades that are currently active/running, or won & unclaimed
        return pos.status === 'ACTIVE' || pos.status === 'WON';
      });

      this.savePositions(remaining);
      return remaining;
    } catch (err) {
      console.error('Failed to clear resolved positions:', err);
      return this.getStoredPositions();
    }
  }

  public static clearStoredPositions(userAddress?: string): Position[] {
    return this.clearResolvedPositions(userAddress);
  }

  private static getStatsKey(userAddress?: string): string {
    const addr = (userAddress || 'session').toLowerCase();
    return `flip_user_stats_${addr}`;
  }

  public static getStoredStats(userAddress?: string): UserStats {
    try {
      const key = this.getStatsKey(userAddress);
      const data = localStorage.getItem(key) || localStorage.getItem(this.STORAGE_STATS_KEY);
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

  public static saveStats(stats: UserStats, userAddress?: string): void {
    try {
      const key = this.getStatsKey(userAddress);
      localStorage.setItem(key, JSON.stringify(stats));
      localStorage.setItem(this.STORAGE_STATS_KEY, JSON.stringify(stats));
    } catch (err) {
      console.error('Failed to save stats:', err);
    }
  }

  /**
   * Record an on-chain withdrawal transaction in user's Activity ledger
   */
  public static recordWithdrawalPosition(params: {
    userAddress: string;
    amountUSD: number;
    txHash: string;
  }): Position {
    const { userAddress, amountUSD, txHash } = params;
    const newPosition: Position = {
      id: `withdraw-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
      userAddress: userAddress.toLowerCase(),
      marketId: 'somnia-vault-withdrawal',
      marketTitle: 'Somnia Shannon Vault Withdrawal',
      underlyingAsset: 'USDso',
      marketCategory: 'standard',
      side: 'UP',
      entryPrice: 1.0,
      investedUSD: amountUSD,
      contractsCount: amountUSD,
      potentialPayoutUSD: amountUSD,
      potentialMultiplier: 1.0,
      currentPrice: 1.0,
      currentValueUSD: amountUSD,
      cashoutPayoutUSD: amountUSD,
      unrealizedPnLUSD: 0,
      unrealizedPnLPercent: 0,
      status: 'WITHDRAWN',
      txHash,
      createdAt: Date.now(),
      resolvedAt: Date.now(),
    };

    const positions = this.getStoredPositions();
    positions.unshift(newPosition);
    this.savePositions(positions);
    return newPosition;
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

    // Enforce 1-minute (60 seconds) betting lock phase before market resolution
    const expiryMs =
      market.expiryDate instanceof Date
        ? market.expiryDate.getTime()
        : new Date(market.expiryDate || Date.now()).getTime();
    const timeRemainingMs = expiryMs - Date.now();

    if (timeRemainingMs <= 60 * 1000) {
      const remainingSecs = Math.max(0, Math.ceil(timeRemainingMs / 1000));
      throw new Error(
        `Betting is closed 1 minute prior to round settlement (Lock Phase: ${remainingSecs}s to resolution). Please wait for the next round.`
      );
    }

    const entryPrice = side === 'UP' ? market.bestUpProbability : market.bestDownProbability;
    const contractsCount = amountUSD / entryPrice;
    const potentialPayoutUSD = contractsCount * 1.0;
    const potentialMultiplier = potentialPayoutUSD / amountUSD;

    // Capture the exact market spot price at the moment the bet was placed
    const livePrices = livePriceStreamer.getPrices();
    const liveSpot =
      livePrices[market.underlyingAsset]?.price ||
      market.currentPrice ||
      market.strikePrice ||
      1;

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
      // Store the original strike price & expiry — these NEVER change, even after round rollover
      strikePrice: market.strikePrice,
      marketExpiryMs: expiryMs,
      investedUSD: amountUSD,
      contractsCount,
      potentialPayoutUSD,
      potentialMultiplier,
      currentPrice: entryPrice,
      currentValueUSD: amountUSD,
      cashoutPayoutUSD: amountUSD,
      entrySpotPrice: liveSpot,
      currentSpotPrice: liveSpot,
      priceDelta: 0,
      priceDeltaPercent: 0,
      favorDirection: 'NEUTRAL',
      unrealizedPnLUSD: 0,
      unrealizedPnLPercent: 0,
      status: 'ACTIVE',
      txHash,
      createdAt: Date.now(),
    };

    const positions = this.getStoredPositions();
    positions.unshift(newPosition);
    this.savePositions(positions);

    // Automatically debit invested capital from user's persistent FLIP portfolio balance
    this.debitPortfolioBalance(amountUSD, userAddress);

    // Update user stats (keyed per wallet address)
    const stats = this.getStoredStats(userAddress);
    stats.totalTrades += 1;
    stats.totalVolumeUSD += amountUSD;
    this.saveStats(stats, userAddress);

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
    const liveSpot = livePriceStreamer.getPrices()[underlyingAsset]?.price || 1;

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
      cashoutPayoutUSD: amountUSD,
      entrySpotPrice: liveSpot,
      currentSpotPrice: liveSpot,
      priceDelta: 0,
      priceDeltaPercent: 0,
      favorDirection: 'NEUTRAL',
      unrealizedPnLUSD: 0,
      unrealizedPnLPercent: 0,
      status: 'ACTIVE',
      txHash,
      createdAt: Date.now(),
    };

    const positions = this.getStoredPositions();
    positions.unshift(newPosition);
    this.savePositions(positions);

    // Debit entry fee from portfolio balance
    this.debitPortfolioBalance(amountUSD, userAddress);

    const stats = this.getStoredStats(userAddress);
    stats.totalTrades += 1;
    stats.totalVolumeUSD += amountUSD;
    this.saveStats(stats, userAddress);

    return newPosition;
  }

  /**
   * Real-time recalculation of open positions based on live market spot prices and dynamic probabilities.
   * Tracks price movement from entry point, calculates live profit/loss and cashout valuation.
   */
  public static updateActivePositions(
    livePrices: Record<string, { price: number }>,
    markets?: BinaryMarket[]
  ): {
    positions: Position[];
    hasChanged: boolean;
  } {
    const positions = this.getStoredPositions();
    let hasChanged = false;
    const now = Date.now();

    const updated = positions.map((pos) => {
      if (pos.status !== 'ACTIVE') return pos;

      const live = livePrices[pos.underlyingAsset];
      if (!live || !live.price || isNaN(live.price)) return pos;

      const currentSpot = live.price;
      const entrySpot = pos.entrySpotPrice || pos.currentSpotPrice || currentSpot;
      const priceDelta = currentSpot - entrySpot;
      const priceDeltaPercent = entrySpot > 0 ? (priceDelta / entrySpot) * 100 : 0;

      // ─── CASHOUT PROBABILITY CALCULATION ───────────────────────────────────
      // The correct model for a binary prediction market:
      //   P(win) = probability that price closes on the user's winning side of the STRIKE
      //
      // This is purely a function of:
      //   1. How far current spot is from the ORIGINAL strike (not from entry spot)
      //   2. Time remaining until the round the user bet on expires
      //   3. Asset volatility over that time window
      //
      // We ALWAYS use pos.strikePrice (stored at bet time) as the reference,
      // NEVER the entry spot. The strike is the binary trigger — not where user entered.

      // Get the original strike and expiry from the position (stored at bet time)
      const originalStrike = pos.strikePrice;
      const originalExpiryMs = pos.marketExpiryMs;

      // Also try live market as a secondary reference (in case of legacy positions without stored strike)
      const liveMarket = markets?.find((m) => m.marketId === pos.marketId);

      let impliedProbability: number;

      if (originalStrike && originalStrike > 0) {
        // PRIMARY PATH: Use stored original strike price from bet entry
        // If the original round has already expired, time remaining = 0 → treat as a very short window
        const effectiveExpiryMs = originalExpiryMs || (liveMarket?.expiryDate instanceof Date
          ? liveMarket.expiryDate.getTime()
          : now + 60_000);
        const timeRemainingMs = Math.max(0, effectiveExpiryMs - now);

        const { upProb, downProb } = computeDynamicMarketProbability({
          spotPrice: currentSpot,
          strikePrice: originalStrike,
          expiryDate: effectiveExpiryMs,
          underlyingAsset: pos.underlyingAsset,
          now,
        });

        impliedProbability = pos.side === 'UP' ? upProb : downProb;

        // If the original round expired and market has rolled over, clamp to prevent
        // stale positions showing inflated odds (they should just claim/cashout)
        if (timeRemainingMs === 0 && liveMarket) {
          impliedProbability = pos.entryPrice; // freeze at entry price until claimed/resolved
        }

      } else if (liveMarket && liveMarket.strikePrice > 0) {
        // SECONDARY PATH: Use the live market's strike (for legacy positions without stored strike)
        const { upProb, downProb } = computeDynamicMarketProbability({
          spotPrice: currentSpot,
          strikePrice: liveMarket.strikePrice,
          expiryDate: liveMarket.expiryDate,
          underlyingAsset: pos.underlyingAsset,
          now,
        });
        impliedProbability = pos.side === 'UP' ? upProb : downProb;

      } else {
        // LAST RESORT FALLBACK: No market data and no stored strike.
        // Use a calibrated logistic curve anchored to entry spot.
        // This is only hit for squad/custom positions that don't have market data.
        const assetVol = pos.underlyingAsset === 'BTC' ? 0.0018
          : pos.underlyingAsset === 'ETH' ? 0.0024
          : pos.underlyingAsset === 'SOL' ? 0.0040
          : 0.0050;
        // Distance of current spot from entry, normalized to asset sigma
        const distFraction = pos.side === 'UP'
          ? (currentSpot - entrySpot) / (entrySpot || 1)
          : (entrySpot - currentSpot) / (entrySpot || 1);
        // z-score: how many standard deviations has price moved in favored direction
        const z = distFraction / (assetVol || 0.002);
        // Logistic sigmoid — saturates gradually, nowhere near as aggressive as favorFraction * 40
        const baseProb = pos.entryPrice || 0.5;
        const rawProbShift = (1 / (1 + Math.exp(-1.7 * z))) - 0.5; // range: [-0.5, +0.5]
        impliedProbability = Math.min(0.99, Math.max(0.01, baseProb + rawProbShift * 0.8));
      }

      const contracts = pos.contractsCount || pos.investedUSD / (pos.entryPrice || 0.5);
      // Total valuation if cashed out now (contracts × live win-probability)
      const cashoutPayoutUSD = Number((contracts * impliedProbability).toFixed(2));
      const unrealizedPnLUSD = Number((cashoutPayoutUSD - pos.investedUSD).toFixed(2));
      const unrealizedPnLPercent =
        pos.investedUSD > 0 ? Number(((unrealizedPnLUSD / pos.investedUSD) * 100).toFixed(1)) : 0;

      const favorDirection: 'FAVORABLE' | 'UNFAVORABLE' | 'NEUTRAL' =
        unrealizedPnLUSD > 0.02
          ? 'FAVORABLE'
          : unrealizedPnLUSD < -0.02
          ? 'UNFAVORABLE'
          : 'NEUTRAL';

      if (
        pos.currentSpotPrice === currentSpot &&
        pos.cashoutPayoutUSD === cashoutPayoutUSD &&
        pos.entrySpotPrice === entrySpot &&
        pos.currentPrice === Number(impliedProbability.toFixed(2))
      ) {
        return pos;
      }

      hasChanged = true;
      return {
        ...pos,
        entrySpotPrice: entrySpot,
        currentSpotPrice: currentSpot,
        priceDelta: Number(priceDelta.toFixed(4)),
        priceDeltaPercent: Number(priceDeltaPercent.toFixed(2)),
        favorDirection,
        currentPrice: Number(impliedProbability.toFixed(2)),
        currentValueUSD: cashoutPayoutUSD,
        cashoutPayoutUSD,
        unrealizedPnLUSD,
        unrealizedPnLPercent,
      };
    });

    if (hasChanged) {
      this.savePositions(updated);
    }
    return { positions: updated, hasChanged };
  }

  /**
   * Cash out an active position with wallet signature and dynamic payout
   */
  public static async cashOutPosition(positionId: string, userAddress?: string): Promise<Position | null> {
    const positions = this.getStoredPositions();
    const idx = positions.findIndex((p) => p.id === positionId);
    if (idx === -1) return null;

    const pos = positions[idx];
    if (pos.status !== 'ACTIVE' && pos.status !== 'WON') return pos;

    const isWonClaim = pos.status === 'WON';

    // If position was already WON, payout is the full winning payout; otherwise use current cashout valuation
    const payoutUSD = isWonClaim
      ? pos.potentialPayoutUSD
      : pos.cashoutPayoutUSD !== undefined
      ? pos.cashoutPayoutUSD
      : pos.currentValueUSD;

    const effectiveAddress =
      userAddress ||
      pos.userAddress ||
      (typeof window !== 'undefined' && (window as any).ethereum?.selectedAddress);

    if (effectiveAddress) {
      // Broadcast on-chain settlement/claim transaction on Somnia Shannon
      const signRes = await WalletSigner.requestCashOutSigning({
        userAddress: effectiveAddress,
        position: pos,
        payoutUSD,
      });
      if (signRes?.txHash && signRes.txHash.startsWith('0x') && signRes.txHash.length === 66) {
        pos.txHash = signRes.txHash;
      }
    }

    pos.status = isWonClaim ? 'CLAIMED' : 'CASHED_OUT';
    pos.resolvedAt = Date.now();
    pos.currentValueUSD = payoutUSD;
    pos.cashoutPayoutUSD = payoutUSD;

    // Automatically credit the entire cashed out return (principal + profit) into user's portfolio balance!
    this.creditPortfolioBalance(payoutUSD, effectiveAddress);

    const pnl = Number((payoutUSD - pos.investedUSD).toFixed(2));
    pos.unrealizedPnLUSD = pnl;
    pos.unrealizedPnLPercent = pos.investedUSD > 0 ? Number(((pnl / pos.investedUSD) * 100).toFixed(1)) : 0;

    // Only update stats for early cashouts; WON positions already have their win/PnL stats recorded upon round resolution
    if (!isWonClaim) {
      const stats = this.getStoredStats(effectiveAddress);
      stats.netPnLUSD += pnl;
      if (pnl >= 0) {
        stats.wins += 1;
        stats.winStreak += 1;
        if (stats.winStreak > stats.maxWinStreak) stats.maxWinStreak = stats.winStreak;
      } else {
        stats.losses += 1;
        stats.winStreak = 0;
      }
      this.saveStats(stats, effectiveAddress);
    }
    this.savePositions(positions);

    return pos;
  }

  /**
   * Resolve all active user positions for a market when its round timer expires.
   * Settles contract on-chain and marks position as WON (claimable) or LOST.
   * Note: Winning funds are NOT credited here; they are held as claimable rewards
   * until the user claims them via "CLAIM PAYOUT" or "CLAIM ALL WINNINGS".
   */
  public static resolvePositionsForMarket(
    marketId: string,
    winningSide: SimpleTradeSide,
    resolutionTxHash?: string
  ): { wonCount: number; wonUSD: number } {
    const positions = this.getStoredPositions();
    let wonCount = 0;
    let wonUSD = 0;
    let changed = false;

    // Build a per-user stats map so each wallet address gets its own persisted stats
    const userStatsMap: Record<string, UserStats> = {};

    for (const pos of positions) {
      if (pos.marketId === marketId && pos.status === 'ACTIVE') {
        pos.resolvedAt = Date.now();
        // Preserve the original on-chain placement txHash
        changed = true;

        const addr = pos.userAddress || 'session';
        if (!userStatsMap[addr]) {
          userStatsMap[addr] = this.getStoredStats(addr);
        }
        const userStats = userStatsMap[addr];

        if (pos.side === winningSide) {
          pos.status = 'WON';
          pos.currentValueUSD = pos.potentialPayoutUSD;
          pos.cashoutPayoutUSD = pos.potentialPayoutUSD;
          pos.unrealizedPnLUSD = pos.potentialPayoutUSD - pos.investedUSD;
          pos.unrealizedPnLPercent = ((pos.potentialPayoutUSD - pos.investedUSD) / pos.investedUSD) * 100;
          wonCount += 1;
          wonUSD += pos.potentialPayoutUSD;

          // Note: Payout is NOT credited to balance here.
          // It is preserved as claimable rewards so the user can claim it once via the "CLAIM PAYOUT" action.

          userStats.wins += 1;
          userStats.winStreak += 1;
          if (userStats.winStreak > userStats.maxWinStreak) userStats.maxWinStreak = userStats.winStreak;
          userStats.netPnLUSD += pos.unrealizedPnLUSD;
        } else {
          pos.status = 'LOST';
          pos.currentValueUSD = 0;
          pos.cashoutPayoutUSD = 0;
          pos.unrealizedPnLUSD = -pos.investedUSD;
          pos.unrealizedPnLPercent = -100;

          userStats.losses += 1;
          userStats.winStreak = 0;
          userStats.netPnLUSD -= pos.investedUSD;
        }
      }
    }

    if (changed) {
      this.savePositions(positions);
      // Persist updated stats for each user address involved in this resolution
      for (const [addr, userStats] of Object.entries(userStatsMap)) {
        this.saveStats(userStats, addr === 'session' ? undefined : addr);
      }
    }

    return { wonCount, wonUSD };
  }
}
