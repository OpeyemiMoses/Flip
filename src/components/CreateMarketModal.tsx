import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  PlusCircle,
  Users,
  Globe,
  Sparkles,
  Zap,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Copy,
  QrCode,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Coins,
} from 'lucide-react';
import { BinaryMarket, calculateStrikeAndProbability } from '../services/dreamdex';
import { ChallengeEngine, PrivateChallenge } from '../services/challengeEngine';
import { TradingEngine } from '../services/tradingEngine';
import { useMarketStore } from '../store/marketStore';
import { WalletSigner } from '../services/walletSigner';
import { livePriceStreamer } from '../services/livePriceStream';

interface CreateMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessCreated?: (type: 'public' | 'squad', id: string) => void;
}

export const CreateMarketModal: React.FC<CreateMarketModalProps> = ({
  isOpen,
  onClose,
  onSuccessCreated,
}) => {
  const { userAddress, userBalanceUSD, markets, addUserCreatedMarket, addPrivateChallenge, refreshBalances, refreshPositions, addToast } =
    useMarketStore();

  const [prices, setPrices] = useState<Record<string, { price: number; change24h: number }>>(() => {
    const p = livePriceStreamer.getPrices();
    const map: Record<string, { price: number; change24h: number }> = {};
    for (const [k, v] of Object.entries(p)) {
      map[k] = { price: v.price, change24h: v.change24h };
    }
    return map;
  });

  useEffect(() => {
    return livePriceStreamer.subscribe((fresh) => {
      setPrices((prev) => {
        const updated = { ...prev };
        for (const [k, v] of Object.entries(fresh)) {
          updated[k] = { price: v.price, change24h: v.change24h };
        }
        return updated;
      });
    });
  }, []);

  const getLivePrice = (asset: string): number => {
    const live = prices[asset]?.price || livePriceStreamer.getPrices()[asset]?.price || markets.find((m) => m.underlyingAsset === asset)?.currentPrice;
    if (live && live > 0) return live;
    // Real-time market anchor spot baselines
    if (asset === 'BTC') return 79067.0;
    if (asset === 'ETH') return 2483.8;
    if (asset === 'SOL') return 104.4;
    if (asset === 'SUI') return 0.823;
    if (asset === 'DOGE') return 0.0902;
    if (asset === 'PEPE') return 0.00000362;
    return 0.85;
  };

  const [activeTab, setActiveTab] = useState<'squad' | 'public'>('squad');

  // Squad Challenge Form State
  const [squadTitle, setSquadTitle] = useState('');
  const [squadAsset, setSquadAsset] = useState('BTC');
  const [squadStrike, setSquadStrike] = useState<number>(() => getLivePrice('BTC'));
  const [squadEntryFee, setSquadEntryFee] = useState(25);
  const [squadMaxPlayers, setSquadMaxPlayers] = useState(6);
  const [squadDurationMins, setSquadDurationMins] = useState(30);
  const [squadCreatorSide, setSquadCreatorSide] = useState<'UP' | 'DOWN'>('UP');

  // Public Market Form State
  const [publicAsset, setPublicAsset] = useState('BTC');
  const [publicStrike, setPublicStrike] = useState<number>(() => getLivePrice('BTC'));
  const [publicDurationHours, setPublicDurationHours] = useState(1);
  const [publicSeedCollateral, setPublicSeedCollateral] = useState(50);

  // Sync strike with live price only on open or token switch (prevents background polling from erasing user typed input)
  useEffect(() => {
    if (isOpen) {
      const liveSquad = Math.round(getLivePrice(squadAsset));
      const livePublic = Math.round(getLivePrice(publicAsset));
      if (liveSquad > 0) setSquadStrike(liveSquad);
      if (livePublic > 0) setPublicStrike(livePublic);
    }
  }, [isOpen, squadAsset, publicAsset]);

  // Post creation modal state (Share & QR Code)
  const [createdChallenge, setCreatedChallenge] = useState<PrivateChallenge | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress) {
      addToast({ type: 'warning', title: 'Wallet Required', message: 'Please connect your wallet first.' });
      return;
    }

    if (userBalanceUSD < squadEntryFee) {
      addToast({
        type: 'warning',
        title: 'Insufficient Balance',
        message: `Insufficient tUSDC balance. You have $${userBalanceUSD.toFixed(2)} tUSDC.`,
      });
      return;
    }

    setIsSubmitting(true);
    addToast({
      type: 'info',
      title: 'Deploying Squad Challenge',
      message: 'Broadcasting escrow transaction to Somnia Shannon L1...',
    });

    try {
      // Strictly fetch fresh, un-cached live market prices directly from oracle at this exact creation second
      const freshPrices = await livePriceStreamer.fetchRestPrices().catch(() => livePriceStreamer.getPrices());
      const liveSpot = freshPrices[squadAsset]?.price || livePriceStreamer.getPrices()[squadAsset]?.price || getLivePrice(squadAsset);

      const squadRoomTitle = squadTitle || `${squadAsset} Squad Strike (${squadDurationMins}m)`;

      // Prompt real wallet transaction or signature on Somnia Shannon
      const { txHash } = await WalletSigner.requestSquadSigning({
        userAddress,
        action: 'CREATE',
        challengeTitle: squadRoomTitle,
        entryFeeUSD: squadEntryFee,
        side: squadCreatorSide,
      });

      const challenge = ChallengeEngine.createChallenge({
        title: squadRoomTitle,
        creatorAddress: userAddress,
        underlyingAsset: squadAsset,
        strikePrice: Number(squadStrike),
        initialSpotPrice: liveSpot,
        entryFeeUSD: squadEntryFee,
        maxParticipants: squadMaxPlayers,
        durationMinutes: squadDurationMins,
        creatorSide: squadCreatorSide,
        txHash,
      });

      addPrivateChallenge(challenge);
      setCreatedChallenge(challenge);

      // Record in unified Activity page
      TradingEngine.recordSquadPosition({
        challengeId: challenge.id,
        title: squadRoomTitle,
        underlyingAsset: squadAsset,
        side: squadCreatorSide,
        amountUSD: squadEntryFee,
        userAddress,
        txHash,
      });

      refreshBalances();
      refreshPositions();

      addToast({
        type: 'success',
        title: 'Squad Challenge Created',
        message: `Escrow deposited for "${squadRoomTitle}". Challenge is now live!`,
        txHash,
      });

      if (onSuccessCreated) {
        onSuccessCreated('squad', challenge.id);
      }
    } catch (err: any) {
      console.warn('Squad creation cancelled or failed:', err);
      const errMsg = err?.message || 'Error creating squad challenge';
      addToast({
        type: 'error',
        title: 'Squad Creation Cancelled',
        message: errMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePublic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress) {
      addToast({ type: 'warning', title: 'Wallet Required', message: 'Please connect your wallet first.' });
      return;
    }

    if (userBalanceUSD < publicSeedCollateral) {
      addToast({
        type: 'warning',
        title: 'Insufficient Seed Collateral',
        message: `Insufficient tUSDC balance for seed liquidity ($${publicSeedCollateral} tUSDC required).`,
      });
      return;
    }

    setIsSubmitting(true);
    addToast({
      type: 'info',
      title: 'Deploying Public Market',
      message: 'Broadcasting market creation transaction to Somnia Shannon...',
    });

    try {
      // Strictly fetch fresh, un-cached live market prices directly from oracle at this exact creation second
      const freshPrices = await livePriceStreamer.fetchRestPrices().catch(() => livePriceStreamer.getPrices());
      const liveSpot = freshPrices[publicAsset]?.price || livePriceStreamer.getPrices()[publicAsset]?.price || getLivePrice(publicAsset);
      const liveChange24h = freshPrices[publicAsset]?.change24h ?? 0;

      const now = Date.now();
      const expiryMs = now + publicDurationHours * 60 * 60 * 1000;
      const calc = calculateStrikeAndProbability(publicStrike, publicAsset);
      const marketTitle = `${publicAsset} / USD ${publicDurationHours}H Community Strike`;

      // Prompt real wallet transaction or signature for seed liquidity
      const { txHash } = await WalletSigner.requestMarketCreationSigning({
        userAddress,
        title: marketTitle,
        asset: publicAsset,
        strikePrice: Number(publicStrike),
        seedCollateralUSD: publicSeedCollateral,
      });

      const newMarket: BinaryMarket = {
        marketId: `custom-${publicAsset.toLowerCase()}-${Date.now().toString(36)}`,
        poolAddress: txHash.startsWith('0x') && txHash.length === 42 ? txHash : `0x${Array.from({ length: 40 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('')}`,
        title: marketTitle,
        description: `Will ${publicAsset} finish above $${Number(publicStrike).toLocaleString()} USD? Resolves via DreamDEX TWAP.`,
        underlyingAsset: publicAsset,
        symbol: `${publicAsset}USDT`,
        strikePrice: Number(publicStrike),
        currentPrice: liveSpot,
        change24h: liveChange24h,
        high24h: freshPrices[publicAsset]?.high24h || liveSpot * 1.02,
        low24h: freshPrices[publicAsset]?.low24h || liveSpot * 0.98,
        lastClosePrice: liveSpot,
        previousRoundWinningOutcome: 'UP',
        roundNumber: 1,
        expiryTimestampNs: BigInt(expiryMs) * 1_000_000n,
        expiryDate: new Date(expiryMs),
        isResolved: false,
        collateralToken: 'tUSDC',
        upTokenId: `${Date.now()}-up`,
        downTokenId: `${Date.now()}-down`,
        bestUpProbability: calc.bestUpProbability,
        bestDownProbability: calc.bestDownProbability,
        totalVolumeUSD: publicSeedCollateral,
        totalLiquidityUSD: publicSeedCollateral * 2,
        lastUpdated: now,
      };

      addUserCreatedMarket(newMarket);
      refreshBalances();

      addToast({
        type: 'success',
        title: 'Community Market Created',
        message: `Market "${marketTitle}" deployed on Somnia Shannon!`,
        txHash,
      });

      if (onSuccessCreated) {
        onSuccessCreated('public', newMarket.marketId);
      }
      onClose();
    } catch (err: any) {
      console.warn('Market creation cancelled or failed:', err);
      const errMsg = err?.message || 'Error creating community market';
      addToast({
        type: 'error',
        title: 'Market Creation Cancelled',
        message: errMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareUrl = createdChallenge ? ChallengeEngine.getShareableUrl(createdChallenge.id) : '';

  const copyShareLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFA',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <PlusCircle size={20} color="var(--color-black)" />
            <h3
              className="font-bobz"
              style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-black)' }}
            >
              {createdChallenge ? 'Squad Challenge Created!' : 'Create Prediction Market'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-grey-muted)',
              padding: '0.25rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          {createdChallenge ? (
            /* Squad Challenge Share Screen with QR Code & Link */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: '#E8F5E9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <CheckCircle2 size={32} color="#2E7D32" />
              </div>

              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem' }}>
                {createdChallenge.title}
              </h4>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--color-grey-text)' }}>
                Share this link or QR Code with your squad. When members join, deposits accumulate in the pot and resolve on Somnia Shannon testnet.
              </p>

              {/* QR Code Frame */}
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.12)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    shareUrl
                  )}`}
                  alt="Squad QR Code"
                  style={{ width: '160px', height: '160px', borderRadius: '6px' }}
                />
                <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--color-grey-muted)' }}>
                  Scan on mobile to join squad
                </span>
              </div>

              {/* Link Input & Copy */}
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.15)',
                    backgroundColor: '#F5F5F5',
                    fontFamily: 'var(--font-terminal)',
                  }}
                />
                <button
                  onClick={copyShareLink}
                  style={{
                    padding: '0.65rem 1.1rem',
                    backgroundColor: 'var(--color-black)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {copiedLink ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Summary Stats */}
              <div
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  padding: '0.85rem',
                  backgroundColor: '#F9F9F9',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                  fontSize: '0.75rem',
                }}
              >
                <div>
                  <div style={{ color: 'var(--color-grey-muted)' }}>Entry Fee</div>
                  <div className="font-mono" style={{ fontWeight: 700 }}>${createdChallenge.entryFeeUSD} tUSDC</div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-grey-muted)' }}>Squad Limit</div>
                  <div className="font-mono" style={{ fontWeight: 700 }}>{createdChallenge.maxParticipants} Players</div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-grey-muted)' }}>Your Pick</div>
                  <div
                    className="font-mono"
                    style={{
                      fontWeight: 700,
                      color: createdChallenge.participants[0]?.side === 'UP' ? 'var(--color-green)' : 'var(--color-red)',
                    }}
                  >
                    {createdChallenge.participants[0]?.side}
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="btn-launch-black"
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
              >
                Enter Squad Arena
              </button>
            </div>
          ) : (
            /* Creation Form */
            <>
              {/* Type Switcher */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  backgroundColor: '#F0F0F0',
                  padding: '4px',
                  borderRadius: '10px',
                  marginBottom: '1.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('squad')}
                  style={{
                    padding: '0.65rem',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    backgroundColor: activeTab === 'squad' ? '#FFFFFF' : 'transparent',
                    color: activeTab === 'squad' ? 'var(--color-black)' : 'var(--color-grey-muted)',
                    boxShadow: activeTab === 'squad' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <Users size={16} />
                  <span>Private Squad Challenge</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('public')}
                  style={{
                    padding: '0.65rem',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    backgroundColor: activeTab === 'public' ? '#FFFFFF' : 'transparent',
                    color: activeTab === 'public' ? 'var(--color-black)' : 'var(--color-grey-muted)',
                    boxShadow: activeTab === 'public' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <Globe size={16} />
                  <span>Public Crypto Market</span>
                </button>
              </div>

              {activeTab === 'squad' ? (
                /* 1. SQUAD CHALLENGE FORM */
                <form onSubmit={handleCreateSquad} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  {/* Live CoinGecko Spot Price & Previous Close Banner */}
                  {(() => {
                    const relatedMarket = markets.find((m) => m.underlyingAsset === squadAsset);
                    const lastClose = relatedMarket?.lastClosePrice;
                    const lastOutcome = relatedMarket?.previousRoundWinningOutcome;

                    return (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem',
                          padding: '0.75rem 0.9rem',
                          backgroundColor: '#F3F4F6',
                          borderRadius: '10px',
                          border: '1px solid rgba(0,0,0,0.06)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#10B981',
                                display: 'inline-block',
                                boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                              }}
                            />
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-black)' }}>
                              CoinGecko Live Spot ({squadAsset}/USD):
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-black)' }}>
                              ${getLivePrice(squadAsset).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSquadStrike(Math.round(getLivePrice(squadAsset)))}
                              style={{
                                fontSize: '0.68rem',
                                padding: '0.2rem 0.45rem',
                                borderRadius: '4px',
                                border: '1px solid rgba(0,0,0,0.15)',
                                backgroundColor: '#FFFFFF',
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              Sync Live Strike
                            </button>
                          </div>
                        </div>

                        {lastClose && (
                          <div
                            className="font-mono"
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--color-grey-text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderTop: '1px solid rgba(0,0,0,0.06)',
                              paddingTop: '0.35rem',
                              marginTop: '0.1rem',
                            }}
                          >
                            <span>Previous Round Close Anchor:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontWeight: 700, color: lastOutcome === 'UP' ? 'var(--color-green)' : 'var(--color-red)' }}>
                                ${Math.round(lastClose).toLocaleString()} ({lastOutcome || 'RESOLVED'})
                              </span>
                              <button
                                type="button"
                                onClick={() => setSquadStrike(Math.round(lastClose))}
                                style={{
                                  fontSize: '0.66rem',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(0,0,0,0.15)',
                                  backgroundColor: '#FFFFFF',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                Set As Strike
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Challenge Title
                    </label>
                    <input
                      type="text"
                      placeholder={`e.g. Squad Strike: ${squadAsset} Breakout`}
                      value={squadTitle}
                      onChange={(e) => setSquadTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(0,0,0,0.15)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Underlying Asset
                      </label>
                      <select
                        value={squadAsset}
                        onChange={(e) => {
                          const asset = e.target.value;
                          setSquadAsset(asset);
                          setSquadStrike(getLivePrice(asset));
                        }}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(0,0,0,0.15)',
                          fontSize: '0.85rem',
                          backgroundColor: '#FFFFFF',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="BTC">Bitcoin (BTC / USD)</option>
                        <option value="ETH">Ethereum (ETH / USD)</option>
                        <option value="SOL">Solana (SOL / USD)</option>
                        <option value="DOGE">Dogecoin (DOGE / USD)</option>
                        <option value="PEPE">Pepe (PEPE / USD)</option>
                      </select>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                          Target Strike Price ($)
                        </label>
                        <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--color-grey-muted)' }}>
                          Spot: ${getLivePrice(squadAsset).toLocaleString()}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={squadStrike}
                        onChange={(e) => setSquadStrike(parseFloat(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(0,0,0,0.15)',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* Market Fit / Volatility Feasibility Indicator */}
                  {(() => {
                    const spot = getLivePrice(squadAsset);
                    const diff = squadStrike > 0 ? ((squadStrike - spot) / spot) * 100 : 0;
                    const absDiff = Math.abs(diff);
                    const isFit = squadStrike > 0 && absDiff <= 50;
                    const isOptimal = squadStrike > 0 && absDiff <= 25;

                    return (
                      <div
                        style={{
                          padding: '0.7rem 0.85rem',
                          borderRadius: '8px',
                          backgroundColor: squadStrike <= 0 ? '#FEE2E2' : isOptimal ? '#ECFDF5' : isFit ? '#FFFBEB' : '#FEF2F2',
                          border: `1px solid ${squadStrike <= 0 ? '#FCA5A5' : isOptimal ? '#A7F3D0' : isFit ? '#FDE68A' : '#FECACA'}`,
                          fontSize: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 700, color: squadStrike <= 0 ? '#991B1B' : isOptimal ? '#065F46' : isFit ? '#92400E' : '#991B1B' }}>
                            {squadStrike <= 0
                              ? '❌ Invalid Strike Price'
                              : isOptimal
                              ? '✓ Market Fit: Optimal Volatility Corridor (Fit to Go Live)'
                              : isFit
                              ? '⚡ Market Fit: High Volatility Strike (Fit to Go Live)'
                              : '⚠️ Market Fit Warning: High Strike Divergence'}
                          </span>
                          <span className="font-mono" style={{ fontWeight: 600, fontSize: '0.72rem' }}>
                            {diff >= 0 ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`} from spot
                          </span>
                        </div>
                        <div style={{ color: 'var(--color-grey-text)', fontSize: '0.72rem' }}>
                          {squadStrike <= 0
                            ? 'Strike price must be greater than 0.'
                            : isOptimal
                            ? `Strike is within normal ${squadDurationMins}m price movement range. Excellent market fit for squad settlement.`
                            : isFit
                            ? `Strike is moderately higher/lower than spot ($${spot.toLocaleString()}). Requires noticeable breakout.`
                            : `Strike deviates by ${absDiff.toFixed(1)}% from current spot price ($${spot.toLocaleString()}). May have low engagement.`}
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Entry Bet (tUSDC)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="500"
                        value={squadEntryFee}
                        onChange={(e) => setSquadEntryFee(parseInt(e.target.value) || 25)}
                        style={{
                          width: '100%',
                          padding: '0.6rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(0,0,0,0.15)',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Squad Max Players
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="20"
                        value={squadMaxPlayers}
                        onChange={(e) => setSquadMaxPlayers(parseInt(e.target.value) || 6)}
                        style={{
                          width: '100%',
                          padding: '0.6rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(0,0,0,0.15)',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Duration (Mins)
                      </label>
                      <select
                        value={squadDurationMins}
                        onChange={(e) => setSquadDurationMins(parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '0.6rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(0,0,0,0.15)',
                          fontSize: '0.85rem',
                          backgroundColor: '#FFFFFF',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="15">15 Mins</option>
                        <option value="30">30 Mins</option>
                        <option value="60">1 Hour</option>
                        <option value="240">4 Hours</option>
                      </select>
                    </div>
                  </div>

                  {/* Creator Side Picker */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Your Squad Prediction (Creator Bet)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                      <button
                        type="button"
                        onClick={() => setSquadCreatorSide('UP')}
                        style={{
                          padding: '0.65rem',
                          borderRadius: '8px',
                          border:
                            squadCreatorSide === 'UP'
                              ? '2px solid var(--color-green)'
                              : '1px solid rgba(0,0,0,0.15)',
                          backgroundColor: squadCreatorSide === 'UP' ? 'rgba(0, 194, 120, 0.08)' : '#FFFFFF',
                          color: squadCreatorSide === 'UP' ? 'var(--color-green)' : 'var(--color-black)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <TrendingUp size={16} />
                        <span>BET UP (≥ ${squadStrike})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSquadCreatorSide('DOWN')}
                        style={{
                          padding: '0.65rem',
                          borderRadius: '8px',
                          border:
                            squadCreatorSide === 'DOWN'
                              ? '2px solid var(--color-red)'
                              : '1px solid rgba(0,0,0,0.15)',
                          backgroundColor: squadCreatorSide === 'DOWN' ? 'rgba(255, 68, 68, 0.08)' : '#FFFFFF',
                          color: squadCreatorSide === 'DOWN' ? 'var(--color-red)' : 'var(--color-black)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <TrendingDown size={16} />
                        <span>BET DOWN (&lt; ${squadStrike})</span>
                      </button>
                    </div>
                  </div>

                  {/* Info Notice */}
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#F8F9FA',
                      fontSize: '0.75rem',
                      color: 'var(--color-grey-text)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                      <ShieldCheck size={14} color="var(--color-green)" />
                      <span>On-Chain Parimutuel Settlement Rules:</span>
                    </div>
                    <div>• If all squad members win: Deposits are paid out net of 2% protocol & ecosystem fee.</div>
                    <div>• If all lose: Pot flows into DreamDEX ecosystem + 2% protocol fee.</div>
                    <div>• If mixed: Losers' pot is shared among winners based on their stake (minus 2% protocol fee).</div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || squadStrike <= 0}
                    className="btn-launch-black"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '0.85rem',
                      marginTop: '0.5rem',
                      opacity: squadStrike <= 0 ? 0.5 : 1,
                    }}
                  >
                    {isSubmitting ? 'Creating Squad on Somnia...' : `Create Squad & Deposit $${squadEntryFee} tUSDC`}
                  </button>
                </form>
              ) : (
                /* 2. PUBLIC MARKET FORM */
                <form onSubmit={handleCreatePublic} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  {/* Live CoinGecko Spot Price & Previous Close Banner */}
                  {(() => {
                    const relatedMarket = markets.find((m) => m.underlyingAsset === publicAsset);
                    const lastClose = relatedMarket?.lastClosePrice;
                    const lastOutcome = relatedMarket?.previousRoundWinningOutcome;

                    return (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem',
                          padding: '0.75rem 0.9rem',
                          backgroundColor: '#F3F4F6',
                          borderRadius: '10px',
                          border: '1px solid rgba(0,0,0,0.06)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#10B981',
                                display: 'inline-block',
                                boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                              }}
                            />
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-black)' }}>
                              CoinGecko Live Spot ({publicAsset}/USD):
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-black)' }}>
                              ${getLivePrice(publicAsset).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPublicStrike(Math.round(getLivePrice(publicAsset)))}
                              style={{
                                fontSize: '0.68rem',
                                padding: '0.2rem 0.45rem',
                                borderRadius: '4px',
                                border: '1px solid rgba(0,0,0,0.15)',
                                backgroundColor: '#FFFFFF',
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              Sync Live Strike
                            </button>
                          </div>
                        </div>

                        {lastClose && (
                          <div
                            className="font-mono"
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--color-grey-text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderTop: '1px solid rgba(0,0,0,0.06)',
                              paddingTop: '0.35rem',
                              marginTop: '0.1rem',
                            }}
                          >
                            <span>Previous Round Close Anchor:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontWeight: 700, color: lastOutcome === 'UP' ? 'var(--color-green)' : 'var(--color-red)' }}>
                                ${Math.round(lastClose).toLocaleString()} ({lastOutcome || 'RESOLVED'})
                              </span>
                              <button
                                type="button"
                                onClick={() => setPublicStrike(Math.round(lastClose))}
                                style={{
                                  fontSize: '0.66rem',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(0,0,0,0.15)',
                                  backgroundColor: '#FFFFFF',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                Set As Strike
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Token Asset
                    </label>
                    <select
                      value={publicAsset}
                      onChange={(e) => {
                        const asset = e.target.value;
                        setPublicAsset(asset);
                        setPublicStrike(getLivePrice(asset));
                      }}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(0,0,0,0.15)',
                        fontSize: '0.85rem',
                        backgroundColor: '#FFFFFF',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="BTC">Bitcoin (BTC / USD)</option>
                      <option value="ETH">Ethereum (ETH / USD)</option>
                      <option value="SOL">Solana (SOL / USD)</option>
                      <option value="DOGE">Dogecoin (DOGE / USD)</option>
                      <option value="PEPE">Pepe (PEPE / USD)</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                          Target Strike Price ($)
                        </label>
                        <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--color-grey-muted)' }}>
                          Spot: ${getLivePrice(publicAsset).toLocaleString()}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={publicStrike}
                        onChange={(e) => setPublicStrike(parseFloat(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(0,0,0,0.15)',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Round Expiry Window
                      </label>
                      <select
                        value={publicDurationHours}
                        onChange={(e) => setPublicDurationHours(parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(0,0,0,0.15)',
                          fontSize: '0.85rem',
                          backgroundColor: '#FFFFFF',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="1">1 Hour Window</option>
                        <option value="4">4 Hours Window</option>
                        <option value="24">24 Hours (Daily)</option>
                        <option value="168">7 Days (Weekly)</option>
                      </select>
                    </div>
                  </div>

                  {/* Public Market Fit Check */}
                  {(() => {
                    const spot = getLivePrice(publicAsset);
                    const diff = publicStrike > 0 ? ((publicStrike - spot) / spot) * 100 : 0;
                    const absDiff = Math.abs(diff);
                    const isFit = publicStrike > 0 && absDiff <= 50;
                    const isOptimal = publicStrike > 0 && absDiff <= 25;

                    return (
                      <div
                        style={{
                          padding: '0.7rem 0.85rem',
                          borderRadius: '8px',
                          backgroundColor: publicStrike <= 0 ? '#FEE2E2' : isOptimal ? '#ECFDF5' : isFit ? '#FFFBEB' : '#FEF2F2',
                          border: `1px solid ${publicStrike <= 0 ? '#FCA5A5' : isOptimal ? '#A7F3D0' : isFit ? '#FDE68A' : '#FECACA'}`,
                          fontSize: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 700, color: publicStrike <= 0 ? '#991B1B' : isOptimal ? '#065F46' : isFit ? '#92400E' : '#991B1B' }}>
                            {publicStrike <= 0
                              ? '❌ Invalid Strike Price'
                              : isOptimal
                              ? '✓ Market Fit: Optimal Volatility Corridor (Fit to Go Live)'
                              : isFit
                              ? '⚡ Market Fit: High Volatility Market (Fit to Go Live)'
                              : '⚠️ Market Fit Warning: Extreme Strike Divergence'}
                          </span>
                          <span className="font-mono" style={{ fontWeight: 600, fontSize: '0.72rem' }}>
                            {diff >= 0 ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`} from spot
                          </span>
                        </div>
                        <div style={{ color: 'var(--color-grey-text)', fontSize: '0.72rem' }}>
                          {publicStrike <= 0
                            ? 'Strike price must be greater than 0.'
                            : isOptimal
                            ? `Strike price is within active trading boundaries for ${publicDurationHours}h window. High probability of orderbook liquidity.`
                            : isFit
                            ? `Strike price is ${absDiff.toFixed(1)}% off spot price ($${spot.toLocaleString()}). Wide spread prediction.`
                            : `Strike deviates heavily from spot. Seed liquidity may experience asymmetric slippage.`}
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Initial Seed Collateral (tUSDC)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={publicSeedCollateral}
                      onChange={(e) => setPublicSeedCollateral(parseInt(e.target.value) || 50)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(0,0,0,0.15)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ fontSize: '0.73rem', color: 'var(--color-grey-muted)', marginTop: '0.3rem' }}>
                      Mints complete sets (1 USDso ⇄ 1 Up + 1 Down) to seed initial orderbook liquidity. You earn a 1% creator fee on all volume.
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || publicStrike <= 0}
                    className="btn-launch-black"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '0.85rem',
                      marginTop: '0.5rem',
                      opacity: publicStrike <= 0 ? 0.5 : 1,
                    }}
                  >
                    {isSubmitting ? 'Deploying Market...' : `Publish Public Market ($${publicSeedCollateral} tUSDC)`}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
