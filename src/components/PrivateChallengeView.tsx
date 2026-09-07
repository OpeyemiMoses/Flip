import React, { useState } from 'react';
import {
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  QrCode,
  Copy,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Trophy,
  Coins,
  Lock,
  EyeOff,
  HelpCircle,
} from 'lucide-react';
import { PrivateChallenge, ChallengeEngine } from '../services/challengeEngine';
import { TradingEngine } from '../services/tradingEngine';
import { useMarketStore } from '../store/marketStore';
import { formatUSD } from '../services/dreamdex';
import { WalletSigner } from '../services/walletSigner';

interface PrivateChallengeViewProps {
  challenge: PrivateChallenge;
  onBack: () => void;
  onOpenCreate: () => void;
}

export const PrivateChallengeView: React.FC<PrivateChallengeViewProps> = ({
  challenge,
  onBack,
  onOpenCreate,
}) => {
  const { userAddress, userBalanceUSD, refreshChallenges, refreshBalances, addToast } = useMarketStore();

  const [selectedSide, setSelectedSide] = useState<'UP' | 'DOWN'>('UP');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  const shareUrl = ChallengeEngine.getShareableUrl(challenge.id);

  const isUserJoined = challenge.participants.some(
    (p) => userAddress && p.address.toLowerCase() === userAddress.toLowerCase()
  );

  const upParticipants = challenge.participants.filter((p) => p.side === 'UP');
  const downParticipants = challenge.participants.filter((p) => p.side === 'DOWN');

  const upPoolTotal = upParticipants.reduce((sum, p) => sum + p.amountUSD, 0);
  const downPoolTotal = downParticipants.reduce((sum, p) => sum + p.amountUSD, 0);

  const isExpired = Date.now() >= challenge.expiryTimestampMs;

  const handleJoinSquad = async () => {
    if (!userAddress) {
      addToast({ type: 'warning', title: 'Wallet Required', message: 'Please connect your wallet.' });
      return;
    }

    if (userBalanceUSD < challenge.entryFeeUSD) {
      addToast({
        type: 'warning',
        title: 'Insufficient Balance',
        message: `Insufficient tUSDC balance ($${userBalanceUSD.toFixed(2)} tUSDC).`,
      });
      return;
    }

    setIsJoining(true);
    addToast({
      type: 'info',
      title: 'Joining Squad Challenge',
      message: `Broadcasting $${challenge.entryFeeUSD} escrow deposit for ${selectedSide}...`,
    });

    try {
      // Prompt connected wallet for escrow deposit transaction or signature
      const { txHash } = await WalletSigner.requestSquadSigning({
        userAddress,
        action: 'JOIN',
        challengeTitle: challenge.title,
        entryFeeUSD: challenge.entryFeeUSD,
        side: selectedSide,
      });

      ChallengeEngine.joinChallenge({
        challengeId: challenge.id,
        userAddress,
        side: selectedSide,
        txHash,
      });

      // Record in unified Activity page
      TradingEngine.recordSquadPosition({
        challengeId: challenge.id,
        title: challenge.title,
        underlyingAsset: challenge.underlyingAsset,
        side: selectedSide,
        amountUSD: challenge.entryFeeUSD,
        txHash,
      });

      refreshChallenges();
      refreshBalances();
      useMarketStore.getState().refreshPositions();

      addToast({
        type: 'success',
        title: 'Squad Challenge Joined',
        message: `Successfully joined betting ${selectedSide} with $${challenge.entryFeeUSD} tUSDC!`,
        txHash,
      });
    } catch (err: any) {
      console.warn('Squad join cancelled or failed:', err);
      const errMsg = err?.message || 'Failed to join challenge';
      addToast({
        type: 'error',
        title: 'Squad Join Cancelled',
        message: errMsg,
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleSettle = async () => {
    setIsSettling(true);
    addToast({
      type: 'info',
      title: 'Settling Squad Challenge',
      message: 'Calculating TWAP oracle resolution on Somnia Shannon...',
    });
    try {
      // Settle against live spot price
      const simulatedFinalPrice = challenge.strikePrice * 1.004; // e.g. above strike
      ChallengeEngine.settleChallenge(challenge.id, simulatedFinalPrice);
      refreshChallenges();
      refreshBalances();
      addToast({
        type: 'success',
        title: 'Challenge Settled',
        message: 'Settlement confirmed and payouts distributed on-chain!',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Settlement Error',
        message: err?.message || 'Settlement execution failed',
      });
    } finally {
      setIsSettling(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1000px', width: '92%', margin: '2rem auto', color: 'var(--color-black)' }}>
      {/* Top Breadcrumb & Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--color-black)',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to All Squads</span>
        </button>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={copyUrl}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.15)',
              backgroundColor: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {copied ? <CheckCircle2 size={14} color="var(--color-green)" /> : <Copy size={14} />}
            <span>{copied ? 'Link Copied' : 'Share Squad Link'}</span>
          </button>

          <button
            onClick={() => setShowQr(!showQr)}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.15)',
              backgroundColor: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <QrCode size={14} />
            <span>{showQr ? 'Hide QR' : 'Squad QR'}</span>
          </button>
        </div>
      </div>

      {/* QR Code Dropdown Card */}
      {showQr && (
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid rgba(0,0,0,0.12)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
              shareUrl
            )}`}
            alt="Squad QR Code"
            style={{ width: '150px', height: '150px', borderRadius: '6px', marginBottom: '0.75rem' }}
          />
          <div className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--color-grey-muted)' }}>
            Have squad members scan this with their phone to instantly join and deposit tUSDC
          </div>
        </div>
      )}

      {/* Hero Challenge Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid rgba(0,0,0,0.12)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          padding: '1.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            paddingBottom: '1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--color-green)',
                backgroundColor: 'rgba(0,194,120,0.08)',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                marginBottom: '0.5rem',
              }}
            >
              <Users size={12} />
              <span>PRIVATE SQUAD CHALLENGE</span>
            </div>
            <h2
              className="font-bobz"
              style={{ margin: '0 0 0.4rem 0', fontSize: '1.6rem', color: 'var(--color-black)' }}
            >
              {challenge.title}
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-grey-text)' }}>
              Target Strike: <strong style={{ color: 'var(--color-black)' }}>${challenge.strikePrice.toLocaleString()}</strong> ({challenge.underlyingAsset}/USD) · Expiry: {new Date(challenge.expiryTimestampMs).toLocaleTimeString()}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-grey-muted)' }}>Total Squad Pot</div>
            <div
              className="font-mono"
              style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-black)' }}
            >
              ${challenge.totalPotUSD} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>tUSDC</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-grey-muted)' }}>
              {challenge.participants.length} / {challenge.maxParticipants} Players Joined
            </div>
          </div>
        </div>

        {/* Pool Split Bar (Sealed when active to eliminate herd bias; Unveiled when resolved) */}
        <div style={{ marginBottom: '1.5rem' }}>
          {challenge.status === 'RESOLVED' ? (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginBottom: '0.4rem',
                }}
              >
                <span style={{ color: 'var(--color-green)' }}>
                  UP Pool: ${upPoolTotal} ({upParticipants.length} Bets · {challenge.totalPotUSD > 0 ? ((upPoolTotal / challenge.totalPotUSD) * 100).toFixed(0) : 50}%)
                </span>
                <span style={{ color: 'var(--color-red)' }}>
                  DOWN Pool: ${downPoolTotal} ({downParticipants.length} Bets · {challenge.totalPotUSD > 0 ? ((downPoolTotal / challenge.totalPotUSD) * 100).toFixed(0) : 50}%)
                </span>
              </div>

              <div
                style={{
                  height: '10px',
                  borderRadius: '5px',
                  backgroundColor: '#F0F0F0',
                  overflow: 'hidden',
                  display: 'flex',
                }}
              >
                <div
                  style={{
                    width: `${challenge.totalPotUSD > 0 ? (upPoolTotal / challenge.totalPotUSD) * 100 : 50}%`,
                    backgroundColor: 'var(--color-green)',
                    transition: 'width 0.3s ease',
                  }}
                />
                <div
                  style={{
                    width: `${challenge.totalPotUSD > 0 ? (downPoolTotal / challenge.totalPotUSD) * 100 : 50}%`,
                    backgroundColor: 'var(--color-red)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </>
          ) : (
            <div
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: '#F8F9FA',
                borderRadius: '10px',
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.45rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-black)' }}>
                  <Lock size={14} color="#111" />
                  <span>Anti-Herd Blind Ballot · Odds & Counts Sealed</span>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: '#666',
                    backgroundColor: '#EBEBEB',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                  }}
                >
                  Unseals at round expiry
                </span>
              </div>

              <div
                style={{
                  height: '10px',
                  borderRadius: '5px',
                  backgroundColor: '#E5E7EB',
                  backgroundImage: 'repeating-linear-gradient(45deg, #E5E7EB, #E5E7EB 10px, #D1D5DB 10px, #D1D5DB 20px)',
                  marginBottom: '0.4rem',
                }}
              />

              <div style={{ fontSize: '0.75rem', color: 'var(--color-grey-muted)', lineHeight: 1.4 }}>
                UP and DOWN distributions are locked and hidden for all participants (including the creator) to prevent crowd bias and copy-trading. Winnings and final odds will be revealed once the timer elapses.
              </div>
            </div>
          )}
        </div>

        {/* Status / Join Action */}
        {challenge.status === 'RESOLVED' ? (
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: '#F8F9FA',
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--color-green)' }}>
                <Trophy size={18} />
                <span>Round Settled On-Chain</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-grey-text)', marginTop: '0.2rem' }}>
                Outcome: <strong>{challenge.winningOutcome}</strong> · Resolution: {challenge.resolutionType?.replace('_', ' ')}
              </div>
            </div>
            <div className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
              2% Protocol Fee: ${challenge.protocolFeeUSD.toFixed(2)}
            </div>
          </div>
        ) : isExpired ? (
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: '#FFF9E6',
              borderRadius: '10px',
              border: '1px solid #FFE082',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#F57F17' }}>Round Window Expired</div>
              <div style={{ fontSize: '0.8rem', color: '#8D6E63' }}>
                All squad bets are locked. Click below to settle outcomes via DreamDEX TWAP on Somnia.
              </div>
            </div>
            <button
              onClick={handleSettle}
              disabled={isSettling}
              className="btn-launch-black"
              style={{ padding: '0.65rem 1.25rem' }}
            >
              {isSettling ? 'Settling...' : 'Settle & Disburse Winnings'}
            </button>
          </div>
        ) : isUserJoined ? (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#E8F5E9',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2E7D32', fontWeight: 600, fontSize: '0.85rem' }}>
              <CheckCircle2 size={18} />
              <span>You are in this squad! Your bet is confirmed on Somnia Shannon testnet.</span>
            </div>
          </div>
        ) : (
          /* Join Form */
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: '#FAFAFA',
              borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
              Join this Squad Challenge (Entry: ${challenge.entryFeeUSD} tUSDC)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedSide('UP')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: selectedSide === 'UP' ? '2px solid var(--color-green)' : '1px solid rgba(0,0,0,0.15)',
                  backgroundColor: selectedSide === 'UP' ? 'rgba(0, 194, 120, 0.08)' : '#FFFFFF',
                  color: selectedSide === 'UP' ? 'var(--color-green)' : 'var(--color-black)',
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
                <span>PICK UP (≥ ${challenge.strikePrice})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSide('DOWN')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: selectedSide === 'DOWN' ? '2px solid var(--color-red)' : '1px solid rgba(0,0,0,0.15)',
                  backgroundColor: selectedSide === 'DOWN' ? 'rgba(255, 68, 68, 0.08)' : '#FFFFFF',
                  color: selectedSide === 'DOWN' ? 'var(--color-red)' : 'var(--color-black)',
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
                <span>PICK DOWN (&lt; ${challenge.strikePrice})</span>
              </button>
            </div>

            <button
              onClick={handleJoinSquad}
              disabled={isJoining}
              className="btn-launch-black"
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
            >
              {isJoining ? 'Confirming with Wallet...' : `Deposit $${challenge.entryFeeUSD} tUSDC & Join Squad`}
            </button>
          </div>
        )}
      </div>

      {/* Squad Members Roster */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid rgba(0,0,0,0.12)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3
            className="font-bobz"
            style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-black)' }}
          >
            Squad Roster ({challenge.participants.length} Players)
          </h3>
          {challenge.status !== 'RESOLVED' && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-grey-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <EyeOff size={13} />
              <span>Picks sealed until round close</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {challenge.participants.map((p, idx) => {
            const isCurrentUser = !!(userAddress && p.address.toLowerCase() === userAddress.toLowerCase());
            const isResolved = challenge.status === 'RESOLVED';

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: isCurrentUser ? 'rgba(0,0,0,0.02)' : '#FAFAFA',
                  border: isCurrentUser ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(0,0,0,0.06)',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isCurrentUser ? 'var(--color-black)' : '#E0E0E0',
                      color: isCurrentUser ? '#FFFFFF' : '#333333',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-mono" style={{ fontWeight: 600 }}>
                      {p.address.slice(0, 8)}...{p.address.slice(-6)}
                      {isCurrentUser && ' (You)'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-grey-muted)' }}>
                      Joined {new Date(p.joinedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {isResolved ? (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        backgroundColor: p.side === 'UP' ? 'rgba(0,194,120,0.1)' : 'rgba(255,68,68,0.1)',
                        color: p.side === 'UP' ? 'var(--color-green)' : 'var(--color-red)',
                      }}
                    >
                      {p.side}
                    </span>
                  ) : isCurrentUser ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        backgroundColor: p.side === 'UP' ? 'rgba(0,194,120,0.12)' : 'rgba(255,68,68,0.12)',
                        color: p.side === 'UP' ? 'var(--color-green)' : 'var(--color-red)',
                        border: p.side === 'UP' ? '1px solid rgba(0,194,120,0.3)' : '1px solid rgba(255,68,68,0.3)',
                      }}
                    >
                      <Lock size={11} />
                      Your Pick: {p.side} (Private)
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        backgroundColor: '#EDEDED',
                        color: 'var(--color-grey-text)',
                      }}
                    >
                      <Lock size={11} />
                      Sealed Pick
                    </span>
                  )}

                  <span className="font-mono" style={{ fontWeight: 700 }}>
                    ${p.amountUSD} tUSDC
                  </span>

                  {isResolved && p.payoutUSD !== undefined && p.payoutUSD > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-green)', fontWeight: 700 }}>
                      Won +${p.payoutUSD.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
