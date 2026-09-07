import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  ArrowUpRight,
  Zap,
  BarChart3,
  Award,
  DollarSign,
  Activity,
  Layers,
  ShieldCheck,
  ExternalLink,
  Wallet,
  Clock,
  ChevronDown,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { ConnectWalletModal } from './ConnectWalletModal';
import { useMarketStore } from '../store/marketStore';
import { usePositions } from '../hooks/usePositions';

interface PortfolioAnalyticsProps {
  onBackToArena: () => void;
  onBackToLanding: () => void;
}

export const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({
  onBackToArena,
  onBackToLanding,
}) => {
  const { userBalanceUSD, userGasSTT, isConnected, userAddress, markets, stats } = useMarketStore();
  const { activePositions, historyPositions } = usePositions();
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D' | 'ALL'>('ALL');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const totalInvested = activePositions.reduce((acc, p) => acc + p.investedUSD, 0) +
    historyPositions.reduce((acc, p) => acc + p.investedUSD, 0);

  const totalReturns = historyPositions
    .filter((p) => p.status === 'WON' || p.status === 'CASHED_OUT')
    .reduce((acc, p) => acc + p.potentialPayoutUSD, 0);

  const winsCount = historyPositions.filter((p) => p.status === 'WON' || p.status === 'CASHED_OUT').length;
  const winRate = historyPositions.length > 0 ? (winsCount / historyPositions.length) * 100 : 0.0;
  const netPnL = historyPositions.length > 0 ? totalReturns - totalInvested : 0.0;

  // Compute live win streak from settled history
  let liveStreak = 0;
  for (let i = historyPositions.length - 1; i >= 0; i--) {
    const s = historyPositions[i].status;
    if (s === 'WON' || s === 'CASHED_OUT') liveStreak++;
    else break;
  }
  const currentStreak = liveStreak;
  const maxStreak = Math.max(stats?.maxWinStreak ?? 0, liveStreak);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8F9FA', color: 'var(--color-black)' }}>
      {/* Top Navigation Header */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          padding: '0.75rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
            onClick={onBackToLanding}
          >
            <img src="/assets/flip_full_logo.png" alt="FLIP" style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            <button
              onClick={onBackToArena}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-bobz)',
                fontSize: '0.84rem',
                fontWeight: 500,
                color: '#6B7280',
                cursor: 'pointer',
              }}
            >
              Trading Arena
            </button>

            <button
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-bobz)',
                fontSize: '0.84rem',
                fontWeight: 800,
                color: 'var(--color-black)',
                cursor: 'pointer',
                padding: '0.2rem 0',
                borderBottom: '2px solid var(--color-black)',
              }}
            >
              Portfolio Analytics
            </button>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#6B7280' }} className="font-terminal">
            <span style={{ color: 'var(--color-green)' }}>●</span>
            <span>Somnia Shannon (50312)</span>
          </div>

          {!isConnected || !userAddress ? (
            <button onClick={() => setIsConnectModalOpen(true)} className="btn-wallet-connect">
              <Wallet size={12} />
              <span>CONNECT WALLET</span>
            </button>
          ) : (
            <div className="wallet-connected-widget" onClick={() => setIsConnectModalOpen(true)} style={{ cursor: 'pointer' }}>
              <div className="wallet-chain-chip">
                <span style={{ color: 'var(--color-green)', fontSize: '0.65rem' }}>●</span>
                <span>Shannon</span>
              </div>
              <div className="wallet-account-pill">
                <span>{userAddress.slice(0, 6)}...{userAddress.slice(-4)}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left Sidebar */}
        <aside
          style={{
            width: '240px',
            minWidth: '240px',
            backgroundColor: '#FFFFFF',
            borderRight: '1px solid rgba(0, 0, 0, 0.08)',
            padding: '1.75rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              className="font-terminal"
              style={{
                fontSize: '0.68rem',
                color: '#9CA3AF',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '0.65rem',
                paddingLeft: '0.5rem',
              }}
            >
              MODULES
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button
                onClick={onBackToArena}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#4B5563',
                  fontFamily: 'var(--font-bobz)',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Activity size={14} />
                <span>Trading Arena</span>
              </button>

              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--color-grey-pill)',
                  color: 'var(--color-black)',
                  fontFamily: 'var(--font-bobz)',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <BarChart3 size={14} />
                <span>Portfolio Analytics</span>
              </button>
            </div>
          </div>

          <div>
            <button
              onClick={onBackToLanding}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: 'var(--color-grey-light)',
                border: '1px solid rgba(0,0,0,0.06)',
                color: 'var(--color-black)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-bobz)',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={12} />
              <span>RETURN TO LANDING</span>
            </button>
          </div>
        </aside>

        {/* Main Body */}
        <main style={{ flex: 1, padding: '2rem 3rem 4rem 3rem', maxWidth: '1240px' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <button
              onClick={onBackToArena}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'var(--color-grey-light)',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '6px',
                padding: '0.3rem 0.7rem',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-bobz)',
                fontWeight: 800,
                color: 'var(--color-black)',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={11} />
              <span>Back to Arena</span>
            </button>

            <div className="font-terminal" style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>
              Somnia Shannon • Portfolio Audit
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 className="font-bobz" style={{ fontSize: '1.35rem', color: 'var(--color-black)', margin: '0 0 0.4rem 0', letterSpacing: '-0.01em' }}>
              Historical Performance & Audited Settlements
            </h1>
            <p className="font-subtext" style={{ fontSize: '0.92rem', color: 'var(--color-grey-text)', margin: 0, lineHeight: 1.6 }}>
              On-chain tracking of all binary market executions, cumulative PnL curve, win rate metrics, and Somnia sub-cent gas savings.
            </p>
          </div>

          {/* Metric Cards Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div className="card-paper" style={{ padding: '1.35rem 1.5rem' }}>
              <span className="font-terminal" style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'block', marginBottom: '0.35rem' }}>NET REALIZED PROFIT</span>
              <div className="font-bobz" style={{ fontSize: '1.55rem', color: netPnL >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                {netPnL >= 0 ? `+$${netPnL.toFixed(2)}` : `-$${Math.abs(netPnL).toFixed(2)}`}
              </div>
            </div>

            <div className="card-paper" style={{ padding: '1.35rem 1.5rem' }}>
              <span className="font-terminal" style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'block', marginBottom: '0.35rem' }}>WIN RATE</span>
              <div className="font-bobz" style={{ fontSize: '1.55rem', color: 'var(--color-black)' }}>
                {winRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.2rem' }} className="font-terminal">
                {winsCount}W / {historyPositions.length - winsCount}L
              </div>
            </div>

            {/* Current Streak card */}
            <div
              className="card-paper"
              style={{
                padding: '1.35rem 1.5rem',
                backgroundColor: currentStreak >= 3 ? 'rgba(245, 158, 11, 0.08)' : undefined,
                border: currentStreak >= 3 ? '1px solid rgba(245, 158, 11, 0.3)' : undefined,
              }}
            >
              <span className="font-terminal" style={{ fontSize: '0.72rem', color: currentStreak >= 3 ? '#D97706' : '#9CA3AF', display: 'block', marginBottom: '0.35rem' }}>
                {currentStreak >= 3 ? '🔥 CURRENT STREAK' : 'CURRENT STREAK'}
              </span>
              <div className="font-bobz" style={{ fontSize: '1.55rem', color: currentStreak > 0 ? '#D97706' : '#9CA3AF' }}>
                {currentStreak > 0 ? `${currentStreak}W` : '—'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.2rem' }} className="font-terminal">
                Best ever: {maxStreak > 0 ? `${maxStreak}W` : '—'}
              </div>
            </div>

            <div className="card-paper" style={{ padding: '1.35rem 1.5rem' }}>
              <span className="font-terminal" style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'block', marginBottom: '0.35rem' }}>TOTAL VOLUME TRADED</span>
              <div className="font-bobz" style={{ fontSize: '1.55rem', color: 'var(--color-black)' }}>
                ${totalInvested.toFixed(2)}
              </div>
            </div>

            <div className="card-paper" style={{ padding: '1.35rem 1.5rem' }}>
              <span className="font-terminal" style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'block', marginBottom: '0.35rem' }}>SOMNIA GAS SAVED</span>
              <div className="font-bobz" style={{ fontSize: '1.55rem', color: 'var(--color-green)' }}>
                ${((historyPositions.length + activePositions.length) * 0.45).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Educational Analytics Guide: What Happens on this Page */}
          <div
            className="card-paper"
            style={{
              padding: '1.5rem 1.75rem',
              marginBottom: '1.75rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <ShieldCheck size={18} color="var(--color-green)" />
              <h3 className="font-bobz" style={{ margin: 0, fontSize: '1.15rem' }}>
                How Your Performance &amp; PnL Ledger is Audited
              </h3>
            </div>
            <p className="font-subtext" style={{ fontSize: '0.88rem', color: 'var(--color-grey-text)', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
              Every trade executed across FLIP's Standard Arenas, Community Markets, and Private Squads is immutably timestamped on the Somnia Shannon testnet. Winning positions automatically redeem for $1.00 USDso collateral per winning share.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', borderTop: '1px dashed rgba(0,0,0,0.08)', paddingTop: '1rem' }}>
              <div>
                <div className="font-bobz" style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-black)' }}>
                  1. Realized Returns
                </div>
                <div className="font-subtext" style={{ fontSize: '0.80rem', color: '#6B7280', marginTop: '0.2rem' }}>
                  Total net profit calculated after deducting all entry collateral from verified settlement payouts.
                </div>
              </div>
              <div>
                <div className="font-bobz" style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-black)' }}>
                  2. Win Rate Precision
                </div>
                <div className="font-subtext" style={{ fontSize: '0.80rem', color: '#6B7280', marginTop: '0.2rem' }}>
                  Ratio of successful predictions resolved via DreamDEX TWAP oracles at the exact second of candle close.
                </div>
              </div>
              <div>
                <div className="font-bobz" style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-black)' }}>
                  3. Sub-Cent Gas Efficiency
                </div>
                <div className="font-subtext" style={{ fontSize: '0.80rem', color: '#6B7280', marginTop: '0.2rem' }}>
                  Somnia MultiStream consensus processes order minting with negligible gas overhead (&lt; $0.0001 STT).
                </div>
              </div>
            </div>
          </div>

          {/* Audit History Table Card */}
          <div className="card-paper" style={{ padding: '1.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span className="font-bobz" style={{ fontSize: '1.05rem', display: 'block' }}>ON-CHAIN SETTLEMENT AUDIT LOG</span>
                <span className="font-subtext" style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                  Complete cryptographic trail of all your resolved contracts and payouts.
                </span>
              </div>
              <span className="font-terminal" style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Total Records: {historyPositions.length}</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px dashed rgba(0,0,0,0.12)', textAlign: 'left', color: '#9CA3AF' }}>
                    <th style={{ padding: '0.5rem', fontFamily: 'var(--font-bobz)' }}>EVENT MARKET</th>
                    <th style={{ padding: '0.5rem', fontFamily: 'var(--font-bobz)' }}>DIRECTION</th>
                    <th style={{ padding: '0.5rem', fontFamily: 'var(--font-bobz)' }}>INVESTED</th>
                    <th style={{ padding: '0.5rem', fontFamily: 'var(--font-bobz)' }}>PAYOUT</th>
                    <th style={{ padding: '0.5rem', fontFamily: 'var(--font-bobz)' }}>OUTCOME</th>
                    <th style={{ padding: '0.5rem', fontFamily: 'var(--font-bobz)', textAlign: 'right' }}>EXPLORER</th>
                  </tr>
                </thead>
                <tbody>
                  {historyPositions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: '#9CA3AF' }} className="font-subtext">
                        No settled historical records yet. Complete a trade in the Trading Arena to populate live on-chain logs.
                      </td>
                    </tr>
                  ) : (
                    historyPositions.map((pos) => (
                      <tr key={pos.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td className="font-bobz" style={{ padding: '0.75rem 0.5rem' }}>{pos.marketTitle}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{ color: pos.side === 'UP' ? 'var(--color-green)' : 'var(--color-red)', fontWeight: 800 }}>
                            {pos.side}
                          </span>
                        </td>
                        <td className="font-terminal" style={{ padding: '0.75rem 0.5rem' }}>${pos.investedUSD.toFixed(2)}</td>
                        <td className="font-terminal" style={{ padding: '0.75rem 0.5rem', color: pos.status === 'WON' ? 'var(--color-green)' : 'var(--color-red)', fontWeight: 800 }}>
                          ${pos.potentialPayoutUSD.toFixed(2)}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span
                            style={{
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: pos.status === 'WON' || pos.status === 'CASHED_OUT' ? 'rgba(0,200,83,0.1)' : 'rgba(229,9,20,0.1)',
                              color: pos.status === 'WON' || pos.status === 'CASHED_OUT' ? 'var(--color-green)' : 'var(--color-red)',
                              fontSize: '0.68rem',
                              fontFamily: 'var(--font-bobz)',
                              fontWeight: 800,
                            }}
                          >
                            {pos.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <a
                            href={`https://shannon-explorer.somnia.network/tx/${pos.txHash || '0x'}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#6B7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                            className="font-terminal"
                          >
                            <span>{pos.txHash ? `${pos.txHash.slice(0, 8)}...` : 'On-Chain'}</span>
                            <ExternalLink size={10} />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          padding: '2rem 1.5rem 1.5rem 1.5rem',
          backgroundColor: '#FFFFFF',
          textAlign: 'center',
          marginTop: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <span className="font-bobz" style={{ fontSize: '0.82rem', fontWeight: 800 }}>FLIP Protocol</span>
          <span
            style={{
              fontSize: '0.64rem',
              fontFamily: 'var(--font-terminal)',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              backgroundColor: 'rgba(0, 200, 83, 0.1)',
              color: 'var(--color-green)',
              fontWeight: 700,
            }}
          >
            Somnia Shannon
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '0.85rem', fontSize: '0.76rem' }}>
          <button onClick={onBackToArena} className="font-subtext" style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
            Trading Arena
          </button>
          <a href="https://docs.dreamdex.io" target="_blank" rel="noreferrer" className="font-subtext" style={{ color: '#6B7280', textDecoration: 'none' }}>
            Documentation
          </a>
          <a href="https://shannon-explorer.somnia.network" target="_blank" rel="noreferrer" className="font-subtext" style={{ color: '#6B7280', textDecoration: 'none' }}>
            Explorer
          </a>
        </div>

        <div className="font-subtext" style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
          © 2026 FLIP. High-velocity binary prediction markets on Somnia Shannon Testnet.
        </div>
      </footer>

      {/* Modal: Split-Screen Onboarding Connect Wallet Modal */}
      <ConnectWalletModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />
    </div>
  );
};
