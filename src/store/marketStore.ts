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

        // Dynamically compute next strike price and initial probabilities based on closing price
        let strikeStep = 50;
        if (m.underlyingAsset === 'BTC') strikeStep = livePrice > 50000 ? 100 : 50;
        else if (m.underlyingAsset === 'ETH') strikeStep = 10;
        else if (m.underlyingAsset === 'SOL') strikeStep = 1;
        else if (m.underlyingAsset === 'SOMNIA' || m.underlyingAsset === 'SUI') strikeStep = 0.05;
        else if (m.underlyingAsset === 'DOGE') strikeStep = 0.005;
        else if (m.underlyingAsset === 'PEPE') strikeStep = 0.0000005;

        // Calculate next strike anchored strictly to the closing price of the previous round
        let nextStrike = Math.round(livePrice / strikeStep) * strikeStep;
        if (nextStrike === m.strikePrice || Math.abs(nextStrike - livePrice) < strikeStep * 0.2) {
          // If close was UP, anchor next target to upper resistance step; if DOWN, anchor to lower support
          nextStrike = winningSide === 'UP' ? nextStrike + strikeStep : Math.max(nextStrike - strikeStep, strikeStep);
        }

        const delta = livePrice - nextStrike;
        const deltaPct = delta / (livePrice || 1);
        const nextUpProb = Number(Math.min(Math.max(0.50 + deltaPct * 15, 0.15), 0.85).toFixed(2));
        const nextDownProb = Number((1 - nextUpProb).toFixed(2));
        const newRoundNum = (m.roundNumber || 1) + 1;

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
      const prices = await fetchLiveCryptoPrices();
      
      // First, check and roll over any expired rounds
      get().checkAndRolloverMarkets(prices);

      set((state) => {
        const updated = state.markets.map((m) => {
          const live = prices[m.underlyingAsset];
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
