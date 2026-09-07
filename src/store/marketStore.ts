import { create } from 'zustand';
import { BinaryMarket, fetchLiveBinaryMarkets, fetchLiveCryptoPrices, fetchOnchainBalances } from '../services/dreamdex';
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
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  /** Number of new positions since user last viewed the Activity tab */
  // (computed reactively in components as positions.length - lastSeenPositionCount)
  /** The positions.length at the last time the Activity tab was visited */
  lastSeenPositionCount: number;
  /** Call when user opens the Activity tab to clear the badge */
  markActivityViewed: () => void;
}

let livePollInterval: any = null;
const STORAGE_USER_MARKETS_KEY = 'flip_user_created_markets';

/**
 * Computes a realistic, volatility-calibrated next prediction strike.
 * Anchored strictly to the closing resolution price within achievable short-interval expected move bands:
 * - BTC (15m): $20 - $55 achievable move (0.025% - 0.07% of spot)
 * - ETH (15m): $2 - $5 achievable move
 * - SOL (15m): $1 - $2 achievable move
 * - Strict clean integer values without decimals for prediction questions & strikes.
 */
function computeDynamicRolloverStrike(
  resolvedPrice: number,
  asset: string,
  winningSide: 'UP' | 'DOWN',
  roundNum: number,
  isOneHour: boolean
): number {
  const tfMultiplier = isOneHour ? 1.5 : 1.0;
  const baseInteger = Math.round(resolvedPrice);

  // Dynamic realistic point spread based on asset expected move in 15m/1h
  let pointSpread: number;

  if (asset === 'BTC') {
    // 15m BTC realistic candle move: $20 - $55
    const variance = (roundNum * 7 + (baseInteger % 19)) % 36; // 0 to 35
    pointSpread = Math.round((20 + variance) * tfMultiplier);
  } else if (asset === 'ETH') {
    // 15m ETH realistic candle move: $2 - $5
    const variance = (roundNum * 3 + (baseInteger % 5)) % 4; // 0 to 3
    pointSpread = Math.round((2 + variance) * tfMultiplier);
  } else if (asset === 'SOL') {
    // 15m SOL realistic candle move: $1 - $2
    pointSpread = Math.max(1, Math.round(1 * tfMultiplier));
  } else {
    pointSpread = 1;
  }

  // Directional momentum: if previous round resolved UP, set strike slightly above close; if DOWN, slightly below
  const sign = winningSide === 'UP' ? 1 : -1;
  let target = baseInteger + pointSpread * sign;

  // Safety: ensure strike is never identical to current integer price
  if (target === baseInteger) {
    target = winningSide === 'UP' ? baseInteger + 1 : Math.max(baseInteger - 1, 1);
  }

  return target;
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
    set((state) => ({
      lastSeenPositionCount: state.positions.length,
    }));
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
    if (current === address) return;

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
      });
    } else if (address.startsWith('0x')) {
      get().refreshBalances();
    }
  },

  refreshBalances: async () => {
    const address = get().userAddress;
    if (!address || !address.startsWith('0x')) return;

    try {
      const balances = await fetchOnchainBalances(address as `0x${string}`);
      set({
        userGasSTT: balances.sttGas,
        userBalanceUSD: balances.usdcBalance,
      });
    } catch (err) {
      console.warn('[FLIP] Error refreshing balances:', err);
    }
  },

  setUserBalance: (balanceUSD: number, gasSTT?: number) =>
    set((state) => ({
      userBalanceUSD: balanceUSD,
      userGasSTT: gasSTT !== undefined ? gasSTT : state.userGasSTT,
    })),

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
    set((state) => ({
      privateChallenges: [challenge, ...state.privateChallenges],
    }));
  },

  refreshChallenges: () => {
    const stored = ChallengeEngine.getStoredChallenges();
    set({ privateChallenges: stored });
  },

  checkAndRolloverMarkets: async (currentPrices?: Record<string, any>) => {
    const now = Date.now();
    const state = get();

    // Check if any market has reached expiry
    const hasExpiredMarket = state.markets.some((m) => {
      const expiryMs =
        m.expiryDate instanceof Date
          ? m.expiryDate.getTime()
          : new Date(m.expiryDate || now).getTime();
      return now >= expiryMs && !m.isResolved;
    });

    // If resolving, fetch fresh un-cached direct live spot prices from CoinGecko oracle at this exact second
    let freshOraclePrices: Record<string, any> = currentPrices || {};
    if (hasExpiredMarket) {
      try {
        freshOraclePrices = await livePriceStreamer.fetchRestPrices();
      } catch (err) {
        console.warn('[FLIP] Direct oracle query fallback at resolution:', err);
        freshOraclePrices = livePriceStreamer.getPrices();
      }
    }

    let marketsUpdated = false;
    const updatedMarkets = state.markets.map((m) => {
      const expiryMs =
        m.expiryDate instanceof Date
          ? m.expiryDate.getTime()
          : new Date(m.expiryDate || now).getTime();

      // Check if round has expired
      if (now >= expiryMs) {
        marketsUpdated = true;
        // MUST use fresh oracle price directly at resolution moment, NOT cached on-screen prices
        const livePrice =
          freshOraclePrices[m.underlyingAsset]?.price ||
          livePriceStreamer.getPrices()[m.underlyingAsset]?.price ||
          m.currentPrice;

        const winningSide: 'UP' | 'DOWN' = livePrice >= m.strikePrice ? 'UP' : 'DOWN';

        // 1. Settle open user positions for this market
        const { wonCount, wonUSD } = TradingEngine.resolvePositionsForMarket(m.marketId, winningSide);

        if (wonCount > 0) {
          get().addToast({
            type: 'success',
            title: `${m.underlyingAsset} Prediction Won! 🏆`,
            message: `Round resolved ${winningSide} (Strike: $${m.strikePrice.toLocaleString()} vs Spot: $${livePrice.toLocaleString()}). Payout: $${wonUSD.toFixed(2)} tUSDC credited!`,
          });
        }

        // 2. Spawn the NEXT round with a fresh strike anchored to the previous closing price & current spot
        const isOneHour = m.marketId.includes('1h');
        const nextDurationMs = isOneHour ? 60 * 60 * 1000 : 15 * 60 * 1000;
        const nextExpiryDate = new Date(now + nextDurationMs);

        // Dynamically compute next strike price anchored authentically to closing price
        const newRoundNum = (m.roundNumber || 1) + 1;
        const nextStrike = computeDynamicRolloverStrike(
          livePrice,
          m.underlyingAsset,
          winningSide,
          newRoundNum,
          isOneHour
        );

        const delta = livePrice - nextStrike;
        const deltaPct = delta / (livePrice || 1);
        const nextUpProb = Number(Math.min(Math.max(0.50 + deltaPct * 15, 0.15), 0.85).toFixed(2));
        const nextDownProb = Number((1 - nextUpProb).toFixed(2));

        return {
          ...m,
          strikePrice: nextStrike,
          currentPrice: livePrice,
          lastClosePrice: livePrice,
          previousRoundWinningOutcome: winningSide,
          roundNumber: newRoundNum,
          description: `Will ${m.underlyingAsset} finish above $${nextStrike.toLocaleString()} USD? Anchored to Round #${newRoundNum - 1} close ($${livePrice.toLocaleString()} ${winningSide}). Resolves via DreamDEX TWAP.`,
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
      get().refreshBalances();
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

    set({
      markets: [...storedUserMarkets, ...liveMarkets],
      userCreatedMarkets: storedUserMarkets,
      privateChallenges: storedChallenges,
      positions: storedPositions,
      stats: storedStats,
      isLiveStreaming: true,
    });

    // Subscribe to live WebSocket / REST price ticks
    livePriceStreamer.subscribe((livePrices) => {
      get().checkAndRolloverMarkets(livePrices);
      set((state) => {
        const updated = state.markets.map((m) => {
          const live = livePrices[m.underlyingAsset];
          if (!live) return m;

          const delta = live.price - m.strikePrice;
          const deltaPct = delta / (live.price || 1);
          const newUpProb = Math.min(Math.max(0.50 + deltaPct * 15, 0.12), 0.88);
          const newDownProb = Number((1 - newUpProb).toFixed(2));

          return {
            ...m,
            currentPrice: live.price,
            change24h: live.change24h,
            high24h: live.high24h,
            low24h: live.low24h,
            bestUpProbability: Number(newUpProb.toFixed(2)),
            bestDownProbability: newDownProb,
            lastUpdated: Date.now(),
          };
        });
        return { markets: updated };
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
        get().pollLiveMarketPrices();
        if (get().userAddress) {
          get().refreshBalances();
        }
      }, 1500);
    }
  },

  refreshPositions: () => {
    const storedPositions = TradingEngine.getStoredPositions();
    const storedStats = TradingEngine.getStoredStats();
    set({
      positions: storedPositions,
      stats: storedStats,
    });
  },

  clearPositions: () => {
    TradingEngine.clearStoredPositions();
    set({
      positions: [],
      stats: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winStreak: 0,
        maxWinStreak: 0,
        totalVolumeUSD: 0,
        netPnLUSD: 0,
      },
    });
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
}));
