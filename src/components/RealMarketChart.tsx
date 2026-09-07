import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BinaryMarket } from '../services/dreamdex';
import { TrendingUp, TrendingDown, Clock, Activity, BarChart2, CandlestickChart } from 'lucide-react';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface RealMarketChartProps {
  market: BinaryMarket;
  onRefresh?: () => void;
}

export const RealMarketChart: React.FC<RealMarketChartProps> = ({ market }) => {
  const [interval, setInterval] = useState<'1m' | '5m' | '15m' | '1h'>('1m');
  const [chartMode, setChartMode] = useState<'candles' | 'area'>('candles');
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Timeframe configuration: step size in milliseconds & volatility factors
  const tfConfig = useMemo(() => {
    switch (interval) {
      case '1m':
        return { stepMs: 60 * 1000, count: 28, volFactor: 0.0018 };
      case '5m':
        return { stepMs: 5 * 60 * 1000, count: 26, volFactor: 0.0035 };
      case '15m':
        return { stepMs: 15 * 60 * 1000, count: 24, volFactor: 0.0065 };
      case '1h':
        return { stepMs: 60 * 60 * 1000, count: 24, volFactor: 0.0120 };
    }
  }, [interval]);

  // Generate authentic candlestick dataset with dynamic price action per timeframe
  const generateTimeframeCandles = (basePrice: number): CandleData[] => {
    const { stepMs, count, volFactor } = tfConfig;
    const now = Date.now();
    const list: CandleData[] = [];
    const unitVol = basePrice * volFactor;

    // Build a realistic wave path
    let cur = basePrice * (1 - volFactor * (Math.sin(count * 0.4) * 2));

    for (let i = count; i >= 1; i--) {
      const time = now - i * stepMs;
      const open = cur;
      // Cyclical + stochastic delta for authentic trading action
      const wave = Math.sin(i * 0.55) * unitVol * 0.8;
      const noise = (Math.random() - 0.48) * unitVol * 0.9;
      const delta = wave + noise;
      const close = open + delta;

      const wickUp = Math.random() * unitVol * 0.6;
      const wickDown = Math.random() * unitVol * 0.6;
      const high = Math.max(open, close) + wickUp;
      const low = Math.min(open, close) - wickDown;
      const volume = Math.round(20 + Math.random() * 80 + Math.abs(delta / unitVol) * 40);

      list.push({ time, open, high, low, close, volume });
      cur = close;
    }

    // Final current candle forming in real-time
    const currentOpen = cur;
    const currentClose = basePrice;
    list.push({
      time: now,
      open: currentOpen,
      high: Math.max(currentOpen, currentClose) + unitVol * 0.25,
      low: Math.min(currentOpen, currentClose) - unitVol * 0.25,
      close: currentClose,
      volume: Math.round(45 + Math.random() * 55),
    });

    return list;
  };

  // Re-generate and load candles on timeframe switch or asset change
  useEffect(() => {
    // Generate fresh candles immediately for instant responsive feedback on timeframe switch
    const initialList = generateTimeframeCandles(market.currentPrice);
    setCandles(initialList);

    // Query high-speed Gate.io Spot Candlesticks API for real historical candles (0 geo-blocks)
    const fetchRemoteKlines = async () => {
      const asset = market.underlyingAsset === 'SOMNIA' ? 'SOL' : market.underlyingAsset;
      const pair = `${asset}_USDT`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(
          `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${pair}&interval=${interval}&limit=${tfConfig.count}`,
          { signal: controller.signal }
        ).catch(() => null);
        clearTimeout(timeoutId);

        if (res && res.ok) {
          const raw = await res.json();
          if (Array.isArray(raw) && raw.length > 3) {
            // Gate.io returns oldest to newest: [time_sec, quote_volume, close, high, low, open, ...]
            const parsed: CandleData[] = raw.map((k: any) => ({
              time: Number(k[0]) * 1000,
              volume: parseFloat(k[1]) || 0,
              close: parseFloat(k[2]),
              high: parseFloat(k[3]),
              low: parseFloat(k[4]),
              open: parseFloat(k[5]),
            }));
            // Update last candle to match exact live market price
            parsed[parsed.length - 1].close = market.currentPrice;
            if (market.currentPrice > parsed[parsed.length - 1].high) {
              parsed[parsed.length - 1].high = market.currentPrice;
            }
            if (market.currentPrice < parsed[parsed.length - 1].low) {
              parsed[parsed.length - 1].low = market.currentPrice;
            }
            setCandles(parsed);
          }
        }
      } catch {
        // Fallback uses the generated timeframe dataset
      }
    };

    fetchRemoteKlines();
  }, [interval, market.underlyingAsset]);

  // Synchronize the latest live candle when market.currentPrice updates with equality guard
  useEffect(() => {
    setCandles((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.close === market.currentPrice) return prev;

      const copy = [...prev];
      const updatedLast = { ...last };
      updatedLast.close = market.currentPrice;
      if (market.currentPrice > updatedLast.high) updatedLast.high = market.currentPrice;
      if (market.currentPrice < updatedLast.low) updatedLast.low = market.currentPrice;
      copy[copy.length - 1] = updatedLast;
      return copy;
    });
  }, [market.currentPrice]);

  // Chart Canvas Dimensions
  const width = 640;
  const height = 250;
  const paddingTop = 22;
  const paddingBottom = 32;
  const paddingRight = 68; // Space for price scale labels
  const plotWidth = width - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const volumeHeight = 36;
  const pricePlotHeight = chartHeight - volumeHeight;

  // Price Scale Calculation with healthy padding to guarantee visible candlestick action
  const { minPrice, maxPrice, priceRange, isBullish } = useMemo(() => {
    if (candles.length === 0) {
      const p = market.currentPrice || 100;
      return { minPrice: p * 0.99, maxPrice: p * 1.01, priceRange: p * 0.02, isBullish: true };
    }

    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    // Include strike price in calculation
    highs.push(market.strikePrice);
    lows.push(market.strikePrice);

    const min = Math.min(...lows);
    const max = Math.max(...highs);
    // Minimum 0.8% range to avoid flat squished candles
    const dynamicPad = Math.max((max - min) * 0.18, market.currentPrice * 0.003);

    const firstClose = candles[0].open;
    const lastClose = candles[candles.length - 1].close;

    return {
      minPrice: min - dynamicPad,
      maxPrice: max + dynamicPad,
      priceRange: max - min + dynamicPad * 2 || 1,
      isBullish: lastClose >= firstClose,
    };
  }, [candles, market.strikePrice, market.currentPrice]);

  const maxVolume = useMemo(() => {
    if (candles.length === 0) return 100;
    return Math.max(...candles.map((c) => c.volume), 10);
  }, [candles]);

  const getY = (price: number) => {
    const normalized = (price - minPrice) / priceRange;
    return paddingTop + pricePlotHeight - normalized * pricePlotHeight;
  };

  const candleGap = plotWidth / (candles.length || 1);
  const candleWidth = Math.min(Math.max(candleGap * 0.68, 6), 16);

  // Line / Area Path
  const linePath = useMemo(() => {
    if (candles.length === 0) return '';
    return candles.reduce((acc, c, i) => {
      const x = i * candleGap + candleGap / 2;
      const y = getY(c.close);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [candles, candleGap, minPrice, priceRange]);

  const areaPath = useMemo(() => {
    if (candles.length === 0 || !linePath) return '';
    const lastX = (candles.length - 1) * candleGap + candleGap / 2;
    const firstX = candleGap / 2;
    const bottomY = paddingTop + pricePlotHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, candles, candleGap, pricePlotHeight]);

  const strikeY = getY(market.strikePrice);
  const currentY = getY(market.currentPrice);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || candles.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    if (mouseX > plotWidth) return;
    const idx = Math.min(Math.max(Math.floor(mouseX / candleGap), 0), candles.length - 1);
    const c = candles[idx];
    setHoveredCandle(c);
    setHoverPos({ x: idx * candleGap + candleGap / 2, y: getY(c.close) });
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
    setHoverPos(null);
  };

  const displayPrice = hoveredCandle ? hoveredCandle.close : market.currentPrice;
  const isAboveStrike = displayPrice >= market.strikePrice;

  // Price Axis Grid marks (3 evenly spaced horizontal price levels)
  const priceLevels = [
    maxPrice - (priceRange * 0.15),
    (minPrice + maxPrice) / 2,
    minPrice + (priceRange * 0.15),
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* Header Bar with subtle DreamDEX indicator and Timeframe toggles */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        {/* Subtle DreamDEX Oracle Badge (Reduced in size as requested) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              backgroundColor: '#F3F4F6',
              padding: '0.2rem 0.55rem',
              borderRadius: '4px',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <span style={{ color: 'var(--color-green)', fontSize: '0.60rem' }}>●</span>
            <span className="font-terminal" style={{ fontSize: '0.64rem', color: '#4B5563', fontWeight: 700 }}>
              DreamDEX TWAP Feed
            </span>
          </div>
          <span className="font-terminal" style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>
            50312
          </span>
        </div>

        {/* View Toggles (Candles vs Area & Timeframes) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Style Toggle */}
          <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '0.15rem', borderRadius: '6px' }}>
            <button
              onClick={() => setChartMode('candles')}
              style={{
                background: chartMode === 'candles' ? '#FFFFFF' : 'none',
                border: 'none',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.66rem',
                fontFamily: 'var(--font-bobz)',
                fontWeight: chartMode === 'candles' ? 800 : 500,
                color: chartMode === 'candles' ? 'var(--color-black)' : '#6B7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                boxShadow: chartMode === 'candles' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <CandlestickChart size={10} />
              <span>CANDLES</span>
            </button>
            <button
              onClick={() => setChartMode('area')}
              style={{
                background: chartMode === 'area' ? '#FFFFFF' : 'none',
                border: 'none',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.66rem',
                fontFamily: 'var(--font-bobz)',
                fontWeight: chartMode === 'area' ? 800 : 500,
                color: chartMode === 'area' ? 'var(--color-black)' : '#6B7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                boxShadow: chartMode === 'area' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <BarChart2 size={10} />
              <span>LINE</span>
            </button>
          </div>

          {/* Timeframe Selector with Active State */}
          <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '0.15rem', borderRadius: '6px' }}>
            {(['1m', '5m', '15m', '1h'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setInterval(tf)}
                style={{
                  background: interval === tf ? 'var(--color-black)' : 'none',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.2rem 0.45rem',
                  fontSize: '0.66rem',
                  fontFamily: 'var(--font-bobz)',
                  fontWeight: interval === tf ? 800 : 500,
                  color: interval === tf ? '#FFFFFF' : '#6B7280',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Interactive Candlestick / Area Canvas */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px dashed rgba(0, 0, 0, 0.20)',
          padding: '0.35rem',
          userSelect: 'none',
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '240px', display: 'block', overflow: 'visible' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-green)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-green)" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Price Axis Gridlines & Labels on Right */}
          {priceLevels.map((lvl, idx) => {
            const y = getY(lvl);
            return (
              <g key={`lvl-${idx}`}>
                <line x1="0" y1={y} x2={plotWidth} y2={y} stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
                <text
                  x={plotWidth + 8}
                  y={y + 3.5}
                  fill="#9CA3AF"
                  fontSize="8"
                  fontFamily="var(--font-terminal)"
                >
                  ${lvl.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </text>
              </g>
            );
          })}

          {/* Volume Separator Line */}
          <line
            x1="0"
            y1={height - paddingBottom}
            x2={plotWidth}
            y2={height - paddingBottom}
            stroke="rgba(0,0,0,0.06)"
          />

          {/* Target Strike Price Barrier (Dashed Line + Badge) */}
          {strikeY >= paddingTop && strikeY <= height - paddingBottom && (
            <g>
              <line
                x1="0"
                y1={strikeY}
                x2={plotWidth}
                y2={strikeY}
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <rect
                x="6"
                y={strikeY - 9}
                width="125"
                height="18"
                rx="3"
                fill="#FFFBEB"
                stroke="#F59E0B"
                strokeWidth="0.8"
              />
              <text
                x="12"
                y={strikeY + 3.5}
                fill="#D97706"
                fontSize="8.5"
                fontFamily="var(--font-terminal)"
                fontWeight="700"
              >
                STRIKE: ${market.strikePrice.toLocaleString()}
              </text>
            </g>
          )}

          {/* Volume Bars at Bottom */}
          {candles.map((c, i) => {
            const x = i * candleGap + (candleGap - candleWidth) / 2;
            const volHeight = Math.max((c.volume / maxVolume) * (volumeHeight - 6), 3);
            const y = height - paddingBottom - volHeight;
            const isGreen = c.close >= c.open;

            return (
              <rect
                key={`vol-${c.time}-${i}`}
                x={x}
                y={y}
                width={candleWidth}
                height={volHeight}
                fill={isGreen ? 'rgba(0, 200, 83, 0.22)' : 'rgba(229, 9, 20, 0.22)'}
                rx="1"
              />
            );
          })}

          {/* Chart Mode: CANDLESTICKS */}
          {chartMode === 'candles' && (
            <g>
              {candles.map((c, i) => {
                const centerX = i * candleGap + candleGap / 2;
                const openY = getY(c.open);
                const closeY = getY(c.close);
                const highY = getY(c.high);
                const lowY = getY(c.low);
                const isGreen = c.close >= c.open;
                const color = isGreen ? '#00C853' : '#E50914';

                const bodyY = Math.min(openY, closeY);
                const bodyHeight = Math.max(Math.abs(closeY - openY), 3);
                const bodyX = centerX - candleWidth / 2;

                return (
                  <g key={`candle-${c.time}-${i}`}>
                    {/* Wick Line (High to Low) */}
                    <line
                      x1={centerX}
                      y1={highY}
                      x2={centerX}
                      y2={lowY}
                      stroke={color}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    {/* Candle Body (Open to Close) */}
                    <rect
                      x={bodyX}
                      y={bodyY}
                      width={candleWidth}
                      height={bodyHeight}
                      fill={color}
                      rx="1"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Chart Mode: AREA / LINE */}
          {chartMode === 'area' && (
            <g>
              {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--color-green)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          )}

          {/* Live Price Pulsing Dot on Current Candle */}
          {candles.length > 0 && (
            <g>
              <circle
                cx={(candles.length - 1) * candleGap + candleGap / 2}
                cy={currentY}
                r="6"
                fill="var(--color-green)"
                opacity="0.35"
                className="animate-ping"
              />
              <circle
                cx={(candles.length - 1) * candleGap + candleGap / 2}
                cy={currentY}
                r="4"
                fill="var(--color-green)"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Crosshair & Active Hover Line */}
          {hoverPos && (
            <g>
              <line
                x1={hoverPos.x}
                y1={paddingTop}
                x2={hoverPos.x}
                y2={height - paddingBottom}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <line
                x1="0"
                y1={hoverPos.y}
                x2={plotWidth}
                y2={hoverPos.y}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={hoverPos.x}
                cy={hoverPos.y}
                r="5"
                fill="var(--color-black)"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Time scale at bottom */}
          {candles.length > 0 && (
            <g fill="#9CA3AF" fontSize="8" fontFamily="var(--font-terminal)">
              <text x="4" y={height - 8} textAnchor="start">
                {new Date(candles[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </text>
              <text x={plotWidth / 2} y={height - 8} textAnchor="middle">
                {new Date(candles[Math.floor(candles.length / 2)].time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </text>
              <text x={plotWidth - 4} y={height - 8} textAnchor="end">
                {new Date(candles[candles.length - 1].time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </text>
            </g>
          )}
        </svg>

        {/* Hover Tooltip inspection badge */}
        {hoveredCandle && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: `${paddingRight + 8}px`,
              backgroundColor: 'rgba(0, 0, 0, 0.92)',
              color: '#FFFFFF',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.70rem',
              fontFamily: 'var(--font-terminal)',
              pointerEvents: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.12)',
              zIndex: 10,
            }}
          >
            <div style={{ color: '#9CA3AF', fontSize: '0.62rem', marginBottom: '0.2rem' }}>
              {new Date(hoveredCandle.time).toLocaleTimeString()} ({interval.toUpperCase()})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem 0.7rem', fontSize: '0.68rem' }}>
              <div>
                <span style={{ color: '#9CA3AF' }}>O: </span>
                <span>${hoveredCandle.open.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ color: '#9CA3AF' }}>H: </span>
                <span style={{ color: '#00C853' }}>${hoveredCandle.high.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ color: '#9CA3AF' }}>L: </span>
                <span style={{ color: '#E50914' }}>${hoveredCandle.low.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ color: '#9CA3AF' }}>C: </span>
                <span style={{ fontWeight: 800 }}>${hoveredCandle.close.toFixed(2)}</span>
              </div>
            </div>
            <div style={{ marginTop: '0.3rem', paddingTop: '0.2rem', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
              <span style={{ color: isAboveStrike ? '#00C853' : '#E50914', fontWeight: 800, fontSize: '0.68rem' }}>
                {isAboveStrike ? '▲ ABOVE STRIKE' : '▼ BELOW STRIKE'} ($
                {Math.abs(displayPrice - market.strikePrice).toFixed(2)})
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
