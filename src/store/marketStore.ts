import { create } from 'zustand';
import {
  BinaryMarket,
  fetchLiveBinaryMarkets,
  fetchLiveCryptoPrices,
  fetchOnchainBalances,
  getCanonical15mEpoch,
  computeDynamicMarketProbability,
} from '../services/dreamdex';
import { livePriceStreamer } from '../services/livePriceStream';
import { Position, TradingEngine, UserStats } from '../services/tradingEngine';
import { PrivateChallenge, ChallengeEngine } from '../services/challengeEngine';
import { SOMNIA_CONFIG } from '../contracts/chain';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  txHash?: string;
  timestamp: number;
}

interface MarketState {
  markets: BinaryMarket[];
  userCreatedMarkets: BinaryMarket[];
  privateChallenges: PrivateChallenge[];
  selectedMarketId: string;
  userBalanceUSD: number; // tUSDC (6 decimals)
  userGasSTT: number; // STT (18 decimals)
  userAddress: string | null;
  authSignature: string | null;
  isConnected: boolean;
  currentChainId: number | null;
  isCorrectNetwork: boolean;
  positions: Position[];
  stats: UserStats;
  isLiveStreaming: boolean;
  toasts: ToastNotification[];
  
  // Actions
  setSelectedMarketId: (id: string) => void;
  setUserAddress: (address: string | null) => void;
  setAuthSignature: (sig: string | null) => void;
  disconnectSession: () => void;
  setChainId: (chainId: number) => void;
  setUserBalance: (balanceUSD: number, gasSTT?: number) => void;
  refreshBalances: () => Promise<void>;
  loadInitialData: () => Promise<void>;
  pollLiveMarketPrices: () => Promise<void>;
  checkAndRolloverMarkets: (currentPrices?: Record<string, any>) => void;
  refreshPositions: () => void;
  clearPositions: () => void;
  addUserCreatedMarket: (market: BinaryMarket) => void;
  addPrivateChallenge: (challenge: PrivateChallenge) => void;
  refreshChallenges: () => void;
  updateMarketProbabilities: (marketId: string, upProb: number) => void;
  tickLiveOddsAndPositions: () => void;
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  /** Persistent set of seen position event keys: `${pos.id}:${pos.status}` */
  seenActivityKeys: string[];
  /** Reactively tracked unseen activity count */
  unseenActivityCount: number;
  /** Backwards compatible count */
  lastSeenPositionCount: number;
  /** Call when user opens the Activity tab to clear the badge and persist viewed state */
  markActivityViewed: () => void;
}

let livePollInterval: any = null;
let rolloverInterval: any = null;
const STORAGE_USER_MARKETS_KEY = 'flip_user_created_markets';
const STORAGE_CHALLENGES_KEY = 'flip_private_challenges';

const getSeenActivityStorageKey = (userAddress?: string | null): string => {
  const addr = (userAddress || 'session').toLowerCase();
  return `flip_seen_activity_${addr}`;
};

const saveStoredSeenKeys = (seenKeys: string[], userAddress?: string | null) => {
  try {
    const key = getSeenActivityStorageKey(userAddress);
    localStorage.setItem(key, JSON.stringify(seenKeys));
  } catch (e) {
    console.warn('[FLIP] Failed to save seen activity keys:', e);
  }
};

const loadStoredSeenKeys = (userAddress?: string | null, existingPositions?: Position[]): string[] => {
  try {
    const key = getSeenActivityStorageKey(userAddress);
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    } else if (existingPositions && existingPositions.length > 0) {
      // First time initializing: mark all existing historical positions as already seen
      // so page reload never shows old past activity as unread notifications
      const initialKeys = Array.from(new Set(existingPositions.map((p) => `${p.id}:${p.status}`)));
      saveStoredSeenKeys(initialKeys, userAddress);
      return initialKeys;
    }
  } catch {}
  return [];
};

const computeUnseenCount = (
  positions: Position[],
  userAddress: string | null,
  seenKeys: string[]
): number => {
  if (!userAddress) return 0;
  const normalizedUser = userAddress.toLowerCase();
  const seenSet = new Set(seenKeys);
  let count = 0;
  for (const p of positions) {
    if (!p.userAddress || p.userAddress.toLowerCase() === normalizedUser) {
      const key = `${p.id}:${p.status}`;
      if (!seenSet.has(key)) {
        count++;
      }
    }
  }
  return count;
};

