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
import { useAccount, useSwitchChain, useDisconnect } from 'wagmi';
import { useMarketStore } from '../store/marketStore';
import { WalletSigner } from '../services/walletSigner';
import { SOMNIA_CONFIG } from '../contracts/chain';
import { formatUSD } from '../services/dreamdex';
import { WalletRegistry } from '../services/walletRegistry';
import { ProviderDetector, SupportedWalletId, WALLET_METADATA_LIST } from '../services/providerDetector';

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
  const { ready, authenticated, user, login, logout, exportWallet, createWallet, unlinkWallet, connectWallet } = usePrivy();
  const { wallets } = useWallets();
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();

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

  const handleCompleteSignOut = async () => {
    try {
      disconnect();
    } catch (e) {
      console.warn('Wagmi disconnect err:', e);
    }
    try {
      await logout();
    } catch (e) {
      console.warn('Privy logout err:', e);
    }
    setUserAddress(null);
  };

  // Only external Web3 wallets count as bound wallets (never auto Privy embedded wallets)
  const boundExternalAccount = user?.linkedAccounts?.find(
    (a: any) => a.type === 'wallet' && a.walletClientType !== 'privy'
  ) as any;
  const effectiveAddress = boundExternalAccount?.address || null;
  const hasBoundWallet = !!effectiveAddress;
  const isWalletConnected = hasBoundWallet;
  const onSomnia = (chain?.id === SOMNIA_CONFIG.chainId) || isCorrectNetwork || hasBoundWallet;
  const hasProof = !!authSignature || hasBoundWallet;

  const { linkWallet, linkEmail } = useLinkAccount({
    onSuccess: ({ user: updatedUser, linkMethod }: any) => {
      const newlyBound = updatedUser?.linkedAccounts?.find(
        (a: any) => a.type === 'wallet' && a.walletClientType !== 'privy'
      );
      if (newlyBound?.address && user?.id) {
        // Enforce wallet uniqueness: check if bound to another active user
        const conflict = WalletRegistry.checkConflict(newlyBound.address, user.id);
        if (conflict.isConflict) {
          addToast({
            type: 'error',
            title: 'Wallet Already Bound',
            message: 'This wallet is already bound to another active FLIP account. Each wallet can only be bound to one user.',
          });
          if (unlinkWallet) {
            try {
              unlinkWallet(newlyBound.address);
            } catch (e) {
              console.warn('Unlink conflict wallet err:', e);
            }
          }
          disconnect();
          setUserAddress(null);
          return;
        }

        // Register binding in registry
        WalletRegistry.bindWallet(newlyBound.address, user.id, user?.email?.address);
        setUserAddress(newlyBound.address);
      }

      addToast({
        type: 'success',
        title: 'Wallet Bound Successfully',
        message: 'Your Web3 wallet has been linked. Entering trading arena...',
      });
      refreshBalances();
      onClose();
      if (onSuccessConnect) {
        onSuccessConnect();
      }
    },
    onError: (err: any) => {
      console.warn('[Privy] Link error:', err);
      setErrorMessage(err?.message || 'Failed to bind wallet. Please try again.');
    },
  });

  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);
  const [isSigningProof, setIsSigningProof] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [showWalletSelector, setShowWalletSelector] = useState<boolean>(false);

  const [detectionMap, setDetectionMap] = useState<Record<SupportedWalletId, boolean>>(() =>
    ProviderDetector.getDetectionMap()
  );

  useEffect(() => {
    if (!isOpen) return;
    ProviderDetector.requestProviders();
    setDetectionMap(ProviderDetector.getDetectionMap());
    const unsubscribe = ProviderDetector.subscribe(() => {
      setDetectionMap(ProviderDetector.getDetectionMap());
    });
    return () => unsubscribe();
  }, [isOpen]);

  const handleDirectWalletConnect = async (walletId: SupportedWalletId | 'privy_multi') => {
    setErrorMessage(null);

    if (walletId === 'privy_multi') {
      if (authenticated && !hasBoundWallet) {
        linkWallet();
      } else {
        login({ loginMethods: ['wallet'] });
      }
      return;
    }

    const provider = ProviderDetector.resolveProvider(walletId);
    if (!provider) {
      const meta = WALLET_METADATA_LIST[walletId];
      setErrorMessage(
        `${meta?.name || 'Selected wallet'} extension is not installed in your browser. Please install the extension or choose another detected wallet.`
      );
      return;
    }

    setIsSigningProof(true);
    try {
      WalletSigner.setActiveProvider(provider);
      try {
        await WalletSigner.ensureSomniaNetwork(provider);
      } catch (netErr) {
        console.warn('[Network Switch Notice]:', netErr);
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || !accounts[0]) {
        throw new Error('No account selected in wallet.');
      }
      const chosenAddress = accounts[0].toLowerCase();

      // Check conflict
      const uid = user?.id || `user_${chosenAddress}`;
      const conflict = WalletRegistry.checkConflict(chosenAddress, uid, user?.email?.address);
      if (conflict.isConflict) {
        throw new Error('This wallet is already bound to another active FLIP account.');
      }

      // Request cryptographic signature proof
      const signature = await WalletSigner.requestAuthProof(chosenAddress, provider);
      setAuthSignature(signature);
      setUserAddress(chosenAddress);
      WalletRegistry.bindWallet(chosenAddress, uid, user?.email?.address);
      try {
        localStorage.setItem('flip_active_session_wallet', chosenAddress);
      } catch {}

      addToast({
        type: 'success',
        title: 'Wallet Connected',
        message: `Connected as ${chosenAddress.slice(0, 6)}...${chosenAddress.slice(-4)} on Somnia Shannon!`,
      });

      refreshBalances();
      setIsSigningProof(false);
      onClose();
      if (onSuccessConnect) {
        onSuccessConnect();
      }
    } catch (err: any) {
      setIsSigningProof(false);
      console.warn('Direct wallet connect error:', err);
      if (err.code === 4001 || err.message?.toLowerCase().includes('user rejected') || err.message?.toLowerCase().includes('user denied')) {
        setErrorMessage('Connection request cancelled in wallet.');
      } else {
        setErrorMessage(err?.message || 'Failed to connect wallet.');
      }
    }
  };

  // If user signed in with wallet directly on the first screen, check conflict & enter dashboard
  useEffect(() => {
    if (isOpen && authenticated && hasBoundWallet && user?.id && effectiveAddress) {
      const conflict = WalletRegistry.checkConflict(effectiveAddress, user.id, user?.email?.address);
      if (conflict.isConflict) {
        addToast({
          type: 'error',
          title: 'Wallet Bound to Another User',
          message: 'This wallet is already bound to another active FLIP account. Each wallet can only be bound to one user.',
        });
        disconnect();
        logout();
        setUserAddress(null);
        return;
      }

      WalletRegistry.bindWallet(effectiveAddress, user.id, user?.email?.address);
      if (userAddress !== effectiveAddress) {
        setUserAddress(effectiveAddress);
      }
      onClose();
      if (onSuccessConnect) {
        onSuccessConnect();
      }
    }
  }, [isOpen, authenticated, hasBoundWallet, effectiveAddress, user, userAddress, onClose, onSuccessConnect, setUserAddress, disconnect, logout, addToast]);

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
      stepTag: '01 / LIVE 5-MINUTE ROUNDS',
      title: 'Predict price velocity on live crypto markets.',
      desc: 'Take high-frequency UP or DOWN positions on real-time price feeds. All positions are minted into transparent, on-chain parimutuel pools settling at the close of every candle.',
      visualType: 'odds',
    },
    {
      stepTag: '02 / 100% COLLATERALIZED',
      title: 'Every winning position pays out at exactly $1.00.',
      desc: 'DreamDEX Event Contracts guarantee true mathematical parity: 1 UP + 1 DOWN is always backed by $1.00 in USDC collateral. Zero slippage, instant settlement, and verifiable on-chain pools.',
      visualType: 'parity',
    },
    {
      stepTag: '03 / SUB-SECOND EXECUTION',
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

  const handleWalletLogin = () => {
    setErrorMessage(null);
    if (authenticated && !hasBoundWallet) {
      linkWallet();
    } else {
      login({ loginMethods: ['wallet'] });
    }
  };

  const handleEmailOtpLogin = async () => {
    setErrorMessage(null);
    if (authenticated && user?.email?.address) {
      addToast({
        type: 'info',
        title: 'Already Signed In',
        message: `You are signed in as ${user.email.address}. Please connect your Web3 wallet.`,
      });
      return;
    }
    try {
      if (authenticated && !user?.email?.address) {
        await logout();
      }
      login({ loginMethods: ['email'] });
    } catch (err: any) {
      console.warn('[Privy] Email login trigger error:', err);
      login({ loginMethods: ['email'] });
    }
  };

  const handleSocialLogin = (provider: 'google' | 'twitter' | 'discord') => {
    setErrorMessage(null);
    try {
      login({ loginMethods: [provider] });
    } catch (err: any) {
      console.warn(`[Privy] ${provider} login trigger error:`, err);
      login({ loginMethods: [provider] });
    }
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
      handleWalletLogin();
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

  // Find linked external wallets count
  const linkedWallets = user?.linkedAccounts?.filter((a: any) => a.type === 'wallet' && a.walletClientType !== 'privy') || [];

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
                      <span className="font-bobz" style={{ fontSize: '0.90rem', fontWeight: 800, color: '#FFFFFF' }}>BTC/USD | 5M FLIP</span>
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
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: hasBoundWallet ? 'var(--color-green)' : '#F59E0B' }} />
                    <span className="font-bobz" style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                      {user?.email?.address ||
                        ((user as any)?.twitter?.username ? `@${(user as any).twitter.username}` : null) ||
                        ((user as any)?.discord?.username ? `${(user as any).discord.username}` : null) ||
                        ((user as any)?.google?.name || (user as any)?.google?.email) ||
                        (effectiveAddress ? `${effectiveAddress.slice(0, 8)}...${effectiveAddress.slice(-6)}` : 'Account Connected')}
                    </span>
                  </div>
                  <span
                    className="font-terminal"
                    style={{
                      fontSize: '0.70rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: hasBoundWallet ? 'rgba(0, 168, 89, 0.1)' : 'rgba(245, 158, 11, 0.12)',
                      color: hasBoundWallet ? 'var(--color-green)' : '#D97706',
                      fontWeight: 700,
                    }}
                  >
                    {hasBoundWallet ? 'SOMNIA READY' : 'WALLET REQUIRED'}
                  </span>
                </div>

                {/* Primary Wallet Box */}
                {hasBoundWallet && effectiveAddress ? (
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
                        {`${effectiveAddress.slice(0, 10)}...${effectiveAddress.slice(-8)}`}
                      </div>
                    </div>
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
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px dashed #CBD5E1',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(2, 132, 199, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0284C7',
                        flexShrink: 0,
                      }}
                    >
                      <Link2 size={18} />
                    </div>
                    <div>
                      <div className="font-terminal" style={{ fontSize: '0.70rem', color: '#0F172A', fontWeight: 700 }}>
                        NO WEB3 WALLET BOUND YET
                      </div>
                      <div style={{ fontSize: '0.80rem', color: '#64748B', marginTop: '0.1rem' }}>
                        Please bind your Web3 wallet to activate trading.
                      </div>
                    </div>
                  </div>
                )}

                {/* Bound Wallets Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.80rem', color: '#64748B' }}>
                    Bound Wallets: <strong style={{ color: '#0F172A' }}>{linkedWallets.length}</strong> / 1
                  </div>
                  {hasBoundWallet && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Check size={12} strokeWidth={3} /> Active
                    </span>
                  )}
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
                  {!showWalletSelector ? (
                    <button
                      onClick={() => setShowWalletSelector(true)}
                      disabled={isSigningProof}
                      style={{
                        backgroundColor: '#1A1816',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '26px',
                        padding: '0.92rem 1.75rem',
                        fontSize: '0.94rem',
                        fontFamily: 'var(--font-bobz)',
                        fontWeight: 800,
                        cursor: isSigningProof ? 'not-allowed' : 'pointer',
                        width: '100%',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.65rem',
                        transition: 'transform 0.2s ease, background-color 0.2s ease',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#000000')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1A1816')}
                    >
                      <Wallet size={17} />
                      <span>Connect Web3 Wallet (MetaMask / OKX / Rabby)</span>
                    </button>
                  ) : (
                    <div
                      style={{
                        backgroundColor: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: '16px',
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.55rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.2rem',
                          padding: '0 0.35rem',
                        }}
                      >
                        <span
                          className="font-bobz"
                          style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827' }}
                        >
                          SELECT WALLET
                        </span>
                        <button
                          onClick={() => setShowWalletSelector(false)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            color: '#6B7280',
                            fontWeight: 700,
                          }}
                        >
                          Close
                        </button>
                      </div>

                      {/* OKX Wallet */}
                      <button
                        onClick={() => handleDirectWalletConnect('okx')}
                        disabled={isSigningProof}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '10px',
                          cursor: isSigningProof ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span
                          className="font-bobz"
                          style={{ fontSize: '0.86rem', fontWeight: 700, color: '#111827' }}
                        >
                          OKX Wallet
                        </span>
                        {detectionMap.okx ? (
                          <span
                            className="font-terminal"
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 750,
                              color: 'var(--color-green)',
                              backgroundColor: 'rgba(0, 200, 83, 0.1)',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '4px',
                            }}
                          >
                            Detected
                          </span>
                        ) : (
                          <span
                            className="font-subtext"
                            style={{ fontSize: '0.70rem', color: '#9CA3AF' }}
                          >
                            Extension
                          </span>
                        )}
                      </button>

                      {/* MetaMask */}
                      <button
                        onClick={() => handleDirectWalletConnect('metamask')}
                        disabled={isSigningProof}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '10px',
                          cursor: isSigningProof ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span
                          className="font-bobz"
                          style={{ fontSize: '0.86rem', fontWeight: 700, color: '#111827' }}
                        >
                          MetaMask
                        </span>
                        {detectionMap.metamask ? (
                          <span
                            className="font-terminal"
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 750,
                              color: 'var(--color-green)',
                              backgroundColor: 'rgba(0, 200, 83, 0.1)',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '4px',
                            }}
                          >
                            Detected
                          </span>
                        ) : (
                          <span
                            className="font-subtext"
                            style={{ fontSize: '0.70rem', color: '#9CA3AF' }}
                          >
                            Extension
                          </span>
                        )}
                      </button>

                      {/* Rabby Wallet */}
                      <button
                        onClick={() => handleDirectWalletConnect('rabby')}
                        disabled={isSigningProof}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '10px',
                          cursor: isSigningProof ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span
                          className="font-bobz"
                          style={{ fontSize: '0.86rem', fontWeight: 700, color: '#111827' }}
                        >
                          Rabby Wallet
                        </span>
                        {detectionMap.rabby ? (
                          <span
                            className="font-terminal"
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 750,
                              color: 'var(--color-green)',
                              backgroundColor: 'rgba(0, 200, 83, 0.1)',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '4px',
                            }}
                          >
                            Detected
                          </span>
                        ) : (
                          <span
                            className="font-subtext"
                            style={{ fontSize: '0.70rem', color: '#9CA3AF' }}
                          >
                            Extension
                          </span>
                        )}
                      </button>

                      {/* Coinbase Wallet */}
                      <button
                        onClick={() => handleDirectWalletConnect('coinbase')}
                        disabled={isSigningProof}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '10px',
                          cursor: isSigningProof ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span
                          className="font-bobz"
                          style={{ fontSize: '0.86rem', fontWeight: 700, color: '#111827' }}
                        >
                          Coinbase Wallet
                        </span>
                        {detectionMap.coinbase ? (
                          <span
                            className="font-terminal"
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 750,
                              color: 'var(--color-green)',
                              backgroundColor: 'rgba(0, 200, 83, 0.1)',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '4px',
                            }}
                          >
                            Detected
                          </span>
                        ) : (
                          <span
                            className="font-subtext"
                            style={{ fontSize: '0.70rem', color: '#9CA3AF' }}
                          >
                            Extension
                          </span>
                        )}
                      </button>

                      {/* WalletConnect / Mobile */}
                      <button
                        onClick={() => handleDirectWalletConnect('privy_multi')}
                        disabled={isSigningProof}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.85rem',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '10px',
                          cursor: isSigningProof ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span
                          className="font-bobz"
                          style={{ fontSize: '0.86rem', fontWeight: 700, color: '#111827' }}
                        >
                          WalletConnect / Mobile QR
                        </span>
                        <ArrowRight size={14} color="#6B7280" />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleEmailOtpLogin}
                    disabled={isSigningProof}
                    style={{
                      backgroundColor: 'transparent',
                      color: '#111827',
                      border: '1px solid rgba(0,0,0,0.12)',
                      borderRadius: '26px',
                      padding: '0.78rem 1.75rem',
                      fontSize: '0.88rem',
                      fontFamily: 'var(--font-bobz)',
                      fontWeight: 700,
                      cursor: isSigningProof ? 'not-allowed' : 'pointer',
                      width: '100%',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.55rem',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                      e.currentTarget.style.borderColor = '#111827';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)';
                    }}
                  >
                    <Mail size={15} />
                    <span>Sign In with Email OTP</span>
                  </button>

                  {/* Social Login Options */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.35rem 0' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
                    <span className="font-terminal" style={{ fontSize: '0.70rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Or continue with
                    </span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                    {/* Google Button */}
                    <button
                      onClick={() => handleSocialLogin('google')}
                      disabled={isSigningProof}
                      style={{
                        backgroundColor: '#FFFFFF',
                        color: '#1F2937',
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px',
                        padding: '0.72rem 0.5rem',
                        fontSize: '0.80rem',
                        fontFamily: 'var(--font-bobz)',
                        fontWeight: 700,
                        cursor: isSigningProof ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                        e.currentTarget.style.borderColor = '#D1D5DB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Google</span>
                    </button>

                    {/* Twitter / X Button */}
                    <button
                      onClick={() => handleSocialLogin('twitter')}
                      disabled={isSigningProof}
                      style={{
                        backgroundColor: '#000000',
                        color: '#FFFFFF',
                        border: '1px solid #000000',
                        borderRadius: '12px',
                        padding: '0.72rem 0.5rem',
                        fontSize: '0.80rem',
                        fontFamily: 'var(--font-bobz)',
                        fontWeight: 700,
                        cursor: isSigningProof ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#18181B';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#000000';
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span>Twitter / X</span>
                    </button>

                    {/* Discord Button */}
                    <button
                      onClick={() => handleSocialLogin('discord')}
                      disabled={isSigningProof}
                      style={{
                        backgroundColor: '#5865F2',
                        color: '#FFFFFF',
                        border: '1px solid #5865F2',
                        borderRadius: '12px',
                        padding: '0.72rem 0.5rem',
                        fontSize: '0.80rem',
                        fontFamily: 'var(--font-bobz)',
                        fontWeight: 700,
                        cursor: isSigningProof ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4752C4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#5865F2';
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      <span>Discord</span>
                    </button>
                  </div>
                </>
              )}

              {authenticated && !hasBoundWallet && (
                <>
                  <button
                    onClick={() => linkWallet()}
                    style={{
                      backgroundColor: 'var(--color-green)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '26px',
                      padding: '0.95rem 1.75rem',
                      fontSize: '0.98rem',
                      fontFamily: 'var(--font-bobz)',
                      fontWeight: 800,
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.55rem',
                      boxShadow: '0 4px 14px rgba(0, 168, 89, 0.3)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <Link2 size={17} />
                    <span>Bind Wallet</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    onClick={handleCompleteSignOut}
                    style={{
                      backgroundColor: 'transparent',
                      color: '#94A3B8',
                      border: 'none',
                      padding: '0.5rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                  >
                    <LogOut size={13} />
                    <span>Disconnect / Use another account</span>
                  </button>
                </>
              )}

              {authenticated && hasBoundWallet && (
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

                  <button
                    onClick={handleCompleteSignOut}
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
                </>
              )}

              {!authenticated && (
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
              )}
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
