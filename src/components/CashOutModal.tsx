import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle2,
  Coins,
  Loader2,
} from 'lucide-react';
import { Position } from '../services/tradingEngine';
import { useMarketStore } from '../store/marketStore';
import { livePriceStreamer, LiveTokenPrice } from '../services/livePriceStream';

interface CashOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: Position | null;
  onConfirmCashOut: (positionId: string) => Promise<boolean | Position | null>;
}

export const CashOutModal: React.FC<CashOutModalProps> = ({
  isOpen,
  onClose,
  position,
  onConfirmCashOut,
}) => {
  const { positions } = useMarketStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, LiveTokenPrice>>(() =>
    livePriceStreamer.getPrices()
  );
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);

  // Subscribe to live price ticks while modal is open
  useEffect(() => {
    if (!isOpen) return;

    let prevPrice: number | null = null;
    const unsub = livePriceStreamer.subscribe((fresh) => {
      setLivePrices(fresh);
      if (position) {
        const current = fresh[position.underlyingAsset]?.price;
        if (current && prevPrice !== null && current !== prevPrice) {
          setPriceFlash(current > prevPrice ? 'up' : 'down');
          setTimeout(() => setPriceFlash(null), 800);
        }
        if (current) prevPrice = current;
      }
    });

    return () => unsub();
  }, [isOpen, position]);

  // Keep position synchronized with the latest store updates
  const activePosition = useMemo(() => {
    if (!position) return null;
    return positions.find((p) => p.id === position.id) || position;
  }, [positions, position]);

  if (!isOpen || !activePosition) return null;

  const asset = activePosition.underlyingAsset;
  const isUp = activePosition.side === 'UP';

  // Live spot price calculations
  const liveSpot =
    livePrices[asset]?.price ||
    activePosition.currentSpotPrice ||
    activePosition.entrySpotPrice ||
    1;
  const entrySpot =
    activePosition.entrySpotPrice ||
    activePosition.currentSpotPrice ||
    liveSpot;

  const priceDiff = liveSpot - entrySpot;
  const priceDiffPct = entrySpot > 0 ? (priceDiff / entrySpot) * 100 : 0;

  // Determine whether current market move favors the user's prediction
  const isFavorable = isUp ? priceDiff > 0.00001 : priceDiff < -0.00001;
  const isNeutral = Math.abs(priceDiff) <= 0.00001;

  // Live PnL and Cash-Out Payout (from activePosition store state or computed dynamically)
  const cashoutPayout =
    activePosition.cashoutPayoutUSD !== undefined
      ? activePosition.cashoutPayoutUSD
      : activePosition.currentValueUSD;
  const invested = activePosition.investedUSD;
  const pnl = Number((cashoutPayout - invested).toFixed(2));
  const pnlPct = invested > 0 ? Number(((pnl / invested) * 100).toFixed(1)) : 0;
  const isProfit = pnl >= 0;

  const formatPrice = (p: number) => {
    if (p >= 1000) {
      return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (p >= 1) {
      return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    } else {
      return `$${p.toFixed(4)}`;
    }
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await onConfirmCashOut(activePosition.id);
      if (res) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          backgroundColor: '#0E0E0E',
          color: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 40px rgba(0, 200, 83, 0.08)',
          overflow: 'hidden',
          animation: 'fadeInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: isProfit ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 59, 105, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${isProfit ? 'rgba(0, 200, 83, 0.3)' : 'rgba(255, 59, 105, 0.3)'}`,
              }}
            >
              {isProfit ? (
                <TrendingUp size={18} color="var(--color-green)" />
              ) : (
                <TrendingDown size={18} color="var(--color-red)" />
              )}
            </div>
            <div>
              <div
                className="font-bobz"
                style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.02em' }}
              >
                EARLY CASH-OUT SETTLEMENT
              </div>
              <div
                className="font-terminal"
                style={{ fontSize: '0.74rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-green)',
                    display: 'inline-block',
                    animation: 'pulse 1.8s infinite',
                  }}
                />
                Live Market Valuation · Real-Time Balance Return
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.4rem',
              color: '#9CA3AF',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Position Info Ribbon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
            }}
          >
            <div>
              <div className="font-bobz" style={{ fontSize: '0.92rem', fontWeight: 800 }}>
                {activePosition.marketTitle}
              </div>
              <div className="font-terminal" style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                Asset: <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{asset}/USD</span>
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: isUp ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 59, 105, 0.15)',
                color: isUp ? 'var(--color-green)' : 'var(--color-red)',
                border: `1px solid ${isUp ? 'rgba(0, 200, 83, 0.35)' : 'rgba(255, 59, 105, 0.35)'}`,
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                fontFamily: 'var(--font-bobz)',
                fontWeight: 800,
                fontSize: '0.82rem',
              }}
            >
              {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{isUp ? 'UP (ABOVE)' : 'DOWN (BELOW)'}</span>
            </div>
          </div>

          {/* 1. Live Price Comparison Box */}
          <div
            style={{
              backgroundColor: '#141414',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.15rem',
            }}
          >
            <div
              className="font-terminal"
              style={{
                fontSize: '0.72rem',
                color: '#9CA3AF',
                letterSpacing: '0.04em',
                marginBottom: '0.75rem',
              }}
            >
              MARKET SPOT PRICE COMPARISON
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Entry Spot */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                }}
              >
                <div className="font-subtext" style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                  ENTRY SPOT PRICE
                </div>
                <div
                  className="font-terminal"
                  style={{ fontSize: '1.15rem', fontWeight: 800, color: '#E5E7EB' }}
                >
                  {formatPrice(entrySpot)}
                </div>
                <div className="font-terminal" style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: '0.2rem' }}>
                  At time of wager placement
                </div>
              </div>

              {/* Current Live Spot */}
              <div
                style={{
                  backgroundColor: priceFlash === 'up'
                    ? 'rgba(0, 200, 83, 0.08)'
                    : priceFlash === 'down'
                    ? 'rgba(255, 59, 105, 0.08)'
                    : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${
                    priceFlash === 'up'
                      ? 'rgba(0, 200, 83, 0.4)'
                      : priceFlash === 'down'
                      ? 'rgba(255, 59, 105, 0.4)'
                      : 'rgba(255, 255, 255, 0.05)'
                  }`,
                  borderRadius: '8px',
                  padding: '0.85rem',
                  transition: 'all 0.3s ease',
                }}
              >
                <div
                  className="font-subtext"
                  style={{
                    fontSize: '0.72rem',
                    color: '#9CA3AF',
                    marginBottom: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>CURRENT LIVE SPOT</span>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-green)',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                </div>
                <div
                  className="font-terminal"
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: isProfit ? 'var(--color-green)' : '#FFFFFF',
                  }}
                >
                  {formatPrice(liveSpot)}
                </div>
                <div
                  className="font-terminal"
                  style={{
                    fontSize: '0.72rem',
                    color: priceDiff >= 0 ? 'var(--color-green)' : 'var(--color-red)',
                    marginTop: '0.2rem',
                    fontWeight: 700,
                  }}
                >
                  {priceDiff >= 0 ? '+' : ''}
                  {formatPrice(priceDiff)} ({priceDiffPct >= 0 ? '+' : ''}
                  {priceDiffPct.toFixed(2)}%)
                </div>
              </div>
            </div>
          </div>

          {/* 2. Direction Favorability Notification */}
          <div
            style={{
              backgroundColor: isNeutral
                ? 'rgba(255, 255, 255, 0.04)'
                : isFavorable
                ? 'rgba(0, 200, 83, 0.08)'
                : 'rgba(255, 59, 105, 0.08)',
              border: `1px solid ${
                isNeutral
                  ? 'rgba(255, 255, 255, 0.1)'
                  : isFavorable
                  ? 'rgba(0, 200, 83, 0.25)'
                  : 'rgba(255, 59, 105, 0.25)'
              }`,
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
            }}
          >
            {isFavorable ? (
              <CheckCircle2 size={16} color="var(--color-green)" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <AlertCircle
                size={16}
                color={isNeutral ? '#9CA3AF' : 'var(--color-red)'}
                style={{ flexShrink: 0, marginTop: '2px' }}
              />
            )}
            <div>
              <div
                className="font-bobz"
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  color: isNeutral ? '#FFFFFF' : isFavorable ? 'var(--color-green)' : 'var(--color-red)',
                  marginBottom: '0.2rem',
                }}
              >
                {isNeutral
                  ? 'MARKET AT PARITY (NO NET DELTA)'
                  : isFavorable
                  ? 'MARKET MOVEMENT FAVORS YOUR PREDICTION'
                  : 'MARKET MOVEMENT OPPOSES YOUR PREDICTION'}
              </div>
              <div className="font-subtext" style={{ fontSize: '0.76rem', color: '#D1D5DB', lineHeight: 1.45 }}>
                {isFavorable
                  ? `Live price is moving in your favor from entry (${formatPrice(entrySpot)} → ${formatPrice(liveSpot)}). Cashing out now locks in your +$${pnl.toFixed(2)} accrued profit.`
                  : isNeutral
                  ? `Live price is identical to your entry point. Cashing out returns your wager net of current parimutuel fair value.`
                  : `Live price is moving against your prediction (${formatPrice(entrySpot)} → ${formatPrice(liveSpot)}). You can cash out now to protect your remaining $${cashoutPayout.toFixed(2)} balance before round expiry.`}
              </div>
            </div>
          </div>

          {/* 3. Valuation & Profit/Loss Breakdown */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '0.85rem',
            }}
          >
            <div>
              <div className="font-subtext" style={{ fontSize: '0.70rem', color: '#9CA3AF' }}>
                INITIAL BET
              </div>
              <div className="font-terminal" style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF' }}>
                ${invested.toFixed(2)}
              </div>
              <div className="font-subtext" style={{ fontSize: '0.66rem', color: '#6B7280' }}>
                {activePosition.contractsCount.toFixed(1)} shares
              </div>
            </div>

            <div>
              <div className="font-subtext" style={{ fontSize: '0.70rem', color: '#9CA3AF' }}>
                FAIR SHARE VALUE
              </div>
              <div className="font-terminal" style={{ fontSize: '0.98rem', fontWeight: 800, color: '#38BDF8' }}>
                ${(cashoutPayout / (activePosition.contractsCount || 1)).toFixed(3)}
              </div>
              <div className="font-subtext" style={{ fontSize: '0.66rem', color: '#6B7280' }}>
                implied probability
              </div>
            </div>

            <div>
              <div className="font-subtext" style={{ fontSize: '0.70rem', color: '#9CA3AF' }}>
                NET PROFIT / LOSS
              </div>
              <div
                className="font-terminal"
                style={{
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  color: isProfit ? 'var(--color-green)' : 'var(--color-red)',
                }}
              >
                {isProfit ? '+' : ''}${pnl.toFixed(2)}
              </div>
              <div
                className="font-terminal"
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  color: isProfit ? 'var(--color-green)' : 'var(--color-red)',
                }}
              >
                {isProfit ? '+' : ''}{pnlPct.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* 4. Total Cash-Out Payout Highlight Box */}
          <div
            style={{
              backgroundColor: '#000000',
              border: `2px solid ${isProfit ? 'var(--color-green)' : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: isProfit ? '0 0 24px rgba(0, 200, 83, 0.15)' : 'none',
              textAlign: 'center',
            }}
          >
            <div
              className="font-terminal"
              style={{
                fontSize: '0.74rem',
                color: '#9CA3AF',
                letterSpacing: '0.06em',
                marginBottom: '0.4rem',
              }}
            >
              ESTIMATED CASHOUT RETURN (CREDITED TO BALANCE)
            </div>

            <div
              className="font-bobz"
              style={{
                fontSize: '2.2rem',
                fontWeight: 800,
                color: isProfit ? 'var(--color-green)' : '#FFFFFF',
                lineHeight: 1.1,
                marginBottom: '0.4rem',
              }}
            >
              ${cashoutPayout.toFixed(2)}{' '}
              <span style={{ fontSize: '1rem', color: '#9CA3AF', fontWeight: 600 }}>USDso</span>
            </div>

            <div className="font-subtext" style={{ fontSize: '0.78rem', color: '#D1D5DB' }}>
              {isProfit ? (
                <>
                  Initial Wager (<strong>${invested.toFixed(2)}</strong>) + Earned Profit (
                  <strong style={{ color: 'var(--color-green)' }}>+${pnl.toFixed(2)}</strong>) ={' '}
                  <strong style={{ color: '#FFFFFF' }}>${cashoutPayout.toFixed(2)} USDso</strong> credited immediately.
                </>
              ) : (
                <>
                  Initial Wager (<strong>${invested.toFixed(2)}</strong>) - Loss (
                  <strong style={{ color: 'var(--color-red)' }}>-${Math.abs(pnl).toFixed(2)}</strong>) ={' '}
                  <strong style={{ color: '#FFFFFF' }}>${cashoutPayout.toFixed(2)} USDso</strong> remaining balance credited immediately.
                </>
              )}
            </div>
          </div>

          {/* User Confirmation Question */}
          <p
            className="font-bobz"
            style={{
              fontSize: '0.90rem',
              textAlign: 'center',
              color: '#FFFFFF',
              margin: '0.25rem 0 0 0',
            }}
          >
            Do you want to proceed and cash out this position now?
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              style={{
                flex: 1,
                backgroundColor: isProfit ? 'var(--color-green)' : '#FFFFFF',
                color: '#000000',
                border: 'none',
                borderRadius: '8px',
                padding: '0.85rem',
                fontSize: '0.88rem',
                fontFamily: 'var(--font-bobz)',
                fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                transition: 'transform 0.1s ease',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>BROADCASTING SETTLEMENT...</span>
                </>
              ) : (
                <>
                  <Coins size={16} />
                  <span>CONFIRM CASH OUT (${cashoutPayout.toFixed(2)})</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                flex: '0 0 auto',
                backgroundColor: 'transparent',
                color: '#9CA3AF',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: '8px',
                padding: '0.85rem 1.25rem',
                fontSize: '0.88rem',
                fontFamily: 'var(--font-bobz)',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Keep Position Open
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