/**
 * Computes a realistic, volatility-calibrated next prediction strike.
 * Anchored strictly to the closing resolution price within achievable short-interval expected move bands:
 * - BTC (15m): $20 - $55 achievable move
 * - ETH (15m): $2 - $5 achievable move
 * - SOL (15m): $0.40 - $0.80 achievable move
 * - SOMI (15m): $0.0015 - $0.0030 achievable move
 * - SUI (15m): $0.0020 - $0.0040 achievable move
 */
function computeDynamicRolloverStrike(
  resolvedPrice: number,
  asset: string,
  winningSide: 'UP' | 'DOWN',
  roundNum: number
): number {
  const sign = winningSide === 'UP' ? 1 : -1;

  if (asset === 'BTC') {
    const variance = (roundNum * 7 + (Math.round(resolvedPrice) % 19)) % 36;
    const pointSpread = 20 + variance;
    return Math.round(resolvedPrice) + pointSpread * sign;
  } else if (asset === 'ETH') {
    const variance = (roundNum * 3 + (Math.round(resolvedPrice) % 5)) % 4;
    const pointSpread = 2 + variance;
    return Math.round(resolvedPrice) + pointSpread * sign;
  } else if (asset === 'SOL') {
    const pointSpread = 0.50;
    return Number((resolvedPrice + pointSpread * sign).toFixed(2));
  } else if (asset === 'SUI') {
    const pointSpread = 0.0025;
    return Number((resolvedPrice + pointSpread * sign).toFixed(4));
  } else if (asset === 'SOMI' || asset === 'SOMNIA') {
    const pointSpread = 0.0018;
    return Number((resolvedPrice + pointSpread * sign).toFixed(4));
  }

  return resolvedPrice >= 10
    ? Math.round(resolvedPrice + sign * 1)
    : Number((resolvedPrice * (1 + sign * 0.005)).toFixed(4));
}

