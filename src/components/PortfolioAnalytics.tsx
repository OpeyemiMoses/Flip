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
  PieChart,
  Coins,
} from 'lucide-react';
import { ConnectWalletModal } from './ConnectWalletModal';
import { useMarketStore } from '../store/marketStore';
import { usePositions } from '../hooks/usePositions';
import { WalletSigner } from '../services/walletSigner';
import confetti from 'canvas-confetti';

interface PortfolioAnalyticsProps {
  onBackToArena: () => void;
  onBackToLanding: () => void;
}

export const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({
  onBackToArena,
  onBackToLanding,
}) => {
  const { userBalanceUSD, userGasSTT, isConnected, userAddress, markets, stats, addToast, refreshBalances } = useMarketStore();
  const { positions, activePositions, historyPositions, cashOut } = usePositions();
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D' | 'ALL'>('ALL');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  const [isRequestingFaucet, setIsRequestingFaucet] = useState(false);

  const unclaimedPositions = positions.filter((p) => p.status === 'WON');
  const unclaimedUSD = unclaimedPositions.reduce((sum, p) => sum + (p.potentialPayoutUSD || 0), 0);

  const handleClaimAll = async () => {
    if (unclaimedPositions.length === 0) return;
    setIsClaimingAll(true);
    try {
      for (const pos of unclaimedPositions) {
        await cashOut(pos.id);
      }
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#00C853', '#FFFFFF', '#00E676'],
        });
      } catch {}
      addToast({
        type: 'success',
        title: 'All Winnings Claimed!',
        message: 'All prediction payouts have been settled directly to your wallet.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Claim Failed',
        message: err.message || 'Could not claim all winnings.',
      });
    } finally {
      setIsClaimingAll(false);
    }
  };

  const handleRequestFaucet = async () => {
    if (!userAddress) {
      setIsConnectModalOpen(true);
      return;
    }
    setIsRequestingFaucet(true);
    try {
      addToast({
        type: 'info',
        title: 'Requesting Test Tokens',
        message: 'Please confirm the on-chain faucet transaction in your wallet...',
      });
      const { txHash } = await WalletSigner.requestTestnetFaucet({ userAddress, amountUSD: 100 });
      await refreshBalances();
      addToast({
        type: 'success',
        title: 'Faucet Claimed!',
        message: '100 tUSDC has been minted directly into your wallet on Somnia Shannon.',
        txHash,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Faucet Error',
        message: err.message || 'Could not claim faucet.',
      });
    } finally {
      setIsRequestingFaucet(false);
    }
  };

  // PRIMARY SOURCE: Persisted stats object (survives ledger clears)
  // These accumulate across all time and are NOT reset when clearing the ledger
  const totalWageredAll = stats?.totalVolumeUSD ?? 0;
  const totalTradesAll = stats?.totalTrades ?? 0;
  const winsAll = stats?.wins ?? 0;
  const lossesAll = stats?.losses ?? 0;
  const winRateAll = totalTradesAll > 0 ? (winsAll / totalTradesAll) * 100 : 0;
  const netPnLAll = stats?.netPnLUSD ?? 0;
  const currentStreak = stats?.winStreak ?? 0;
  const maxStreak = stats?.maxWinStreak ?? 0;

  // SECONDARY: historyPositions is used for the on-screen audit log table only
  // Also used to compute current unclaimed amounts
  const totalInvested = activePositions.reduce((acc, p) => acc + p.investedUSD, 0) +
    historyPositions.reduce((acc, p) => acc + p.investedUSD, 0);

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

          {/* Portfolio Balance & Dedicated On-Chain Withdrawal Card */}
          <div
            className="card-paper"
            style={{
              padding: '1.75rem 2rem',
              marginBottom: '1.75rem',
              backgroundColor: '#0A0A0A',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem',
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-green)',
                    display: 'inline-block',
                  }}
                />
                <span className="font-terminal" style={{ fontSize: '0.74rem', color: '#9CA3AF', textTransform: 'uppercase' }}>
                  CONNECTED WALLET BALANCE
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                <span className="font-bobz" style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--color-green)' }}>
                  ${userAddress ? userBalanceUSD.toFixed(2) : '0.00'}
                </span>
                <span className="font-terminal" style={{ fontSize: '0.88rem', color: '#9CA3AF', fontWeight: 600 }}>
                  tUSDC Collateral
                </span>
                <span style={{ color: '#4B5563', fontSize: '0.88rem' }}>•</span>
                <span className="font-terminal" style={{ fontSize: '0.88rem', color: '#9CA3AF' }}>
                  {userAddress ? userGasSTT.toFixed(3) : '0.000'} STT Gas
                </span>
              </div>
              <p className="font-subtext" style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: '0.4rem 0 0 0', maxWidth: '560px', lineHeight: 1.5 }}>
                {userAddress
                  ? 'FLIP is 100% non-custodial on Somnia Shannon. All betting collateral and settled winnings are credited directly into your Web3 wallet address.'
                  : 'Connect your Web3 wallet to participate in decentralized binary predictions and monitor audited settlements.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {!userAddress ? (
                <button
                  onClick={() => setIsConnectModalOpen(true)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '28px',
                    padding: '0.9rem 1.85rem',
                    fontFamily: 'var(--font-bobz)',
                    fontWeight: 800,
                    fontSize: '0.94rem',
                    letterSpacing: '0.02em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Wallet size={17} />
                  <span>CONNECT WALLET</span>
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleRequestFaucet}
                    disabled={isRequestingFaucet}
                    title="Claim 100 tUSDC testnet collateral on Somnia Shannon"
                    style={{
                      backgroundColor: 'rgba(0, 200, 83, 0.14)',
                      color: '#00FFA3',
                      border: '1px solid rgba(0, 200, 83, 0.35)',
                      borderRadius: '28px',
                      padding: '0.82rem 1.45rem',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      letterSpacing: '0.02em',
                      cursor: isRequestingFaucet ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isRequestingFaucet) {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 200, 83, 0.24)';
                        e.currentTarget.style.borderColor = 'rgba(0, 200, 83, 0.6)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isRequestingFaucet) {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 200, 83, 0.14)';
                        e.currentTarget.style.borderColor = 'rgba(0, 200, 83, 0.35)';
                      }
                    }}
                  >
                    <Coins size={16} color="var(--color-green)" />
                    <span>{isRequestingFaucet ? 'MINTING TOKENS...' : 'GET 100 tUSDC (FAUCET)'}</span>
                  </button>

                  {unclaimedUSD > 0 && (
                    <button
                      onClick={handleClaimAll}
                      disabled={isClaimingAll}
                      style={{
                        backgroundColor: 'var(--color-green)',
                        color: '#000000',
                        border: 'none',
                        borderRadius: '28px',
                        padding: '0.82rem 1.45rem',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        letterSpacing: '0.02em',
                        cursor: isClaimingAll ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        boxShadow: '0 4px 20px rgba(0, 200, 83, 0.4)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <CheckCircle2 size={17} />
                      <span>{isClaimingAll ? 'CLAIMING...' : `CLAIM ALL ($${unclaimedUSD.toFixed(2)})`}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Metric Cards Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div className="card-paper" style={{ padding: '1.35rem 1.5rem' }}>
              <span className="font-terminal" style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'block', marginBottom: '0.35rem' }}>NET REALIZED PROFIT</span>
              <div className="font-bobz" style={{ fontSize: '1.55rem', color: netPnLAll >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                {netPnLAll >= 0 ? `+$${netPnLAll.toFixed(2)}` : `-$${Math.abs(netPnLAll).toFixed(2)}`}
              </div>
            </div>

            <div className="card-paper" style={{ padding: '1.35rem 1.5rem' }}>
              <span className="font-terminal" style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'block', marginBottom: '0.35rem' }}>WIN RATE</span>
              <div className="font-bobz" style={{ fontSize: '1.55rem', color: 'var(--color-black)' }}>
                {winRateAll.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.2rem' }} className="font-terminal">
                {winsAll}W / {lossesAll}L
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
                ${totalWageredAll.toFixed(2)}
              </div>
            </div>

            <div className="card-paper" style={{ padding: '1.35rem 1.5rem' }}>
              <span className="font-terminal" style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'block', marginBottom: '0.35rem' }}>SOMNIA GAS SAVED</span>
              <div className="font-bobz" style={{ fontSize: '1.55rem', color: 'var(--color-green)' }}>
                ${((totalTradesAll + activePositions.length) * 0.45).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Educational Analytics Guide: Where Winning Assets Come From & How Settlements Work */}
          <div
            className="card-paper"
            style={{
              padding: '1.75rem',
              marginBottom: '1.75rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <ShieldCheck size={18} color="var(--color-green)" />
              <h3 className="font-bobz" style={{ margin: 0, fontSize: '1.15rem' }}>
                Liquidity Architecture: Where Do Your Winning Payouts Come From?
              </h3>
            </div>
            <p className="font-subtext" style={{ fontSize: '0.88rem', color: 'var(--color-grey-text)', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
              FLIP does not rely on arbitrary balances or centralized reserves. All payouts are 100% fully collateralized through non-custodial Somnia smart contracts using a three-tier liquidity engine:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', borderTop: '1px dashed rgba(0,0,0,0.08)', paddingTop: '1.25rem' }}>
              <div>
                <div className="font-bobz" style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-black)' }}>
                  1. Parimutuel Counterparty Pool
                </div>
                <div className="font-subtext" style={{ fontSize: '0.80rem', color: '#6B7280', marginTop: '0.3rem', lineHeight: 1.5 }}>
                  When you predict UP and an opposing trader predicts DOWN, both entry stakes lock in the settlement escrow. The winner receives their initial capital plus the pool of the opposing side's lost wager.
                </div>
              </div>
              <div>
                <div className="font-bobz" style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-black)' }}>
                  2. Protocol Maker Seed Vault
                </div>
                <div className="font-subtext" style={{ fontSize: '0.80rem', color: '#6B7280', marginTop: '0.3rem', lineHeight: 1.5 }}>
                  In fast 15-minute markets, the FLIP Maker Vault seeds the opposing side of any unfilled order to guarantee instant execution. Every single share minted is backed 1:1 by real USDso collateral.
                </div>
              </div>
              <div>
                <div className="font-bobz" style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-black)' }}>
                  3. Non-Custodial Smart Contract Escrow
                </div>
                <div className="font-subtext" style={{ fontSize: '0.80rem', color: '#6B7280', marginTop: '0.3rem', lineHeight: 1.5 }}>
                  FLIP is 100% non-custodial on Somnia Shannon. All betting collateral and settled winnings are credited directly into your connected Web3 wallet. When you claim rewards, collateral is redeemed directly to your address.
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
                  {!userAddress || historyPositions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: '#9CA3AF' }} className="font-subtext">
                        {!userAddress
                          ? 'Please connect your Web3 wallet to view your historical performance and audited settlements.'
                          : 'No settled historical records yet. Complete a trade in the Trading Arena to populate live on-chain logs.'}
                      </td>
                    </tr>
                  ) : (
                    historyPositions.map((pos) => {
                      const isWithdraw = pos.status === 'WITHDRAWN';
                      return (
                        <tr key={pos.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td className="font-bobz" style={{ padding: '0.75rem 0.5rem' }}>{pos.marketTitle}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            {isWithdraw ? (
                              <span style={{ color: '#8B5CF6', fontWeight: 800 }}>
                                WITHDRAW
                              </span>
                            ) : (
                              <span style={{ color: pos.side === 'UP' ? 'var(--color-green)' : 'var(--color-red)', fontWeight: 800 }}>
                                {pos.side}
                              </span>
                            )}
                          </td>
                          <td className="font-terminal" style={{ padding: '0.75rem 0.5rem' }}>${pos.investedUSD.toFixed(2)}</td>
                          <td
                            className="font-terminal"
                            style={{
                              padding: '0.75rem 0.5rem',
                              color:
                                pos.status === 'WON' || pos.status === 'CLAIMED'
                                  ? 'var(--color-green)'
                                  : pos.status === 'CASHED_OUT'
                                  ? (pos.unrealizedPnLUSD || 0) >= 0 ? 'var(--color-green)' : 'var(--color-red)'
                                  : 'var(--color-red)',
                              fontWeight: 800,
                            }}
                          >
                            {pos.status === 'CASHED_OUT'
                              ? `$${(pos.cashoutPayoutUSD !== undefined ? pos.cashoutPayoutUSD : pos.currentValueUSD).toFixed(2)} cashed out`
                              : pos.status === 'WON' || pos.status === 'CLAIMED'
                              ? `$${pos.potentialPayoutUSD.toFixed(2)}`
                              : '$0.00'}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span
                              style={{
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                backgroundColor: isWithdraw
                                  ? 'rgba(139, 92, 246, 0.12)'
                                  : pos.status === 'WON' || pos.status === 'CLAIMED'
                                  ? 'rgba(0,200,83,0.1)'
                                  : pos.status === 'CASHED_OUT'
                                  ? 'rgba(156,163,175,0.15)'
                                  : 'rgba(229,9,20,0.1)',
                                color: isWithdraw
                                  ? '#8B5CF6'
                                  : pos.status === 'WON' || pos.status === 'CLAIMED'
                                  ? 'var(--color-green)'
                                  : pos.status === 'CASHED_OUT'
                                  ? '#4B5563'
                                  : 'var(--color-red)',
                                fontSize: '0.68rem',
                                fontFamily: 'var(--font-bobz)',
                                fontWeight: 800,
                              }}
                            >
                              {pos.status === 'WON'
                                ? 'WON (CLAIMABLE)'
                                : pos.status === 'CLAIMED'
                                ? 'CLAIMED'
                                : pos.status === 'CASHED_OUT'
                                ? 'CASHED OUT'
                                : pos.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                            {pos.txHash ? (
                              <a
                                href={`https://shannon-explorer.somnia.network/tx/${pos.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#6B7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                className="font-terminal"
                              >
                                <span>{pos.txHash.slice(0, 6)}...{pos.txHash.slice(-4)}</span>
                                <ExternalLink size={10} />
                              </a>
                            ) : (
                              <span className="font-terminal" style={{ color: '#9CA3AF' }}>On-Chain</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
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
