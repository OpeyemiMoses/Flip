/**
 * Real-Time High-Precision Crypto Market Price Streaming Engine
 * Primary: Binance Public Spot API (real-time tick data, no rate limits)
 * Failover: CoinGecko Simple Price API
 * Focuses on BTC, ETH, SOL, SOMI, SUI with rock-solid stability.
 */

export interface LiveTokenPrice {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volumeUSD: number;
  lastUpdated: number;
}

type PriceUpdateListener = (prices: Record<string, LiveTokenPrice>) => void;

class LivePriceStreamer {
  private listeners: Set<PriceUpdateListener> = new Set();
  private pollTimer: any = null;
  private isFetching = false;
  private lastFetchTime = 0;
  private cachedPrices: Record<string, LiveTokenPrice> = {
    BTC:    { symbol: 'BTC',    price: 79174,  change24h: -0.60, high24h: 80494, low24h: 78800, volumeUSD: 22903000000, lastUpdated: Date.now() },
    ETH:    { symbol: 'ETH',    price: 2478,   change24h:  0.15, high24h: 2532,  low24h: 2460,  volumeUSD: 11283000000, lastUpdated: Date.now() },
    SOL:    { symbol: 'SOL',    price: 104.20, change24h: -1.45, high24h: 106.96,low24h: 103.5, volumeUSD: 3322000000,  lastUpdated: Date.now() },
    SOMI:   { symbol: 'SOMI',   price: 0.1361, change24h:  3.90, high24h: 0.1378,low24h: 0.1285,volumeUSD: 2408000,     lastUpdated: Date.now() },
    SOMNIA: { symbol: 'SOMNIA', price: 0.1361, change24h:  3.90, high24h: 0.1378,low24h: 0.1285,volumeUSD: 2408000,     lastUpdated: Date.now() },
    SUI:    { symbol: 'SUI',    price: 2.42,   change24h:  1.20, high24h: 2.50,  low24h: 2.35,  volumeUSD: 710000000,   lastUpdated: Date.now() },
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public getPrices(): Record<string, LiveTokenPrice> {
    return { ...this.cachedPrices };
  }

  public subscribe(listener: PriceUpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.cachedPrices);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = { ...this.cachedPrices };
    this.listeners.forEach((l) => {
      try {
        l(snapshot);
      } catch (err) {
        console.warn('[LivePriceStream] Listener error:', err);
      }
    });
  }

  public init() {
    this.fetchRestPrices();

    if (!this.pollTimer) {
      this.pollTimer = setInterval(() => {
        this.fetchRestPrices();
      }, 3000); // 3s — high-velocity real-time spot updates from Binance
    }
  }

  /**
   * PRIMARY: Binance 24hr Ticker — real-time, no auth, no rate limits on public endpoint
   * FAILOVER: CoinGecko Simple Price API
   */
  public async fetchRestPrices(): Promise<Record<string, LiveTokenPrice>> {
    const now = Date.now();
    if (this.isFetching && now - this.lastFetchTime < 2000) {
      return { ...this.cachedPrices };
    }

    this.isFetching = true;
    this.lastFetchTime = now;
    let updated = false;

    // ── TIER 1: Binance Vision Public API ─────────────────────────────────
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const symbolsParam = encodeURIComponent('["BTCUSDT","ETHUSDT","SOLUSDT","SUIUSDT"]');
      const res = await fetch(
        `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${symbolsParam}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const symMap: Record<string, string> = {
            BTCUSDT: 'BTC',
            ETHUSDT: 'ETH',
            SOLUSDT: 'SOL',
            SUIUSDT: 'SUI',
          };

          for (const item of data) {
            const sym = symMap[item.symbol];
            if (sym) {
              const price = parseFloat(item.lastPrice);
              const change24h = parseFloat(item.priceChangePercent);
              const high24h = parseFloat(item.highPrice);
              const low24h = parseFloat(item.lowPrice);
              const volumeUSD = parseFloat(item.quoteVolume);

              if (price > 0 && !isNaN(price)) {
                this.cachedPrices[sym] = {
                  symbol: sym,
                  price,
                  change24h: isNaN(change24h) ? 0 : Number(change24h.toFixed(2)),
                  high24h: isNaN(high24h) ? price * 1.02 : high24h,
                  low24h: isNaN(low24h) ? price * 0.98 : low24h,
                  volumeUSD: isNaN(volumeUSD) ? 0 : volumeUSD,
                  lastUpdated: Date.now(),
                };
                updated = true;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[LivePriceStream] Binance fetch failed, trying CoinGecko fallback:', e);
    }

    // ── TIER 1b: SOMI via CoinGecko (Binance doesn't list SOMI) ───────────
    // Always fetch SOMI separately — it's not on Binance
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=somnia&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true',
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.somnia?.usd !== undefined) {
          const price = Number(data.somnia.usd);
          const change24h = Number((data.somnia.usd_24h_change || 0).toFixed(2));
          const volumeUSD = data.somnia.usd_24h_vol || 0;

          const somiEntry: LiveTokenPrice = {
            symbol: 'SOMI',
            price,
            change24h,
            high24h: this.cachedPrices.SOMI?.high24h
              ? Math.max(this.cachedPrices.SOMI.high24h, price)
              : price * 1.02,
            low24h: this.cachedPrices.SOMI?.low24h
              ? Math.min(this.cachedPrices.SOMI.low24h, price)
              : price * 0.98,
            volumeUSD,
            lastUpdated: Date.now(),
          };
          this.cachedPrices.SOMI = somiEntry;
          this.cachedPrices.SOMNIA = { ...somiEntry, symbol: 'SOMNIA' };
          updated = true;
        }
      }
    } catch (e) {
      console.warn('[LivePriceStream] SOMI/CoinGecko fetch failed:', e);
    }

    // ── TIER 2 FALLBACK: CoinGecko for all (only if Binance completely failed) ──
    if (!updated) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,somnia,sui&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true',
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const mapping: Record<string, string> = {
            bitcoin: 'BTC',
            ethereum: 'ETH',
            solana: 'SOL',
            somnia: 'SOMI',
            sui: 'SUI',
          };

          for (const [id, sym] of Object.entries(mapping)) {
            if (data[id]?.usd !== undefined) {
              const price = Number(data[id].usd);
              const change24h = Number((data[id].usd_24h_change || 0).toFixed(2));
              const volumeUSD = data[id].usd_24h_vol || 0;

              this.cachedPrices[sym] = {
                symbol: sym,
                price,
                change24h,
                high24h: this.cachedPrices[sym]?.high24h
                  ? Math.max(this.cachedPrices[sym].high24h, price)
                  : price * 1.02,
                low24h: this.cachedPrices[sym]?.low24h
                  ? Math.min(this.cachedPrices[sym].low24h, price)
                  : price * 0.98,
                volumeUSD,
                lastUpdated: Date.now(),
              };
              if (sym === 'SOMI') {
                this.cachedPrices.SOMNIA = { ...this.cachedPrices[sym], symbol: 'SOMNIA' };
              }
              updated = true;
            }
          }
        }
      } catch (e) {
        console.warn('[LivePriceStream] CoinGecko fallback also failed:', e);
      }
    }

    this.isFetching = false;
    if (updated) {
      this.notify();
    }

    return { ...this.cachedPrices };
  }

  public destroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.listeners.clear();
  }
}

export const livePriceStreamer = new LivePriceStreamer();