export const useMarketStore = create<MarketState>((set, get) => ({
  markets: [],
  userCreatedMarkets: [],
  privateChallenges: [],
  selectedMarketId: 'somnia-btc-15m',
  userBalanceUSD: 0.0,
  userGasSTT: 0.0,
  userAddress: null,
  authSignature: null,
  isConnected: false,
  currentChainId: null,
  isCorrectNetwork: true,
  positions: [],
  isLiveStreaming: false,
  toasts: [],
  seenActivityKeys: [],
  unseenActivityCount: 0,
  lastSeenPositionCount: 0,
  stats: {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winStreak: 0,
    maxWinStreak: 0,
    totalVolumeUSD: 0,
    netPnLUSD: 0,
  },

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastNotification = {
      ...toast,
      id,
      timestamp: Date.now(),
    };
    set((state) => ({
      toasts: [newToast, ...state.toasts].slice(0, 5), // Keep max 5 toasts
    }));
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },

  markActivityViewed: () => {
    const userAddr = get().userAddress;
    const currentPositions = get().positions;
    const normalizedUser = userAddr ? userAddr.toLowerCase() : 'session';
    const seenSet = new Set(get().seenActivityKeys);
    for (const p of currentPositions) {
      if (!p.userAddress || p.userAddress.toLowerCase() === normalizedUser) {
        seenSet.add(`${p.id}:${p.status}`);
      }
    }
    const updatedSeenKeys = Array.from(seenSet);
    saveStoredSeenKeys(updatedSeenKeys, userAddr);
    set({
      seenActivityKeys: updatedSeenKeys,
      unseenActivityCount: 0,
      lastSeenPositionCount: currentPositions.length,
    });
  },

  setSelectedMarketId: (id: string) => set({ selectedMarketId: id }),

  setChainId: (chainId: number) => {
    set({
      currentChainId: chainId,
      isCorrectNetwork: chainId === SOMNIA_CONFIG.chainId,
    });
  },

  setAuthSignature: (sig: string | null) => {
    set({ authSignature: sig });
  },

  disconnectSession: () => {
    set({
      userAddress: null,
      authSignature: null,
      isConnected: false,
      userBalanceUSD: 0.0,
      userGasSTT: 0.0,
    });
  },

  setUserAddress: (address: string | null) => {
    const current = get().userAddress;
    const normalizedCurrent = current ? current.toLowerCase() : null;
    const normalizedNew = address ? address.toLowerCase() : null;
    if (normalizedCurrent === normalizedNew) return;

    set({
      userAddress: address,
      isConnected: !!address,
    });
    if (!address) {
      set({
        authSignature: null,
        isConnected: false,
        userBalanceUSD: 0.0,
        userGasSTT: 0.0,
        lastSeenPositionCount: 0,
        unseenActivityCount: 0,
        seenActivityKeys: [],
      });
      get().refreshPositions();
    } else if (address.startsWith('0x')) {
      const portfolioBal = TradingEngine.getPortfolioBalance(address);
      const storedPositions = TradingEngine.getStoredPositions();
      const seenKeys = loadStoredSeenKeys(address, storedPositions);
      const unseen = computeUnseenCount(storedPositions, address, seenKeys);
      set({
        userBalanceUSD: portfolioBal,
        seenActivityKeys: seenKeys,
        unseenActivityCount: unseen,
        lastSeenPositionCount: Math.max(0, storedPositions.length - unseen),
      });
      get().refreshPositions();
      get().refreshBalances();
    }
  },

  refreshBalances: async () => {
    const address = get().userAddress;
    if (!address || !address.startsWith('0x')) return;

    try {
      const balances = await fetchOnchainBalances(address as `0x${string}`);
      TradingEngine.setPortfolioBalance(balances.usdcBalance, address);
      set({
        userGasSTT: balances.sttGas,
        userBalanceUSD: balances.usdcBalance,
      });
    } catch (err) {
      console.warn('[FLIP] Error refreshing balances:', err);
    }
  },

  setUserBalance: (balanceUSD: number, gasSTT?: number) => {
    const address = get().userAddress;
    TradingEngine.setPortfolioBalance(balanceUSD, address || undefined);
    set((state) => ({
      userBalanceUSD: balanceUSD,
      userGasSTT: gasSTT !== undefined ? gasSTT : state.userGasSTT,
    }));
  },

  addUserCreatedMarket: (market: BinaryMarket) => {
    set((state) => {
      const updated = [market, ...state.userCreatedMarkets];
      try {
        localStorage.setItem(STORAGE_USER_MARKETS_KEY, JSON.stringify(updated));
      } catch {}
      return {
        userCreatedMarkets: updated,
        markets: [market, ...state.markets],
        selectedMarketId: market.marketId,
      };
    });
  },

  addPrivateChallenge: (challenge: PrivateChallenge) => {
    set((state) => {
      const updated = [challenge, ...state.privateChallenges];
      try {
        localStorage.setItem(STORAGE_CHALLENGES_KEY, JSON.stringify(updated));
      } catch {}
      return { privateChallenges: updated };
    });
  },

  refreshChallenges: () => {
    const stored = ChallengeEngine.getStoredChallenges();
    set({ privateChallenges: stored });
  },

  checkAndRolloverMarkets: (oraclePrices?: Record<string, { price: number }>) => {
    const now = Date.now();
    const freshOraclePrices = oraclePrices || livePriceStreamer.getPrices();
    let marketsUpdated = false;

    const currentMarkets = get().markets;
    const updatedMarkets = currentMarkets.map((m) => {
      if (now >= m.expiryDate.getTime()) {
        marketsUpdated = true;

        // Strictly use fresh live oracle spot price at the exact moment of timer completion
        const livePrice =
          freshOraclePrices[m.underlyingAsset]?.price ||
          livePriceStreamer.getPrices()[m.underlyingAsset]?.price;

        if (!livePrice || isNaN(livePrice)) {
          return m;
        }

        const winningSide: 'UP' | 'DOWN' = livePrice >= m.strikePrice ? 'UP' : 'DOWN';

        // 1. Settle open user positions for this market and mark won predictions as claimable
        const { wonCount, wonUSD } = TradingEngine.resolvePositionsForMarket(m.marketId, winningSide);

        if (wonCount > 0) {
          get().addToast({
            type: 'success',
            title: `${m.underlyingAsset} Prediction Won! (+$${wonUSD.toFixed(2)})`,
            message: `Round resolved ${winningSide} (Strike: $${m.strikePrice.toLocaleString()} vs Spot: $${livePrice.toLocaleString()}). Click 'Claim Payout' in your Activity ledger to redeem rewards directly to your wallet.`,
          });
        }

        // 2. Spawn the NEXT round with a fresh strike anchored to the previous closing price & current spot
        const isCustom = !m.marketId.startsWith('somnia-');
        const nextDurationMs = isCustom && m.marketId.includes('1h') ? 60 * 60 * 1000 : 15 * 60 * 1000;
        let nextExpiryDate: Date;
        if (isCustom) {
          nextExpiryDate = new Date(now + nextDurationMs);
        } else {
          const epoch = getCanonical15mEpoch(now);
          const nextExpiryMs =
            epoch.expiryDate.getTime() <= now
              ? epoch.expiryDate.getTime() + 15 * 60 * 1000
              : epoch.expiryDate.getTime();
          nextExpiryDate = new Date(nextExpiryMs);
        }

        // Dynamically compute next strike price anchored authentically to closing price
        const newRoundNum = (m.roundNumber || 1) + 1;
        const nextStrike = computeDynamicRolloverStrike(
          livePrice,
          m.underlyingAsset,
          winningSide,
          newRoundNum
        );

        const { upProb: nextUpProb, downProb: nextDownProb } = computeDynamicMarketProbability({
          spotPrice: livePrice,
          strikePrice: nextStrike,
          expiryDate: nextExpiryDate,
          underlyingAsset: m.underlyingAsset,
          now,
        });
        const formattedStrikeStr = nextStrike < 1 ? nextStrike.toFixed(4) : nextStrike.toLocaleString(undefined, { minimumFractionDigits: nextStrike % 1 !== 0 ? 2 : 0 });

        return {
          ...m,
          strikePrice: nextStrike,
          currentPrice: livePrice,
          lastClosePrice: livePrice,
          previousRoundWinningOutcome: winningSide,
          roundNumber: newRoundNum,
          description: `Will ${m.underlyingAsset} finish above $${formattedStrikeStr} USD? Resolves via DreamDEX TWAP.`,
          expiryDate: nextExpiryDate,
          expiryTimestampNs: BigInt(nextExpiryDate.getTime()) * 1_000_000n,
          bestUpProbability: nextUpProb,
          bestDownProbability: nextDownProb,
          isResolved: false,
          lastUpdated: now,
        };
      }

      return m;
    });

    if (marketsUpdated) {
      set({ markets: updatedMarkets });
      get().refreshPositions();
      const currentAddr = get().userAddress;
      if (currentAddr && currentAddr.startsWith('0x')) {
        get().refreshBalances();
      } else {
        set({ userBalanceUSD: TradingEngine.getPortfolioBalance(currentAddr || undefined) });
      }
    }
  },

  pollLiveMarketPrices: async () => {
    try {
      await livePriceStreamer.fetchRestPrices();
    } catch (err) {
      console.warn('[FLIP] Error polling live crypto prices:', err);
    }
  },

  loadInitialData: async () => {
    const liveMarkets = await fetchLiveBinaryMarkets();
    let storedUserMarkets: BinaryMarket[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_USER_MARKETS_KEY);
      if (raw) storedUserMarkets = JSON.parse(raw);
    } catch {}
    const storedPositions = TradingEngine.getStoredPositions();
    const storedStats = TradingEngine.getStoredStats();
    const storedChallenges = ChallengeEngine.getStoredChallenges();
    const currentAddr = get().userAddress;
    const initialPortfolioBal = TradingEngine.getPortfolioBalance(currentAddr || undefined);
    const seenKeys = loadStoredSeenKeys(currentAddr, storedPositions);
    const unseen = computeUnseenCount(storedPositions, currentAddr, seenKeys);

    set({
      markets: [...storedUserMarkets, ...liveMarkets],
      userCreatedMarkets: storedUserMarkets,
      privateChallenges: storedChallenges,
      positions: storedPositions,
      stats: storedStats,
      userBalanceUSD: initialPortfolioBal,
      isLiveStreaming: true,
      seenActivityKeys: seenKeys,
      unseenActivityCount: unseen,
      lastSeenPositionCount: Math.max(0, storedPositions.length - unseen),
    });

    // Subscribe to live spot price ticks with change-detection guard
    livePriceStreamer.subscribe((livePrices) => {
      get().checkAndRolloverMarkets(livePrices);

      set((state) => {
        let hasAnyChange = false;
        const now = Date.now();

        const updatedMarkets = state.markets.map((m) => {
          const live = livePrices[m.underlyingAsset];
          if (!live) return m;

          const { upProb, downProb } = computeDynamicMarketProbability({
            spotPrice: live.price,
            strikePrice: m.strikePrice,
            expiryDate: m.expiryDate,
            underlyingAsset: m.underlyingAsset,
            now,
          });

          if (
            m.currentPrice === live.price &&
            m.bestUpProbability === upProb &&
            m.bestDownProbability === downProb &&
            m.change24h === live.change24h &&
            m.high24h === live.high24h &&
            m.low24h === live.low24h
          ) {
            return m;
          }

          hasAnyChange = true;
          return {
            ...m,
            currentPrice: live.price,
            change24h: live.change24h,
            high24h: live.high24h,
            low24h: live.low24h,
            bestUpProbability: upProb,
            bestDownProbability: downProb,
            lastUpdated: now,
          };
        });

        // Real-time dynamic revaluation of active positions with current market probabilities
        const { positions: updatedPositions, hasChanged: positionsChanged } =
          TradingEngine.updateActivePositions(livePrices, updatedMarkets);

        if (!hasAnyChange && !positionsChanged) return state;
        return {
          markets: hasAnyChange ? updatedMarkets : state.markets,
          positions: positionsChanged ? updatedPositions : state.positions,
        };
      });
    });

    // Check connected chain ID from window.ethereum
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' });
        const chainId = parseInt(chainIdHex, 16);
        get().setChainId(chainId);

        (window as any).ethereum.on('chainChanged', (newChainHex: string) => {
          get().setChainId(parseInt(newChainHex, 16));
        });

        (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length > 0) {
            get().setUserAddress(accounts[0]);
          } else {
            get().setUserAddress(null);
          }
        });
      } catch (e) {
        console.warn('[FLIP] Chain detection check:', e);
      }
    }

    if (!livePollInterval) {
      livePollInterval = setInterval(() => {
        if (get().userAddress) {
          get().refreshBalances();
        }
      }, 4000);
    }

    if (!rolloverInterval) {
      rolloverInterval = setInterval(() => {
        get().checkAndRolloverMarkets();
      }, 1000);
    }
  },

  refreshPositions: () => {
    const userAddr = get().userAddress;
    const storedPositions = TradingEngine.getStoredPositions();
    const storedStats = TradingEngine.getStoredStats(userAddr || undefined);
    const seenKeys = get().seenActivityKeys.length > 0
      ? get().seenActivityKeys
      : loadStoredSeenKeys(userAddr, storedPositions);
    const unseen = computeUnseenCount(storedPositions, userAddr, seenKeys);
    set({
      positions: storedPositions,
      stats: storedStats,
      seenActivityKeys: seenKeys,
      unseenActivityCount: unseen,
      lastSeenPositionCount: Math.max(0, storedPositions.length - unseen),
    });
  },

  clearPositions: () => {
    const userAddr = get().userAddress;
    const remaining = TradingEngine.clearResolvedPositions(userAddr || undefined);
    set({
      positions: remaining,
    });
    get().refreshPositions();
  },

  updateMarketProbabilities: (marketId: string, upProb: number) => {
    const clampedUp = Math.min(Math.max(upProb, 0.02), 0.98);
    const downProb = Number((1 - clampedUp).toFixed(2));

    set((state) => ({
      markets: state.markets.map((m) =>
        m.marketId === marketId
          ? {
              ...m,
              bestUpProbability: clampedUp,
              bestDownProbability: downProb,
            }
          : m
      ),
    }));
  },

  tickLiveOddsAndPositions: () => {
    const livePrices = livePriceStreamer.getPrices();
    const state = get();
    const now = Date.now();
    let hasAnyChange = false;

    const updatedMarkets = state.markets.map((m) => {
      const live = livePrices[m.underlyingAsset];
      const spot = live?.price || m.currentPrice;
      if (!spot) return m;

      const { upProb, downProb } = computeDynamicMarketProbability({
        spotPrice: spot,
        strikePrice: m.strikePrice,
        expiryDate: m.expiryDate,
        underlyingAsset: m.underlyingAsset,
        now,
      });

      if (
        m.bestUpProbability === upProb &&
        m.bestDownProbability === downProb &&
        (!live || m.currentPrice === live.price)
      ) {
        return m;
      }

      hasAnyChange = true;
      return {
        ...m,
        currentPrice: spot,
        bestUpProbability: upProb,
        bestDownProbability: downProb,
        lastUpdated: now,
      };
    });

    const { positions: updatedPositions, hasChanged: positionsChanged } =
      TradingEngine.updateActivePositions(livePrices, updatedMarkets);

    if (hasAnyChange || positionsChanged) {
      set({
        markets: hasAnyChange ? updatedMarkets : state.markets,
        positions: positionsChanged ? updatedPositions : state.positions,
      });
    }
  },
}));
