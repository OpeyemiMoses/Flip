import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Minus,
  ShieldCheck,
  Zap,
  Check,
  Lock,
  ArrowRight,
  Mail,
  Wallet,
  Sparkles,
  Link2,
  ExternalLink,
  Copy,
  LogOut,
  Key,
} from 'lucide-react';
import { usePrivy, useWallets, useLinkAccount } from '@privy-io/react-auth';
import { useAccount, useSwitchChain } from 'wagmi';
import { useMarketStore } from '../store/marketStore';
import { WalletSigner } from '../services/walletSigner';
import { SOMNIA_CONFIG } from '../contracts/chain';
import { formatUSD } from '../services/dreamdex';

interface ConnectWalletModalProps {
  isOpen?: boolean;
  isDedicatedView?: boolean;
  onClose: () => void;
  onSuccessConnect?: () => void;
  onExploreGuest?: () => void;
}

export const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({
  isOpen = true,
  isDedicatedView = false,
  onClose,
  onSuccessConnect,
  onExploreGuest,
}) => {
  const { ready, authenticated, user, login, logout, exportWallet, createWallet } = usePrivy();
  const { wallets } = useWallets();
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  const {
    userAddress,
    setUserAddress,
    authSignature,
    setAuthSignature,
    currentChainId,
    isCorrectNetwork,
    userBalanceUSD,
    userGasSTT,
    refreshBalances,
    addToast,
  } = useMarketStore();

  const { linkWallet, linkEmail } = useLinkAccount({
    onSuccess: ({ user: updatedUser, linkMethod }: any) => {
      addToast({
        type: 'success',
        title: 'Account Bound',
        message: `Successfully linked ${linkMethod} to your account profile.`,
      });
      refreshBalances();
    },
    onError: (err: any) => {
      console.warn('[Privy] Link error:', err);
    },
  });

  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);
  const [isSigningProof, setIsSigningProof] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  // Determine effective active address
  const effectiveAddress = user?.wallet?.address || wallets?.[0]?.address || address || userAddress;
  const isWalletConnected = !!effectiveAddress || authenticated;
  const onSomnia = (chain?.id === SOMNIA_CONFIG.chainId) || isCorrectNetwork || authenticated;
  const hasProof = !!authSignature || authenticated;

  // Auto-cycle the left informative carousel
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 5500);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Lock body scroll while modal is open (if not dedicated full page)
  useEffect(() => {
    if (isOpen && !isDedicatedView) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isDedicatedView]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const slides = [
    {
      stepTag: '01 · LIVE 5-MINUTE ROUNDS',
      title: 'Predict price velocity on live crypto markets.',
      desc: 'Take high-frequency UP or DOWN positions on real-time price feeds. All positions are minted into transparent, on-chain parimutuel pools settling at the close of every candle.',
      visualType: 'odds',
    },
    {
      stepTag: '02 · 100% COLLATERALIZED',
      title: 'Every winning position pays out at exactly $1.00.',
      desc: 'DreamDEX Event Contracts guarantee true mathematical parity: 1 UP + 1 DOWN is always backed by $1.00 in USDC collateral. Zero slippage, instant settlement, and verifiable on-chain pools.',
      visualType: 'parity',
    },
    {
      stepTag: '03 · SUB-SECOND EXECUTION',
      title: 'Built for speed on Somnia MultiStream consensus.',
      desc: 'Execute micro-bets and cash out instantly with 400,000+ TPS throughput and sub-cent STT gas fees (< $0.0001 per flip), giving you frictionless trading without network congestion.',
      visualType: 'speed',
    },
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handlePrivyLogin = () => {
    setErrorMessage(null);
    login();
  };

  const handleSwitchNetwork = async () => {
    setErrorMessage(null);
    if (switchChain) {
      switchChain({ chainId: SOMNIA_CONFIG.chainId });
    } else if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await WalletSigner.ensureSomniaNetwork((window as any).ethereum);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to switch network.');
      }
    }
  };

  const handleSignCryptographicProof = async () => {
    if (!effectiveAddress) {
      handlePrivyLogin();
      return;
    }

    setErrorMessage(null);
    setIsSigningProof(true);

    try {
      const signature = await WalletSigner.requestAuthProof(effectiveAddress);
      setAuthSignature(signature);
      setIsSigningProof(false);

      addToast({
        type: 'success',
        title: 'Wallet Authenticated',
        message: 'Cryptographic proof verified. Session is active on Somnia Shannon (50312).',
      });

      setTimeout(() => {
        onClose();
        if (onSuccessConnect) {
          onSuccessConnect();
        }
      }, 500);
    } catch (err: any) {
      setIsSigningProof(false);
      console.warn('Proof signature error:', err);
      const errMsg = err.message || 'Cryptographic proof signature cancelled.';
      setErrorMessage(errMsg);
      addToast({
        type: 'error',
        title: 'Authentication Cancelled',
        message: errMsg,
      });
    }
  };

  const handleGuestClick = () => {
    onClose();
    if (onExploreGuest) {
      onExploreGuest();
    }
  };

  // Find linked wallets count
  const linkedWallets = user?.linkedAccounts?.filter((a) => a.type === 'wallet') || [];

  const content = (
    <div
      className="connect-wallet-split-container"
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* LEFT COLUMN (50%): DARK STORYBOARD PANEL */}
      <div
          style={{
            backgroundColor: '#111111',
            color: '#FFFFFF',
            padding: '3.5rem 4.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            minHeight: '100vh',
          }}
        >
          {/* Top Row: Full Color Authentic Brand Logo & Shannon Live Badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img
                src="/assets/flip_full_logo.png"
                alt="FLIP"
                style={{ height: '58px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
            <div
              className="font-terminal"
              style={{
                fontSize: '0.74rem',
                color: '#9CA3AF',
                letterSpacing: '0.12em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 600,
              }}
            >
              <span style={{ color: 'var(--color-green)', fontSize: '0.8rem' }}>●</span>
              <span>LIVE ON SHANNON (50312)</span>
            </div>
          </div>

          {/* Center Visual Mockup & Slide Content */}
          <div style={{ margin: 'auto 0', maxWidth: '540px', width: '100%' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              {slides[activeSlide].visualType === 'odds' && (
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span className="font-terminal" style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>MARKET ROUND</span>
                      <span className="font-bobz" style={{ fontSize: '0.90rem', fontWeight: 800, color: '#FFFFFF' }}>BTC/USD · 5M FLIP</span>
                    </div>
                    <span className="font-terminal" style={{ fontSize: '0.72rem', color: 'var(--color-green)', fontWeight: 700 }}>$142,850 POOL</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: 'rgba(0, 168, 89, 0.12)', border: '1px solid rgba(0, 168, 89, 0.3)', borderRadius: '8px', padding: '1rem' }}>
                      <div className="font-terminal" style={{ fontSize: '0.72rem', color: '#6EE7B7', fontWeight: 700 }}>UP (CALL)</div>
                      <div className="font-bobz" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFFFFF', margin: '0.2rem 0' }}>1.78x</div>
                      <div className="font-terminal" style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>56.2% PROBABILITY</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(229, 9, 20, 0.12)', border: '1px solid rgba(229, 9, 20, 0.3)', borderRadius: '8px', padding: '1rem' }}>
                      <div className="font-terminal" style={{ fontSize: '0.72rem', color: '#FCA5A5', fontWeight: 700 }}>DOWN (PUT)</div>
                      <div className="font-bobz" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFFFFF', margin: '0.2rem 0' }}>2.28x</div>
                      <div className="font-terminal" style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>43.8% PROBABILITY</div>
                    </div>
                  </div>
                </div>
              )}

              {slides[activeSlide].visualType === 'parity' && (
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-terminal" style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>CONTRACT PARITY EQUATION</span>
                    <span className="font-terminal" style={{ fontSize: '0.72rem', color: 'var(--color-blue)', fontWeight: 700 }}>ERC-6909 STANDARD</span>
                  </div>
                  <div style={{ padding: '1.25rem', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <div className="font-mono" style={{ fontSize: '1.15rem', color: '#60A5FA', letterSpacing: '0.05em' }}>
                      1 UP Token + 1 DOWN Token = $1.00 USDC
                    </div>
                  </div>
                </div>
              )}

              {slides[activeSlide].visualType === 'speed' && (
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-terminal" style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>SOMNIA PERFORMANCE</span>
                    <span className="font-terminal" style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700 }}>MULTISTREAM CONSENSUS</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', textAlign: 'center' }}>
                      <div className="font-bobz" style={{ fontSize: '1.1rem', color: '#FFFFFF', fontWeight: 800 }}>400K+</div>
                      <div className="font-terminal" style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>MAX TPS</div>
                    </div>
                    <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', textAlign: 'center' }}>
                      <div className="font-bobz" style={{ fontSize: '1.1rem', color: '#6EE7B7', fontWeight: 800 }}>&lt;100ms</div>
                      <div className="font-terminal" style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>FINALITY</div>
                    </div>
                    <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px', textAlign: 'center' }}>
                      <div className="font-bobz" style={{ fontSize: '1.1rem', color: '#60A5FA', fontWeight: 800 }}>&lt;$0.0001</div>
                      <div className="font-terminal" style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>GAS / FLIP</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className="font-terminal"
              style={{
                fontSize: '0.74rem',
                color: '#9CA3AF',
                letterSpacing: '0.12em',
                marginBottom: '0.65rem',
                fontWeight: 700,
              }}
            >
              {slides[activeSlide].stepTag}
            </div>

            <h2
              className="font-bobz"
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.2,
                marginBottom: '1rem',
                letterSpacing: '-0.02em',
              }}
            >
              {slides[activeSlide].title}
            </h2>

            <p
              className="font-subtext"
              style={{
                fontSize: '0.94rem',
                color: '#D1D5DB',
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {slides[activeSlide].desc}
            </p>
          </div>

          {/* Bottom Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {slides.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setActiveSlide(idx)}
                style={{
                  height: '4px',
                  width: activeSlide === idx ? '28px' : '10px',
                  backgroundColor: activeSlide === idx ? '#FFFFFF' : 'rgba(255, 255, 255, 0.25)',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN (50%): PRIVY ONBOARDING & WALLET BINDING */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '3.5rem 4.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            minHeight: '100vh',
            overflowY: 'auto',
          }}
        >
          {/* Top Bar: Back / Close Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              onClick={onClose}
              style={{
                background: '#F4F4F5',
                border: '1px solid #E4E4E7',
                cursor: 'pointer',
                color: '#18181B',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.80rem',
                fontFamily: 'var(--font-bobz)',
                fontWeight: 700,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#18181B';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F4F4F5';
                e.currentTarget.style.color = '#18181B';
              }}
            >
              <span>Back to FLIP</span>
              <X size={15} />
            </button>
          </div>

          <div style={{ maxWidth: '520px', width: '100%', margin: 'auto 0' }}>
            {/* Top Label */}
            <div
              className="font-terminal"
              style={{
                fontSize: '0.76rem',
                color: '#888888',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
                fontWeight: 700,
              }}
            >
              AUTHENTICATION &amp; WALLET ACCESS
            </div>

            {/* Main Header */}
            <h1
              className="font-bobz"
              style={{
                fontSize: '2.5rem',
                fontWeight: 400,
                color: '#1A1816',
                margin: '0 0 0.85rem 0',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              {authenticated ? 'Welcome back to FLIP' : 'Enter the Arena'}
            </h1>

            {/* Subtext */}
            <p
              className="font-subtext"
              style={{
                fontSize: '0.92rem',
                lineHeight: 1.6,
                color: '#55534E',
                marginBottom: '2rem',
              }}
            >
              {authenticated
                ? 'Your Privy session is active. You can bind external Web3 wallets (MetaMask, Coinbase, Rainbow) directly to your profile, or trade immediately with your embedded Somnia wallet.'
                : 'Sign in effortlessly via Email OTP or connect your favorite Web3 wallet via Privy. No seed phrases required to start predicting live crypto candles.'}
            </p>

            {/* Authenticated Profile Card if user is already logged in */}
            {authenticated && (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  marginBottom: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-green)' }} />
                    <span className="font-bobz" style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                      {user?.email?.address || 'Privy Authenticated'}
                    </span>
                  </div>
                  <span
                    className="font-terminal"
                    style={{
                      fontSize: '0.70rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(0, 168, 89, 0.1)',
                      color: 'var(--color-green)',
                      fontWeight: 700,
                    }}
                  >
                    SOMNIA READY
                  </span>
                </div>

                {/* Primary Wallet Box */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ minWidth: 0, marginRight: '0.5rem' }}>
                    <div className="font-terminal" style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>
                      ACTIVE SOMNIA TRADING WALLET
                    </div>
                    <div className="font-mono" style={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 600, wordBreak: 'break-all' }}>
                      {effectiveAddress ? `${effectiveAddress.slice(0, 10)}...${effectiveAddress.slice(-8)}` : 'Creating wallet...'}
                    </div>
                  </div>
                  {effectiveAddress && (
                    <button
                      onClick={() => handleCopy(effectiveAddress)}
                      style={{
                        padding: '0.4rem',
                        borderRadius: '6px',
                        backgroundColor: '#F1F5F9',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#475569',
                      }}
                      title="Copy Address"
                    >
                      {copiedAddress ? <Check size={14} color="var(--color-green)" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>

                {/* Bound Wallets Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.80rem', color: '#64748B' }}>
                    Bound Wallets: <strong style={{ color: '#0F172A' }}>{linkedWallets.length}</strong>
                  </div>
                  <button
                    onClick={() => linkWallet()}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284C7',
                      fontSize: '0.80rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <Plus size={13} />
                    <span>+ Bind Another Wallet</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3 Step Sequence Rows if not yet authenticated or not signed */}
            {!authenticated && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                {/* Step 1: Email or Web3 Connect */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: isWalletConnected ? 'var(--color-green)' : '#1A1816',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: '0.1rem',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {isWalletConnected ? <Check size={14} strokeWidth={3} /> : '1'}
                  </div>
                  <div>
                    <div className="font-bobz" style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1A1816', marginBottom: '0.2rem' }}>
                      {isWalletConnected ? 'Authenticated with Privy' : 'Email Login & Wallet Binding'}
                    </div>
                    <div className="font-subtext" style={{ fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.55 }}>
                      Log in with your Email (instant OTP) or connect MetaMask, Coinbase, Rainbow, or Rabby with automatic wallet binding.
                    </div>
                  </div>
                </div>

                {/* Step 2: Somnia Shannon Network */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: onSomnia ? 'var(--color-green)' : 'transparent',
                      border: onSomnia ? 'none' : '1.5px solid #D1D5DB',
                      color: onSomnia ? '#FFFFFF' : '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: '0.1rem',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {onSomnia ? <Check size={14} strokeWidth={3} /> : '2'}
                  </div>
                  <div>
                    <div className="font-bobz" style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1A1816', marginBottom: '0.2rem' }}>
                      Somnia Shannon Testnet (50312)
                    </div>
                    <div className="font-subtext" style={{ fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.55 }}>
                      FLIP executes at 400,000+ TPS on Somnia testnet with sub-cent gas fees and instant settlement.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message if any */}
            {errorMessage && (
              <div
                style={{
                  backgroundColor: 'rgba(229, 9, 20, 0.08)',
                  border: '1px solid rgba(229, 9, 20, 0.2)',
                  color: 'var(--color-red)',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  marginBottom: '1.25rem',
                  fontFamily: 'var(--font-subtext)',
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
              {!authenticated && (
                <>
                  <button
                    onClick={handlePrivyLogin}
                    style={{
                      backgroundColor: '#1A1816',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '26px',
                      padding: '0.90rem 1.75rem',
                      fontSize: '0.94rem',
                      fontFamily: 'var(--font-bobz)',
                      fontWeight: 800,
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      transition: 'transform 0.2s ease, background-color 0.2s ease',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#000000')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1A1816')}
                  >
                    <Mail size={17} />
                    <span>Log in with Email or Wallet (Privy)</span>
                  </button>
                </>
              )}

              {authenticated && (
                <>
                  <button
                    onClick={() => {
                      onClose();
                      if (onSuccessConnect) onSuccessConnect();
                    }}
                    style={{
                      backgroundColor: 'var(--color-green)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '26px',
                      padding: '0.90rem 1.75rem',
                      fontSize: '0.94rem',
                      fontFamily: 'var(--font-bobz)',
                      fontWeight: 800,
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 14px rgba(0, 168, 89, 0.25)',
                    }}
                  >
                    <span>Enter Trading Arena</span>
                    <ArrowRight size={16} />
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    <button
                      onClick={() => linkWallet()}
                      style={{
                        backgroundColor: '#F4F4F5',
                        color: '#18181B',
                        border: '1px solid #E4E4E7',
                        borderRadius: '20px',
                        padding: '0.65rem 1rem',
                        fontSize: '0.82rem',
                        fontFamily: 'var(--font-bobz)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E4E4E7')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F4F4F5')}
                    >
                      <Link2 size={14} />
                      <span>Bind Wallet</span>
                    </button>

                    <button
                      onClick={() => logout()}
                      style={{
                        backgroundColor: '#FFF1F2',
                        color: '#E11D48',
                        border: '1px solid #FFE4E6',
                        borderRadius: '20px',
                        padding: '0.65rem 1rem',
                        fontSize: '0.82rem',
                        fontFamily: 'var(--font-bobz)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <LogOut size={14} />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </>
              )}

              <button
                onClick={handleGuestClick}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#1A1816',
                  border: '1px solid #D1D5DB',
                  borderRadius: '26px',
                  padding: '0.85rem 1.75rem',
                  fontSize: '0.94rem',
                  fontFamily: 'var(--font-bobz)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#111111')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#D1D5DB')}
              >
                Look around without connecting
              </button>
            </div>

            {/* Expandable Accordion */}
            <div
              style={{
                borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                paddingTop: '1.15rem',
                marginBottom: '1rem',
              }}
            >
              <div
                onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#1A1816',
                }}
              >
                <span>How does Privy Email Login + Wallet Binding work?</span>
                {isAccordionOpen ? <Minus size={16} /> : <Plus size={16} />}
              </div>

              {isAccordionOpen && (
                <p
                  className="font-subtext"
                  style={{
                    fontSize: '0.84rem',
                    color: '#6B7280',
                    lineHeight: 1.6,
                    marginTop: '0.75rem',
                    marginBottom: 0,
                  }}
                >
                  When you log in with your email, Privy generates an encrypted embedded wallet directly on Somnia Shannon with zero friction. You can also bind external Web3 wallets (like MetaMask or Rainbow) to the same identity profile at any time, letting you trade seamlessly across all your keys.
                </p>
              )}
            </div>
          </div>

          {/* Footer Subtext Disclaimer */}
          <div
            style={{
              fontSize: '0.78rem',
              color: '#9CA3AF',
              lineHeight: 1.55,
              borderTop: '1px dotted rgba(0,0,0,0.1)',
              paddingTop: '1rem',
              maxWidth: '520px',
            }}
          >
            Somnia Shannon deployment with test assets. Self-custodial smart contracts on Chain ID 50312.
            <a
              href="https://docs.dreamdex.io/developers/event-contracts"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#1A1816', textDecoration: 'underline', marginLeft: '0.35rem', fontWeight: 600 }}
            >
              Read the docs.
            </a>
          </div>
        </div>
      </div>
  );

  if (isDedicatedView) {
    return content;
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: '#FFFFFF',
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
      }}
    >
      {content}
    </div>,
    document.body
  );
};
