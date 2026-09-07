/**
 * Private Challenge Markets (Squad PvP) Engine
 * Manages private squad prediction rooms, shareable links, QR codes,
 * and on-chain parimutuel fee & payout settlement.
 */

import { SimpleTradeSide } from './dreamdex';

export interface ChallengeParticipant {
  address: string;
  side: SimpleTradeSide; // 'UP' | 'DOWN'
  amountUSD: number;
  txHash: string;
  joinedAt: number;
  payoutUSD?: number;
}

export interface PrivateChallenge {
  id: string;
  title: string;
  creatorAddress: string;
  underlyingAsset: string;
  strikePrice: number;
  initialSpotPrice: number;
  finalSpotPrice?: number;
  entryFeeUSD: number;
  maxParticipants: number;
  participants: ChallengeParticipant[];
  expiryTimestampMs: number;
  status: 'OPEN' | 'RUNNING' | 'RESOLVED';
  winningOutcome: SimpleTradeSide | null;
  totalPotUSD: number;
  protocolFeeUSD: number;
  ecosystemFeeUSD: number;
  resolutionType: 'UNANIMOUS_WIN' | 'UNANIMOUS_LOSS' | 'PARIMUTUEL_SPLIT' | null;
  createdAt: number;
}

const STORAGE_CHALLENGES_KEY = 'flip_private_challenges';

export class ChallengeEngine {
  public static getStoredChallenges(): PrivateChallenge[] {
    try {
      const data = localStorage.getItem(STORAGE_CHALLENGES_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fallback
    }

    return [];
  }

  public static saveChallenges(challenges: PrivateChallenge[]): void {
    try {
      localStorage.setItem(STORAGE_CHALLENGES_KEY, JSON.stringify(challenges));
    } catch (err) {
      console.error('[FLIP] Error saving private challenges:', err);
    }
  }

  public static createChallenge(params: {
    title: string;
    creatorAddress: string;
    underlyingAsset: string;
    strikePrice: number;
    initialSpotPrice: number;
    entryFeeUSD: number;
    maxParticipants: number;
    durationMinutes: number;
    creatorSide: SimpleTradeSide;
    txHash: string;
  }): PrivateChallenge {
    const now = Date.now();
    const id = `squad-${params.underlyingAsset.toLowerCase()}-${Date.now().toString(36)}`;

    const newChallenge: PrivateChallenge = {
      id,
      title: params.title || `${params.underlyingAsset} Squad Strike Challenge`,
      creatorAddress: params.creatorAddress,
      underlyingAsset: params.underlyingAsset,
      strikePrice: params.strikePrice,
      initialSpotPrice: params.initialSpotPrice,
      entryFeeUSD: params.entryFeeUSD,
      maxParticipants: params.maxParticipants,
      participants: [
        {
          address: params.creatorAddress,
          side: params.creatorSide,
          amountUSD: params.entryFeeUSD,
          txHash: params.txHash,
          joinedAt: now,
        },
      ],
      expiryTimestampMs: now + params.durationMinutes * 60 * 1000,
      status: 'OPEN',
      winningOutcome: null,
      totalPotUSD: params.entryFeeUSD,
      protocolFeeUSD: 0,
      ecosystemFeeUSD: 0,
      resolutionType: null,
      createdAt: now,
    };

    const challenges = this.getStoredChallenges();
    this.saveChallenges([newChallenge, ...challenges]);
    return newChallenge;
  }

  public static joinChallenge(params: {
    challengeId: string;
    userAddress: string;
    side: SimpleTradeSide;
    txHash: string;
  }): PrivateChallenge | null {
    const challenges = this.getStoredChallenges();
    const challenge = challenges.find((c) => c.id === params.challengeId);
    if (!challenge) return null;

    if (challenge.participants.length >= challenge.maxParticipants) {
      throw new Error('Squad is already full.');
    }

    if (challenge.participants.some((p) => p.address.toLowerCase() === params.userAddress.toLowerCase())) {
      throw new Error('You have already joined this squad challenge.');
    }

    challenge.participants.push({
      address: params.userAddress,
      side: params.side,
      amountUSD: challenge.entryFeeUSD,
      txHash: params.txHash,
      joinedAt: Date.now(),
    });

    challenge.totalPotUSD = challenge.participants.reduce((sum, p) => sum + p.amountUSD, 0);

    if (challenge.participants.length >= challenge.maxParticipants) {
      challenge.status = 'RUNNING';
    }

    this.saveChallenges(challenges);
    return challenge;
  }

  /**
   * Settle Private Challenge according to DreamDEX Parimutuel & Protocol rules
   */
  public static settleChallenge(challengeId: string, finalSpotPrice: number): PrivateChallenge | null {
    const challenges = this.getStoredChallenges();
    const challenge = challenges.find((c) => c.id === challengeId);
    if (!challenge || challenge.status === 'RESOLVED') return challenge || null;

    challenge.finalSpotPrice = finalSpotPrice;
    const winningOutcome: SimpleTradeSide = finalSpotPrice >= challenge.strikePrice ? 'UP' : 'DOWN';
    challenge.winningOutcome = winningOutcome;
    challenge.status = 'RESOLVED';

    const winners = challenge.participants.filter((p) => p.side === winningOutcome);
    const losers = challenge.participants.filter((p) => p.side !== winningOutcome);

    const totalPot = challenge.totalPotUSD;
    const feeRate = 0.02; // 2% FLIP Protocol fee

    if (winners.length === challenge.participants.length) {
      // Scenario A: Everyone won unanimously -> All deposits returned + 100% win share
      challenge.resolutionType = 'UNANIMOUS_WIN';
      challenge.protocolFeeUSD = 0;
      challenge.ecosystemFeeUSD = 0;
      for (const p of challenge.participants) {
        p.payoutUSD = p.amountUSD;
      }
    } else if (losers.length === challenge.participants.length) {
      // Scenario B: Everyone lost unanimously -> Pot routes to DreamDEX Ecosystem + 2% Protocol fee
      challenge.resolutionType = 'UNANIMOUS_LOSS';
      challenge.protocolFeeUSD = totalPot * feeRate;
      challenge.ecosystemFeeUSD = totalPot * (1 - feeRate);
      for (const p of challenge.participants) {
        p.payoutUSD = 0;
      }
    } else {
      // Scenario C: Mixed winners & losers -> Parimutuel split of losers' pot to winners
      challenge.resolutionType = 'PARIMUTUEL_SPLIT';
      const losersPot = losers.reduce((sum, l) => sum + l.amountUSD, 0);
      const protocolFee = losersPot * feeRate;
      const distributableLosersPot = losersPot - protocolFee;

      challenge.protocolFeeUSD = protocolFee;
      challenge.ecosystemFeeUSD = 0;

      const totalWinnersBet = winners.reduce((sum, w) => sum + w.amountUSD, 0);

      for (const p of challenge.participants) {
        if (p.side === winningOutcome) {
          const share = p.amountUSD / (totalWinnersBet || 1);
          p.payoutUSD = p.amountUSD + distributableLosersPot * share;
        } else {
          p.payoutUSD = 0;
        }
      }
    }

    this.saveChallenges(challenges);
    return challenge;
  }

  public static getShareableUrl(challengeId: string): string {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.origin);
      url.searchParams.set('challenge', challengeId);
      return url.toString();
    }
    return `https://flip.somnia.network/?challenge=${challengeId}`;
  }
}
