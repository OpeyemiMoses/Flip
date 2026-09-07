import React, { useState, useEffect } from 'react';
import { useMarkets } from './hooks/useMarkets';
import { useTrade } from './hooks/useTrade';
import { usePositions } from './hooks/usePositions';
import { useMarketStore } from './store/marketStore';
import { formatUSD, formatPercent } from './services/dreamdex';
import { Dashboard } from './components/Dashboard';
import { PortfolioAnalytics } from './components/PortfolioAnalytics';
import { useAccount } from 'wagmi';
import { CoverflowCarousel } from './components/CoverflowCarousel';
import { ConnectWalletModal } from './components/ConnectWalletModal';
import { PrivyAccountModal } from './components/auth/PrivyAccountModal';
import { ToastContainer } from './components/Toast';
import { SOMNIA_CONFIG } from './contracts/chain';
import { usePrivy } from '@privy-io/react-auth';
import { WalletSigner } from './services/walletSigner';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Wallet,
  Zap,
  ArrowUpRight,
  X,
  Flame,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  Copy,
  Terminal,
  ExternalLink,
  Cpu,
  BarChart3,
  Lock,
  Boxes,
  Code2,
  Users,
  PlusCircle,
  QrCode,
  Coins,
  Globe,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export default function App() {
  const {
    markets,
    selectedMarket,
    selectedMarketId,
    setSelectedMarketId,
    timeRemaining,
  } = useMarkets();

  const {
    userBalanceUSD,
    userGasSTT,
    userAddress,
    isConnected,
    privateChallenges,
    userCreatedMarkets,
    setUserAddress,
    setUserBalance,
    loadInitialData,
  } = useMarketStore();

  const { placeQuickBet, isExecuting } = useTrade();
  const { activePositions, cashOut } = usePositions();

  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard' | 'analytics'>('landing');
  const [selectedSide, setSelectedSide] = useState<'UP' | 'DOWN'>('UP');
  const [betAmount, setBetAmount] = useState<number>(25);
  const [copiedContract, setCopiedContract] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  // Deep-link: read ?challenge= from URL on startup
  const [initialChallengeId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('challenge');
    }
    return null;
  });

  const [resolvedView, setResolvedView] = useState<'landing' | 'auth' | 'dashboard' | 'analytics'>('landing');

  const { address: wagmiAddress, isConnected: wagmiIsConnected } = useAccount();
  const { user, authenticated } = usePrivy();
  const [isPrivyModalOpen, setIsPrivyModalOpen] = useState<boolean>(false);

  // Authoritative Sync of Wagmi & Privy connection with Zustand Store
  const privyAddress = user?.wallet?.address;
  useEffect(() => {
    if (authenticated && privyAddress) {
      if (userAddress !== privyAddress) {
        setUserAddress(privyAddress);
      }
    } else if (wagmiIsConnected && wagmiAddress) {
      if (userAddress !== wagmiAddress) {
        setUserAddress(wagmiAddress);
      }
    } else if (!authenticated && !wagmiIsConnected && userAddress !== null) {
      setUserAddress(null);
    }
  }, [authenticated, privyAddress, wagmiIsConnected, wagmiAddress, userAddress, setUserAddress]);

  const isUserAuthenticatedAndConnected = !!((authenticated && (privyAddress || userAddress)) || (wagmiIsConnected && (wagmiAddress || userAddress)));

  // Deep-link auto-gate: If link has ?challenge=, check if user is signed in with active wallet
  useEffect(() => {
    if (initialChallengeId) {
      if (isUserAuthenticatedAndConnected) {
        setCurrentView('dashboard');
        setResolvedView('dashboard');
      } else {
        // Must log in with Privy first before entering private squad room
        setCurrentView('auth');
        setResolvedView('auth');
      }
    }
  }, [initialChallengeId, isUserAuthenticatedAndConnected]);

  // Launch App / Navigate Handler: prompts Privy login if not connected
  const handleLaunchApp = (targetView: 'dashboard' | 'analytics' = 'dashboard') => {
    if (isUserAuthenticatedAndConnected) {
      setCurrentView(targetView);
      setResolvedView(targetView);
    } else {
      setCurrentView('auth');
      setResolvedView('auth');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Dynamic Scroll Listener for Floating Navbar Expansion & Scroll-Reveal System
  useEffect(() => {
    if (currentView !== 'landing') return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Resilient IntersectionObserver for spring blur-pop scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            target.dataset.revealed = 'true';
            target.classList.add('is-revealed');
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '20px 0px 40px 0px',
      }
    );

    const elements = document.querySelectorAll('.reveal-pop, .scroll-reveal');
    elements.forEach((el) => {
      observer.observe(el);
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        (el as HTMLElement).dataset.revealed = 'true';
        el.classList.add('is-revealed');
      }
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [currentView]);

  const handleConnectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await WalletSigner.ensureSomniaNetwork((window as any).ethereum);
        setIsConnectModalOpen(true);
      } catch (err: any) {
        console.warn('Wallet connection switch err:', err);
        setIsConnectModalOpen(true);
      }
    } else {
      setIsConnectModalOpen(true);
    }
  };

  const handleQuickBet = async () => {
    if (!userAddress) {
      setIsConnectModalOpen(true);
      return;
    }
    if (!selectedMarket) return;
    try {
      const result = await placeQuickBet({
        market: selectedMarket,
        side: selectedSide,
        amountUSD: betAmount,
      });
      if (result) {
        setCurrentView('dashboard');
      }
    } catch (err: any) {
      alert(err.message || 'Transaction cancelled in wallet.');
    }
  };

  const currentProbability =
    selectedSide === 'UP'
      ? selectedMarket?.bestUpProbability || 0.62
      : selectedMarket?.bestDownProbability || 0.38;

  const estimatedContracts = betAmount / currentProbability;
  const potentialPayout = estimatedContracts * 1.0;
  const potentialProfit = potentialPayout - betAmount;
  const roiPercent = (potentialProfit / betAmount) * 100;

  const copyAddress = () => {
    navigator.clipboard.writeText(SOMNIA_CONFIG.collateralRouter);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  // Use resolvedView when we have an initialChallengeId deep-link, else currentView
  const effectiveView = initialChallengeId ? resolvedView : currentView;

  if (effectiveView === 'auth') {
    return (
      <div key="auth" className="page-rise-in" style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
        <ToastContainer />
        <ConnectWalletModal
          isOpen={true}
          isDedicatedView={true}
          onClose={() => {
            setCurrentView('landing');
            setResolvedView('landing');
          }}
          onSuccessConnect={() => {
            setCurrentView('dashboard');
            setResolvedView('dashboard');
          }}
          onExploreGuest={() => {
            setCurrentView('dashboard');
            setResolvedView('dashboard');
          }}
        />
      </div>
    );
  }

  if (effectiveView === 'dashboard') {
    return (
      <div key="dashboard" className="page-rise-in">
        <ToastContainer />
        <Dashboard
          onBackToLanding={() => {
            setCurrentView('landing');
            setResolvedView('landing');
          }}
          onOpenAnalytics={() => {
            setCurrentView('analytics');
            setResolvedView('analytics');
          }}
          initialChallengeId={effectiveView === 'dashboard' ? initialChallengeId : null}
        />
      </div>
    );
  }

  if (effectiveView === 'analytics') {
    return (
      <div key="analytics" className="page-rise-in">
        <ToastContainer />
        <PortfolioAnalytics
          onBackToArena={() => setCurrentView('dashboard')}
          onBackToLanding={() => setCurrentView('landing')}
        />
      </div>
    );
  }

  return (
    <div key="landing" className="page-rise-in" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: 'var(--color-black)' }}>
      <ToastContainer />
      {/* ========================================================================= */}
      {/* 1. FLOATING PILL NAVBAR (Compact on Load, Smooth Reveal on Scroll)         */}
      {/* ========================================================================= */}
      <div className={`header-wrapper ${isScrolled ? 'is-scrolled' : ''}`}>
        <header className={`header-pill ${isScrolled ? 'is-scrolled' : ''}`}>
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <img
              src="/assets/flip_full_logo.png"
              alt="FLIP"
              className="header-logo-img"
            />
          </div>

          {/* Navigation Links */}
          <nav className="header-nav">
            <a href="#about">About</a>
            <a href="#architecture">Architecture</a>
            <a href="#markets">Markets</a>
            <a href="#squads">Squads (PvP)</a>
            <a href="#dynamics-pools">Dynamics</a>
            <a href="#tokens">Tokens</a>
            <a href="#security">Security</a>
            <a href="#docs">Docs</a>
          </nav>

          {/* Action Button: Launch App */}
          <button
            onClick={() => handleLaunchApp('dashboard')}
            className="btn-launch-black"
            style={{ flexShrink: 0 }}
          >
            <span>Launch App</span>
            <ArrowUpRight size={13} />
          </button>
        </header>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECTION 0.1 — HERO SPLIT (Pure White Background)                       */}
      {/* ========================================================================= */}
      <section
        id="about"
        style={{
          maxWidth: '1240px',
          width: '94%',
          margin: '8.75rem auto 4.5rem auto',
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          gap: '2.5rem',
          alignItems: 'center',
        }}
      >
        {/* Left Column: Left-Aligned Editorial Typography with Blur-Pop Rise */}
        <div className="hero-pop" style={{ textAlign: 'left' }}>
          {/* Shannon Testnet indicator in FORTTWO */}
          <div style={{ marginBottom: '0.65rem' }}>
            <span className="font-terminal" style={{ fontSize: '0.78rem', color: '#2B2E33', fontWeight: 600 }}>
              <span style={{ color: 'var(--color-green)', marginRight: '0.45rem' }}>●</span>
              Shannon Testnet (50312).
            </span>
          </div>

          {/* Isolated Section Number in ALEGREYA SANS SC */}
          <div style={{ marginBottom: '0.35rem' }}>
            <span className="font-number" style={{ fontSize: '0.98rem', color: 'var(--color-grey-muted)', letterSpacing: '0.06em' }}>
              0.1 —
            </span>
          </div>

          {/* Title in BOBZ TYPE */}
          <h1
            className="font-bobz"
            style={{
              fontSize: '1.95rem',
              lineHeight: 1.15,
              color: 'var(--color-black)',
              marginBottom: '0.95rem',
              textAlign: 'left',
              letterSpacing: '-0.02em',
            }}
          >
            PREDICTION MARKET BUILT FOR EVERYONE
          </h1>

          {/* Body copy in Crete Round */}
          <p
            className="font-subtext"
            style={{
              fontSize: '0.90rem',
              lineHeight: 1.6,
              color: 'var(--color-grey-text)',
              maxWidth: '520px',
              marginBottom: '1.65rem',
              textAlign: 'left',
            }}
          >
            FLIP is the high-velocity prediction protocol on Somnia's 400,000+ TPS engine and DreamDEX Event Contracts. Trade live short-interval strikes, create custom crypto markets, and launch Private Squad Challenges with shareable QR codes and on-chain parimutuel settlement.
          </p>

          {/* Action Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.85rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleLaunchApp('dashboard')}
              className="btn-launch-black"
              style={{ padding: '0.65rem 1.45rem', fontSize: '0.82rem' }}
            >
              <span>Launch Terminal</span>
              <ArrowUpRight size={14} />
            </button>

            <button
              onClick={() => handleLaunchApp('dashboard')}
              className="btn-docs-grey"
              style={{ padding: '0.65rem 1.30rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
            >
              <PlusCircle size={14} />
              <span>Create Market</span>
            </button>

            <a
              href="https://docs.dreamdex.io/developers/event-contracts"
              target="_blank"
              rel="noreferrer"
              className="btn-docs-grey"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem' }}
            >
              <span>Docs</span>
              <ExternalLink size={13} />
            </a>
          </div>

          {/* Network Stat Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.25rem',
              borderTop: '1px solid rgba(0,0,0,0.07)',
              paddingTop: '1.15rem',
              maxWidth: '420px',
            }}
          >
            <div className="hero-pop reveal-delay-1">
              <div className="font-bobz" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-black)', lineHeight: 1.2 }}>
                400K+
              </div>
              <div className="font-subtext" style={{ fontSize: '0.78rem', color: 'var(--color-grey-text)', marginTop: '0.15rem' }}>
                Peak TPS Engine
              </div>
            </div>
            <div className="hero-pop reveal-delay-2">
              <div className="font-bobz" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-green)', lineHeight: 1.2 }}>
                &lt;1 SEC
              </div>
              <div className="font-subtext" style={{ fontSize: '0.78rem', color: 'var(--color-grey-text)', marginTop: '0.15rem' }}>
                Finality Window
              </div>
            </div>
            <div className="hero-pop reveal-delay-3">
              <div className="font-bobz" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-black)', lineHeight: 1.2 }}>
                100%
              </div>
              <div className="font-subtext" style={{ fontSize: '0.78rem', color: 'var(--color-grey-text)', marginTop: '0.15rem' }}>
                Non-Custodial
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive 3D Hero Tile Asset with Hover Zoom & Morph */}
        <div className="hero-pop reveal-delay-2" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="animate-float-hero" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div className="hero-3d-interactive-wrapper">
              {/* Default Green/Red 3D Composition */}
              <img
                src="/assets/flip_3d_hero.png"
                alt="FLIP 3D Composition"
                className="hero-3d-img-base hero-3d-img-primary"
              />
              {/* Alternate Red/Green 3D Composition (Morphs on Hover) */}
              <img
                src="/assets/flip_3d_hero_alt.png"
                alt="FLIP 3D Composition Alternate"
                className="hero-3d-img-base hero-3d-img-alt"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SECTION 0.2 — ARCHITECTURE (Distinctive Soft Grey Background)          */}
      {/* ========================================================================= */}
      <section
        id="architecture"
        style={{
          backgroundColor: '#F3F4F6',
          padding: '4.5rem 0',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            width: '94%',
            margin: '0 auto',
          }}
        >
          <div className="reveal-pop" style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <div style={{ marginBottom: '0.35rem' }}>
              <span className="font-number" style={{ fontSize: '0.98rem', color: 'var(--color-grey-muted)', letterSpacing: '0.06em' }}>
                0.2 —
              </span>
            </div>
            <h2 className="font-bobz" style={{ fontSize: '1.85rem', color: 'var(--color-black)', margin: '0 0 0.45rem 0', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
              DECENTRALIZED EXCHANGE ARCHITECTURE
            </h2>
            <p className="font-subtext" style={{ fontSize: '0.90rem', color: 'var(--color-grey-text)', maxWidth: '640px', margin: 0, lineHeight: 1.55 }}>
              Somnia MultiStream consensus eliminates the latency bottlenecks of legacy L1s, enabling true high-frequency binary flips.
            </p>
          </div>

          <div
            className="reveal-pop reveal-delay-1"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.15fr 1fr',
              gap: '2.5rem',
              backgroundColor: 'var(--color-white)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '20px',
              padding: '2.5rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
            }}
          >
            {/* Left: Terminal Output */}
            <div
              style={{
                backgroundColor: 'var(--color-black-night)',
                borderRadius: '16px',
                padding: '2rem',
                color: 'var(--color-white)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '310px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.85rem', marginBottom: '1.15rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <Terminal size={17} color="var(--color-green)" />
                    <span className="font-terminal" style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>
                      somnia.shannon.engine
                    </span>
                  </div>
                  <span className="font-terminal" style={{ fontSize: '0.78rem', color: 'var(--color-green)' }}>
                    ● 400K+ TPS
                  </span>
                </div>

                <div className="font-terminal" style={{ fontSize: '0.86rem', lineHeight: 1.85, color: '#D1D5DB' }}>
                  <div><span style={{ color: '#9CA3AF' }}>[01]</span> <span style={{ color: 'var(--color-green)' }}>CHAIN:</span> Somnia Shannon Testnet (50312)</div>
                  <div><span style={{ color: '#9CA3AF' }}>[02]</span> <span style={{ color: 'var(--color-green)' }}>ROUTER:</span> {SOMNIA_CONFIG.collateralRouter}</div>
                  <div><span style={{ color: '#9CA3AF' }}>[03]</span> <span style={{ color: '#38BDF8' }}>MARKET:</span> BTC-USDT 15-Min Strike</div>
                  <div><span style={{ color: '#9CA3AF' }}>[04]</span> <span style={{ color: '#FBBF24' }}>SETTLEMENT:</span> Parimutuel Dynamic Pool</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', padding: '0.85rem 1.25rem', borderRadius: '10px', marginTop: '1.5rem' }}>
                <span className="font-terminal" style={{ fontSize: '0.80rem', color: '#9CA3AF' }}>DreamDEX Event Contracts</span>
                <button
                  onClick={() => handleLaunchApp('dashboard')}
                  className="btn-launch-white"
                  style={{ padding: '0.42rem 1.10rem', fontSize: '0.78rem' }}
                >
                  TESTNET RUN
                </button>
              </div>
            </div>

            {/* Right: Architecture Points */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.15rem' }}>
              <div className="reveal-pop reveal-delay-1" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span className="font-bobz" style={{ fontSize: '1.08rem', color: 'var(--color-black)' }}>MultiStream Consensus</span>
                  <span className="badge-pill-light" style={{ fontSize: '0.72rem' }}>Sub-Second</span>
                </div>
                <p className="font-subtext" style={{ fontSize: '0.88rem', color: 'var(--color-grey-text)', margin: 0, lineHeight: 1.55 }}>
                  High-throughput parallel execution eliminates MEV front-running and slippage.
                </p>
              </div>

              <div className="reveal-pop reveal-delay-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span className="font-bobz" style={{ fontSize: '1.08rem', color: 'var(--color-black)' }}>Parimutuel AMM Pools</span>
                  <span className="badge-pill-light" style={{ fontSize: '0.72rem' }}>EVM Native</span>
                </div>
                <p className="font-subtext" style={{ fontSize: '0.88rem', color: 'var(--color-grey-text)', margin: 0, lineHeight: 1.55 }}>
                  Automated liquidity pools ensure all winning contracts settle at exactly $1.00 USDso.
                </p>
              </div>

              <div className="reveal-pop reveal-delay-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span className="font-bobz" style={{ fontSize: '1.08rem', color: 'var(--color-black)' }}>DreamDEX Bot Kit Ready</span>
                  <span className="badge-pill-light" style={{ fontSize: '0.72rem' }}>Automated</span>
                </div>
                <p className="font-subtext" style={{ fontSize: '0.88rem', color: 'var(--color-grey-text)', margin: 0, lineHeight: 1.55 }}>
                  Deploy automated trading strategies directly using the shared bot kit client library.
                </p>
              </div>

              <div className="reveal-pop reveal-delay-4">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span className="font-bobz" style={{ fontSize: '1.08rem', color: 'var(--color-black)' }}>Deterministic Oracles</span>
                  <span className="badge-pill-light" style={{ fontSize: '0.72rem' }}>Instant Claims</span>
                </div>
                <p className="font-subtext" style={{ fontSize: '0.88rem', color: 'var(--color-grey-text)', margin: 0, lineHeight: 1.55 }}>
                  Cryptographically signed oracle feeds trigger immediate prize disbursement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SECTION 0.3 — HIGH-VELOCITY MARKETS (Pure White Background)             */}
      {/* ========================================================================= */}
      <section
        id="markets"
        style={{
          maxWidth: '1240px',
          width: '94%',
          margin: '5.5rem auto',
        }}
      >
        <div className="reveal-pop" style={{ marginBottom: '2rem', textAlign: 'left' }}>
          <div style={{ marginBottom: '0.35rem' }}>
            <span className="font-number" style={{ fontSize: '0.98rem', color: 'var(--color-grey-muted)', letterSpacing: '0.06em' }}>
              0.3 —
            </span>
          </div>

          <h2
            className="font-bobz"
            style={{
              fontSize: '1.85rem',
              color: 'var(--color-black)',
              margin: '0 0 0.5rem 0',
              lineHeight: 1.15,
            }}
          >
            HIGH-VELOCITY EVENT MARKETS
          </h2>

          <p
            className="font-subtext"
            style={{
              fontSize: '0.90rem',
              color: 'var(--color-grey-text)',
              maxWidth: '680px',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Execute sub-second parimutuel event positions on high-speed L1 infrastructure. Zero latency, instant payout resolution, and 100% non-custodial custody.
          </p>
        </div>

        {/* 3 Overlapping / Elevated Cards Deck with Real Live Market Data */}
        {(() => {
          const btcM = markets.find((m) => m.underlyingAsset === 'BTC') || markets[0];
          const ethM = markets.find((m) => m.underlyingAsset === 'ETH') || markets[1];
          const solM = markets.find((m) => m.underlyingAsset === 'SOL') || markets[2];

          const btcPrice = btcM?.currentPrice || 87450.0;
          const ethPrice = ethM?.currentPrice || 2180.5;
          const solPrice = solM?.currentPrice || 138.2;

          const btcUpProb = btcM ? Math.round(btcM.bestUpProbability * 100) : 62;
          const btcDownProb = 100 - btcUpProb;

          const ethUpProb = ethM ? Math.round(ethM.bestUpProbability * 100) : 54;
          const ethDownProb = 100 - ethUpProb;

          const solUpProb = solM ? Math.round(solM.bestUpProbability * 100) : 48;
          const solDownProb = 100 - solUpProb;

          return (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.5rem',
                alignItems: 'center',
              }}
            >
              {/* Left Peeking Card (ETH) */}
              <div
                className="card-light reveal-pop reveal-delay-1"
                style={{
                  opacity: 0.95,
                  transform: 'scale(0.98)',
                  padding: '1.75rem 1.5rem',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (ethM) setSelectedMarketId(ethM.marketId);
                  handleLaunchApp('dashboard');
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <span className="font-bobz" style={{ fontSize: '1.05rem' }}>ETH / USD 15-MIN</span>
                  <span className="badge-pill-light" style={{ fontSize: '0.72rem' }}>
                    {ethM?.change24h !== undefined ? `${ethM.change24h >= 0 ? '+' : ''}${ethM.change24h.toFixed(1)}%` : 'LIVE'}
                  </span>
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 900, marginBottom: '0.45rem' }}>
                  ${ethPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1rem' }}>
                  <div style={{ flex: 1, backgroundColor: 'rgba(0,200,83,0.08)', color: 'var(--color-green)', padding: '0.55rem', borderRadius: '6px', textAlign: 'center', fontSize: '0.88rem', fontWeight: 900 }}>
                    UP {ethUpProb}%
                  </div>
                  <div style={{ flex: 1, backgroundColor: 'rgba(229,9,20,0.08)', color: 'var(--color-red)', padding: '0.55rem', borderRadius: '6px', textAlign: 'center', fontSize: '0.88rem', fontWeight: 900 }}>
                    DOWN {ethDownProb}%
                  </div>
                </div>
              </div>

              {/* Center Elevated Focus Card (BTC) */}
              <div
                className="card-dark reveal-pop reveal-delay-2"
                style={{
                  boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
                  transform: 'scale(1.02)',
                  zIndex: 10,
                  padding: '2rem 1.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Flame size={18} color="var(--color-green)" />
                    <span className="font-bobz" style={{ fontSize: '1.08rem' }}>BTC / USD 15-MIN FLIP</span>
                  </div>
                  <span className="badge-pill-green" style={{ fontSize: '0.72rem' }}>
                    LIVE {timeRemaining || '02:44'}
                  </span>
                </div>

                <div style={{ fontSize: '1.85rem', fontWeight: 900, marginBottom: '0.35rem', color: 'var(--color-white)' }}>
                  ${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="font-terminal" style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: '1.15rem' }}>
                  TARGET STRIKE: ${btcM?.strikePrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '87,500.00'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1.15rem' }}>
                  <button
                    onClick={() => {
                      if (btcM) setSelectedMarketId(btcM.marketId);
                      setSelectedSide('UP');
                      handleLaunchApp('dashboard');
                    }}
                    className="btn-bet-up"
                    style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem' }}
                  >
                    <TrendingUp size={14} />
                    <span>UP ({btcUpProb}¢)</span>
                  </button>
                  <button
                    onClick={() => {
                      if (btcM) setSelectedMarketId(btcM.marketId);
                      setSelectedSide('DOWN');
                      handleLaunchApp('dashboard');
                    }}
                    className="btn-bet-down"
                    style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem' }}
                  >
                    <TrendingDown size={14} />
                    <span>DOWN ({btcDownProb}¢)</span>
                  </button>
                </div>

                <div className="font-subtext" style={{ fontSize: '0.84rem', color: '#9CA3AF' }}>
                  Est. Return: <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>+{(( (100 / (btcUpProb || 50)) - 1 ) * 100).toFixed(0)}% ROI</span> on winning contracts.
                </div>
              </div>

              {/* Right Peeking Card (SOL) */}
              <div
                className="card-light reveal-pop reveal-delay-3"
                style={{
                  opacity: 0.95,
                  transform: 'scale(0.98)',
                  padding: '1.75rem 1.5rem',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (solM) setSelectedMarketId(solM.marketId);
                  handleLaunchApp('dashboard');
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <span className="font-bobz" style={{ fontSize: '1.05rem' }}>SOL / USD 15-MIN</span>
                  <span className="badge-pill-light" style={{ fontSize: '0.72rem' }}>
                    {solM?.change24h !== undefined ? `${solM.change24h >= 0 ? '+' : ''}${solM.change24h.toFixed(1)}%` : 'LIVE'}
                  </span>
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 900, marginBottom: '0.45rem' }}>
                  ${solPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1rem' }}>
                  <div style={{ flex: 1, backgroundColor: 'rgba(0,200,83,0.08)', color: 'var(--color-green)', padding: '0.55rem', borderRadius: '6px', textAlign: 'center', fontSize: '0.88rem', fontWeight: 900 }}>
                    UP {solUpProb}%
                  </div>
                  <div style={{ flex: 1, backgroundColor: 'rgba(229,9,20,0.08)', color: 'var(--color-red)', padding: '0.55rem', borderRadius: '6px', textAlign: 'center', fontSize: '0.88rem', fontWeight: 900 }}>
                    DOWN {solDownProb}%
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* ========================================================================= */}
      {/* 4.5 SECTION 0.3.5 — PERMISSIONLESS MARKET CREATOR (User-Generated Markets) */}
      {/* ========================================================================= */}
      <section
        id="creator"
        style={{
          backgroundColor: '#F9FAFB',
          padding: '4.5rem 0',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            width: '94%',
            margin: '0 auto',
          }}
        >
          <div className="reveal-pop" style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <div style={{ marginBottom: '0.35rem' }}>
              <span className="font-number" style={{ fontSize: '0.98rem', color: 'var(--color-grey-muted)', letterSpacing: '0.06em' }}>
                0.3.5 —
              </span>
            </div>

            <h2
              className="font-bobz"
              style={{
                fontSize: '1.85rem',
                color: 'var(--color-black)',
                margin: '0 0 0.5rem 0',
                lineHeight: 1.15,
              }}
            >
              PERMISSIONLESS MARKET CREATOR
            </h2>

            <p
              className="font-subtext"
              style={{
                fontSize: '0.90rem',
                color: 'var(--color-grey-text)',
                maxWidth: '680px',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Deploy your own prediction markets with zero gatekeeping. Pick any crypto asset, configure strike barrier targets, set settlement timeframes, and bootstrap liquidity in tUSDC directly on Somnia Shannon testnet.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '2rem',
              alignItems: 'stretch',
            }}
          >
            {/* Left: Interactive Creator Preview Card */}
            <div
              className="reveal-pop reveal-delay-1"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px dashed rgba(0, 0, 0, 0.2)',
                borderRadius: '16px',
                padding: '1.85rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={16} color="var(--color-green)" />
                    <span className="font-bobz" style={{ fontSize: '1.02rem', fontWeight: 800 }}>
                      Live Market Specification Deck
                    </span>
                  </div>
                  <span className="badge-pill-green" style={{ fontSize: '0.72rem' }}>
                    Permissionless EVM
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{ backgroundColor: '#F9FAFB', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="font-terminal" style={{ fontSize: '0.70rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>UNDERLYING ASSETS</div>
                    <div className="font-bobz" style={{ fontSize: '0.94rem', fontWeight: 800 }}>BTC · ETH · SOL · SOMNIA · BNB</div>
                  </div>

                  <div style={{ backgroundColor: '#F9FAFB', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="font-terminal" style={{ fontSize: '0.70rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>EXPIRY INTERVALS</div>
                    <div className="font-bobz" style={{ fontSize: '0.94rem', fontWeight: 800 }}>15 Mins · 1 Hour · 24 Hours</div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#F9FAFB', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.80rem' }}>
                    <span className="font-subtext" style={{ color: '#6B7280' }}>Collateral Standard:</span>
                    <span className="font-terminal" style={{ fontWeight: 700, color: 'var(--color-green)' }}>tUSDC (6 Decimals)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.80rem' }}>
                    <span className="font-subtext" style={{ color: '#6B7280' }}>Oracle Verification:</span>
                    <span className="font-bobz" style={{ fontWeight: 800 }}>DreamDEX TWAP / Pyth On-Chain</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem' }}>
                    <span className="font-subtext" style={{ color: '#6B7280' }}>Parimutuel Settlement:</span>
                    <span className="font-terminal" style={{ fontWeight: 700 }}>1 UP + 1 DOWN = $1.00 USDso</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px dashed rgba(0,0,0,0.12)' }}>
                <span className="font-subtext" style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                  {userCreatedMarkets.length} Community markets currently created
                </span>
                <button
                  onClick={() => handleLaunchApp('dashboard')}
                  className="btn-launch-black"
                  style={{ padding: '0.55rem 1.15rem', fontSize: '0.80rem', gap: '0.35rem', cursor: 'pointer' }}
                >
                  <PlusCircle size={14} />
                  <span>Deploy New Market</span>
                </button>
              </div>
            </div>

            {/* Right: Feature Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
              <div className="reveal-pop reveal-delay-1" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.25rem' }}>
                  <ShieldCheck size={16} color="var(--color-green)" />
                  <span className="font-bobz" style={{ fontSize: '1.05rem', color: 'var(--color-black)' }}>Custom Strike Barrier Pricing</span>
                </div>
                <p className="font-subtext" style={{ fontSize: '0.88rem', color: 'var(--color-grey-text)', margin: 0, lineHeight: 1.55 }}>
                  Define custom price hurdles above or below the current TWAP spot rate. Traders can take directional positions instantly with complete mathematical transparency.
                </p>
              </div>

              <div className="reveal-pop reveal-delay-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.25rem' }}>
                  <Zap size={16} color="var(--color-green)" />
                  <span className="font-bobz" style={{ fontSize: '1.05rem', color: 'var(--color-black)' }}>Instant Liquidity Bootstrapping</span>
                </div>
                <p className="font-subtext" style={{ fontSize: '0.88rem', color: 'var(--color-grey-text)', margin: 0, lineHeight: 1.55 }}>
                  Seed initial collateral in tUSDC to unlock immediate zero-slippage trading. Complete-set minting ensures the creator and traders are never exposed to counterparty insolvency.
                </p>
              </div>

              <div className="reveal-pop reveal-delay-3">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.25rem' }}>
                  <Globe size={16} color="var(--color-green)" />
                  <span className="font-bobz" style={{ fontSize: '1.05rem', color: 'var(--color-black)' }}>Global Community Distribution</span>
                </div>
                <p className="font-subtext" style={{ fontSize: '0.88rem', color: 'var(--color-grey-text)', margin: 0, lineHeight: 1.55 }}>
                  Once deployed on Somnia Shannon, your market is immediately discoverable across the global FLIP network and ready for automated algorithmic traders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SECTION 0.4 — LEVERAGED / FIXED SETTLEMENT (Exact 3-Column Layout)      */}
      {/* ========================================================================= */}
      <section
        id="dynamics-pools"
        style={{
          backgroundColor: '#FAF9F6',
          padding: '4.5rem 0',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            width: '94%',
            margin: '0 auto',
          }}
        >
          {/* Centered Editorial Header */}
          <div className="reveal-pop" style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 2.75rem auto' }}>
            <div style={{ marginBottom: '0.55rem' }}>
              <span
                className="font-terminal"
                style={{
                  fontSize: '0.78rem',
                  color: '#71717A',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                0.4 — WHAT YOU ACTUALLY GET
              </span>
            </div>

            {/* Main Headline */}
            <h2
              className="font-bobz"
              style={{
                fontSize: '1.85rem',
                lineHeight: 1.15,
                fontWeight: 400,
                color: '#1A1816',
                margin: '0 0 0.85rem 0',
                letterSpacing: '-0.02em',
              }}
            >
              Mathematical parity guarantee where all contracts settle at $1.00 USDso.
            </h2>

            <p
              className="font-subtext"
              style={{
                fontSize: '0.90rem',
                color: '#55534E',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Every winning contract pays out $1.00. Buy early at $0.38 to capture +163.15% ROI when the strike finishes in your favor, with automated redemption calculated proportional to your pool weight.
            </p>
          </div>

          {/* 3 Visual Columns Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.75rem',
              alignItems: 'stretch',
            }}
          >
            {/* Column 1: Instant Execution & Fixed Payout */}
            <div className="reveal-pop reveal-delay-1" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Top Visual Card Mockup (Execution Terminal) */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  padding: '1.25rem',
                  height: '190px',
                  marginBottom: '1.25rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ backgroundColor: '#111111', borderRadius: '8px', padding: '0.95rem 1.05rem', color: '#FFFFFF', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <span className="font-terminal" style={{ color: '#9CA3AF', fontSize: '0.74rem' }}>BET_AMOUNT:</span>
                    <span className="font-terminal" style={{ color: '#FFFFFF', fontWeight: 700 }}>$25.00 USDso</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <span className="font-terminal" style={{ color: '#9CA3AF', fontSize: '0.74rem' }}>EST_CONTRACTS:</span>
                    <span className="font-terminal" style={{ color: '#38BDF8', fontWeight: 700 }}>65.78 Shares</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.45rem' }}>
                    <span className="font-terminal" style={{ color: '#9CA3AF', fontSize: '0.74rem' }}>EST_PAYOUT:</span>
                    <span className="font-terminal" style={{ color: 'var(--color-green)', fontWeight: 700 }}>$65.78 (+163.15%)</span>
                  </div>
                </div>
              </div>

              {/* Title + Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <h3
                  className="font-bobz"
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#1A1816',
                    margin: 0,
                  }}
                >
                  Instant Execution & Fixed Payout
                </h3>
                <span className="badge-pill-green" style={{ fontSize: '0.70rem', padding: '0.15rem 0.55rem' }}>
                  100% On-Chain
                </span>
              </div>

              {/* Description */}
              <p
                className="font-subtext"
                style={{
                  fontSize: '0.88rem',
                  color: '#55534E',
                  lineHeight: 1.55,
                  marginBottom: '1.15rem',
                  flexGrow: 1,
                }}
              >
                Every winning contract pays out $1.00. Buy early at $0.38 to capture +163.15% ROI when the strike finishes in your favor.
              </p>

              {/* Action Link */}
              <div
                onClick={() => handleLaunchApp('dashboard')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1A1816',
                  borderBottom: '1.5px solid #1A1816',
                  paddingBottom: '2px',
                  cursor: 'pointer',
                  width: 'fit-content',
                }}
              >
                <span>Simulate on Testnet</span>
                <ArrowUpRight size={13} strokeWidth={2.5} />
              </div>
            </div>

            {/* Column 2: Parimutuel AMM Weight Pools */}
            <div className="reveal-pop reveal-delay-2" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Top Visual Card Mockup (Bar Distribution Diagram) */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  padding: '1.25rem',
                  height: '190px',
                  marginBottom: '1.25rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* Visual Bar Distribution Mockup */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '100px', paddingBottom: '0.4rem' }}>
                  {[
                    { height: '40px', active: false },
                    { height: '26px', active: false },
                    { height: '80px', active: false },
                    { height: '62px', active: true },
                    { height: '90px', active: false },
                    { height: '35px', active: false },
                  ].map((bar, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                      {bar.active && (
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#D9F99D', boxShadow: '0 0 6px #D9F99D' }} />
                      )}
                      <div
                        style={{
                          width: '28px',
                          height: bar.height,
                          backgroundColor: bar.active ? '#1A1816' : '#2B2B2B',
                          borderRadius: '3px',
                          border: bar.active ? '1px dashed rgba(0, 200, 83, 0.6)' : 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dotted rgba(0,0,0,0.15)', paddingTop: '0.45rem' }}>
                  <span className="font-terminal" style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>SLOT 01 → 06</span>
                  <span className="font-terminal" style={{ fontSize: '0.74rem', color: 'var(--color-green)' }}>Σ = 1.00 USDso</span>
                </div>
              </div>

              {/* Title + Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <h3
                  className="font-bobz"
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#1A1816',
                    margin: 0,
                  }}
                >
                  Parimutuel AMM Weight Pools
                </h3>
                <span className="badge-pill-light" style={{ fontSize: '0.70rem', padding: '0.15rem 0.55rem' }}>
                  EVM Native
                </span>
              </div>

              {/* Description */}
              <p
                className="font-subtext"
                style={{
                  fontSize: '0.88rem',
                  color: '#55534E',
                  lineHeight: 1.55,
                  marginBottom: '1.15rem',
                  flexGrow: 1,
                }}
              >
                Complete-set binary token minting guarantees mathematical parity where 1 UP + 1 DOWN is always fully collateralized by $1.00 in escrow.
              </p>

              {/* Action Link */}
              <div
                onClick={() => handleLaunchApp('dashboard')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1A1816',
                  borderBottom: '1.5px solid #1A1816',
                  paddingBottom: '2px',
                  cursor: 'pointer',
                  width: 'fit-content',
                }}
              >
                <span>How the pool settles</span>
                <ArrowUpRight size={13} strokeWidth={2.5} />
              </div>
            </div>

            {/* Column 3: DreamDEX Bot Engine Integration */}
            <div className="reveal-pop reveal-delay-3" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Top Visual Card Mockup (Dark Balance Card) */}
              <div
                style={{
                  backgroundColor: '#181716',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '1.25rem',
                  height: '190px',
                  marginBottom: '1.25rem',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '1px solid rgba(217, 249, 157, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.55rem',
                    backgroundColor: 'rgba(217, 249, 157, 0.08)',
                  }}
                >
                  <ShieldCheck size={18} color="#D9F99D" />
                </div>
                <div className="font-bobz" style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.2rem' }}>
                  100% Non-Custodial
                </div>
                <div className="font-terminal" style={{ fontSize: '0.74rem', color: 'var(--color-green)' }}>
                  &lt;1 SEC FINALITY ON SOMNIA
                </div>
              </div>

              {/* Title + Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <h3
                  className="font-bobz"
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#1A1816',
                    margin: 0,
                  }}
                >
                  DreamDEX Bot Engine Integration
                </h3>
                <span className="badge-pill-light" style={{ fontSize: '0.70rem', padding: '0.15rem 0.55rem' }}>
                  SDK Ready
                </span>
              </div>

              {/* Description */}
              <p
                className="font-subtext"
                style={{
                  fontSize: '0.88rem',
                  color: '#55534E',
                  lineHeight: 1.55,
                  marginBottom: '1.15rem',
                  flexGrow: 1,
                }}
              >
                Connect algorithmic trading agents via the official DreamDEX Bot Kit. Run Market Making, Grid, Momentum, or Mean-Reversion strategies directly on Somnia.
              </p>

              {/* Action Link */}
              <a
                href="https://github.com/somnia-chain/dreamdex-bot-kit"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1A1816',
                  borderBottom: '1.5px solid #1A1816',
                  paddingBottom: '2px',
                  textDecoration: 'none',
                  width: 'fit-content',
                }}
              >
                <span>Explore DreamDEX Bot Kit</span>
                <ArrowUpRight size={13} strokeWidth={2.5} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5.5 SECTION 0.4.5 — PRIVATE SQUAD CHALLENGES (PvP Prediction Battles)      */}
      {/* ========================================================================= */}
      <section
        id="squads"
        style={{
          backgroundColor: '#FFFFFF',
          padding: '4.5rem 0',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            width: '94%',
            margin: '0 auto',
          }}
        >
          <div className="reveal-pop" style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <div style={{ marginBottom: '0.35rem' }}>
              <span className="font-number" style={{ fontSize: '0.98rem', color: 'var(--color-grey-muted)', letterSpacing: '0.06em' }}>
                0.4.5 —
              </span>
            </div>

            <h2
              className="font-bobz"
              style={{
                fontSize: '1.85rem',
                color: 'var(--color-black)',
                margin: '0 0 0.5rem 0',
                lineHeight: 1.15,
              }}
            >
              PRIVATE SQUAD CHALLENGES & QR ROOMS
            </h2>

            <p
              className="font-subtext"
              style={{
                fontSize: '0.90rem',
                color: 'var(--color-grey-text)',
                maxWidth: '700px',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Battle your friends and trading group in private peer-to-peer prediction showdowns. Generate shareable room links, scan instant QR codes on mobile, pool entry fees in tUSDC, and split the winning pot parimutuelly with standard 2% protocol & ecosystem fee.
            </p>
          </div>

          {/* Squad Challenge Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.5rem',
              alignItems: 'stretch',
              marginBottom: '2rem',
            }}
          >
            {privateChallenges.slice(0, 3).map((c, idx) => {
              const isFull = c.participants.length >= c.maxParticipants;
              const isExpired = Date.now() >= c.expiryTimestampMs;
              return (
                <div
                  key={c.id}
                  className={`card-paper reveal-pop reveal-delay-${idx + 1}`}
                  style={{
                    padding: '1.65rem 1.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: 'var(--color-green)',
                          backgroundColor: 'rgba(0,194,120,0.08)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                        }}
                      >
                        {c.underlyingAsset} / USD
                      </span>
                      <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--color-grey-muted)' }}>
                        {isExpired ? 'EXPIRED' : `${Math.max(0, Math.round((c.expiryTimestampMs - Date.now()) / 60000))}m left`}
                      </span>
                    </div>

                    <h3 className="font-bobz" style={{ margin: '0 0 0.45rem 0', fontSize: '1.08rem' }}>
                      {c.title}
                    </h3>

                    <div style={{ fontSize: '0.82rem', color: 'var(--color-grey-text)', marginBottom: '0.95rem' }}>
                      Strike Barrier: <strong>${c.strikePrice.toLocaleString()}</strong> · Entry: <strong>${c.entryFeeUSD} tUSDC</strong>
                    </div>

                    {/* Pot & Players Progress */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.80rem',
                        padding: '0.75rem 0.85rem',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '8px',
                        border: '1px dashed rgba(0,0,0,0.08)',
                      }}
                    >
                      <div>
                        <div style={{ color: '#9CA3AF', fontSize: '0.70rem' }}>Squad Pot</div>
                        <div className="font-mono" style={{ fontWeight: 800, color: 'var(--color-black)', fontSize: '0.98rem' }}>
                          ${c.totalPotUSD} tUSDC
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#9CA3AF', fontSize: '0.70rem' }}>Squad Capacity</div>
                        <div className="font-mono" style={{ fontWeight: 800, color: isFull ? 'var(--color-red)' : 'var(--color-green)', fontSize: '0.98rem' }}>
                          {c.participants.length} / {c.maxParticipants} Players
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLaunchApp('dashboard')}
                    className="btn-launch-black"
                    style={{ width: '100%', justifyContent: 'center', padding: '0.65rem', fontSize: '0.82rem' }}
                  >
                    <span>Enter Squad Room & QR</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Bottom Action Strip */}
          <div
            className="reveal-pop"
            style={{
              backgroundColor: '#F3F4F6',
              borderRadius: '12px',
              padding: '1.25rem 1.65rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <QrCode size={20} color="var(--color-black)" />
              <div>
                <div className="font-bobz" style={{ fontSize: '0.96rem', fontWeight: 800 }}>Want to host a challenge for your own squad?</div>
                <div className="font-subtext" style={{ fontSize: '0.82rem', color: 'var(--color-grey-text)' }}>Set custom participant caps, custom duration (15m to 24h), and instant mobile QR code joins.</div>
              </div>
            </div>

            <button
              onClick={() => handleLaunchApp('dashboard')}
              className="btn-launch-black"
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.80rem', gap: '0.35rem', cursor: 'pointer' }}
            >
              <PlusCircle size={14} />
              <span>Create Squad Challenge</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SECTION 0.5 — 3D PERSPECTIVE COVERFLOW CAROUSEL (Exact User Screenshot) */}
      {/* ========================================================================= */}
      <CoverflowCarousel onExplore={() => handleLaunchApp('dashboard')} />

      {/* ========================================================================= */}
      {/* 7. SECTION 0.6 — SELF-CUSTODIAL SECURITY CLEARANCE (Exact User Data in Layout) */}
      {/* ========================================================================= */}
      <section
        id="security"
        style={{
          backgroundColor: '#FFFFFF',
          color: 'var(--color-black)',
          padding: '4.5rem 0',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            width: '94%',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '0.92fr 1.08fr',
            gap: '3.5rem',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Specification Card with Round Security Clearance Steps */}
          <div
            className="reveal-pop"
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: '12px',
              padding: '2rem 1.85rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              border: '1px dashed rgba(0, 0, 0, 0.18)',
            }}
          >
            {/* Card Header */}
            <div
              className="font-terminal"
              style={{
                fontSize: '0.74rem',
                color: '#71717A',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginBottom: '1.35rem',
                textAlign: 'left',
              }}
            >
              SECURITY CLEARANCE LIFECYCLE
            </div>

            {/* 7 Security Steps with Dotted Separator Lines */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { step: '01', name: 'Web3 Wallet Connect', isActive: false },
                { step: '02', name: 'Non-Custodial Escrow Mint', isActive: false },
                { step: '03', name: 'On-Chain Event Token Lock', isActive: false },
                { step: '04', name: 'Somnia MultiStream Execution', isActive: false },
                { step: '05', name: 'DreamDEX TWAP Snapshot', isActive: false },
                { step: '06', name: '1-Click Instant Payout Claim', isActive: true },
                { step: '07', name: 'Deterministic Finality', isActive: false },
              ].map((item, idx) => (
                <div
                  key={item.step}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0',
                    borderBottom: idx < 6 ? '1px dotted rgba(0, 0, 0, 0.16)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.35rem' }}>
                    <span
                      className="font-terminal"
                      style={{
                        fontSize: '0.78rem',
                        color: '#71717A',
                        fontWeight: 600,
                      }}
                    >
                      {item.step}
                    </span>
                    <span
                      className="font-subtext"
                      style={{
                        fontSize: '0.90rem',
                        color: item.isActive ? '#1A1816' : '#4A4844',
                        fontWeight: item.isActive ? 700 : 500,
                      }}
                    >
                      {item.name}
                    </span>
                  </div>

                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: item.isActive ? 'var(--color-green)' : '#D1D0CB',
                      boxShadow: item.isActive ? '0 0 6px rgba(0, 200, 83, 0.8)' : 'none',
                      display: 'inline-block',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Card Footer Text */}
            <p
              className="font-subtext"
              style={{
                fontSize: '0.84rem',
                color: '#55534E',
                lineHeight: 1.55,
                marginTop: '1.5rem',
                marginBottom: 0,
                textAlign: 'left',
              }}
            >
              Funds never leave your custody until you execute a position. Smart contracts automatically disburse winnings instantly.
            </p>
          </div>

          {/* Right Column: User's Exact Cards in Feature Rows */}
          <div className="reveal-pop reveal-delay-1" style={{ textAlign: 'left' }}>
            {/* Small Top Tag */}
            <div
              className="font-terminal"
              style={{
                fontSize: '0.76rem',
                color: '#71717A',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginBottom: '0.55rem',
              }}
            >
              0.6 — SOMNIA SHANNON TESTNET
            </div>

            {/* Main Headline */}
            <h2
              className="font-bobz"
              style={{
                fontSize: '1.85rem',
                lineHeight: 1.15,
                fontWeight: 400,
                color: '#1A1816',
                margin: '0 0 0.65rem 0',
                textTransform: 'uppercase',
                letterSpacing: '-0.01em',
              }}
            >
              SELF-CUSTODIAL SECURITY CLEARANCE
            </h2>

            <p
              className="font-subtext"
              style={{
                fontSize: '0.90rem',
                color: '#55534E',
                lineHeight: 1.6,
                margin: '0 0 1.85rem 0',
              }}
            >
              Funds never leave your custody until you execute a position. Smart contracts automatically disburse winnings instantly.
            </p>

            {/* 3 User Feature Rows with Dotted Dividers */}
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '1.85rem' }}>
              {/* Row 1: Non-Custodial Escrow Vaults */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1.15rem',
                  paddingBottom: '1.15rem',
                  marginBottom: '1.15rem',
                  borderBottom: '1px dotted rgba(0, 0, 0, 0.16)',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid rgba(0, 0, 0, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '0.1rem',
                    backgroundColor: 'rgba(0, 200, 83, 0.08)',
                  }}
                >
                  <Lock size={15} color="var(--color-green)" />
                </div>
                <div>
                  <h3
                    className="font-bobz"
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: '#1A1816',
                      margin: '0 0 0.25rem 0',
                    }}
                  >
                    Non-Custodial Escrow Vaults
                  </h3>
                  <p
                    className="font-subtext"
                    style={{
                      fontSize: '0.88rem',
                      color: '#55534E',
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    Positions are represented as on-chain event tokens. You retain exclusive ownership of all contracts until settlement.
                  </p>
                </div>
              </div>

              {/* Row 2: Instant Winner Payout Claims */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1.15rem',
                  paddingBottom: '1.15rem',
                  marginBottom: '1.15rem',
                  borderBottom: '1px dotted rgba(0, 0, 0, 0.16)',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid rgba(0, 0, 0, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '0.1rem',
                    backgroundColor: 'rgba(0, 200, 83, 0.08)',
                  }}
                >
                  <Zap size={15} color="var(--color-green)" />
                </div>
                <div>
                  <h3
                    className="font-bobz"
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: '#1A1816',
                      margin: '0 0 0.25rem 0',
                    }}
                  >
                    Instant Winner Payout Claims
                  </h3>
                  <p
                    className="font-subtext"
                    style={{
                      fontSize: '0.88rem',
                      color: '#55534E',
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    Upon round finality, 1-click redemption pulls full earnings directly to your connected Web3 wallet.
                  </p>
                </div>
              </div>

              {/* Row 3: 100% Non-Custodial & 1,000 USDso Testnet */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1.15rem',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid rgba(0, 0, 0, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '0.1rem',
                    backgroundColor: 'rgba(0, 200, 83, 0.08)',
                  }}
                >
                  <ShieldCheck size={15} color="var(--color-green)" />
                </div>
                <div>
                  <h3
                    className="font-bobz"
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: '#1A1816',
                      margin: '0 0 0.25rem 0',
                    }}
                  >
                    100% Non-Custodial Architecture
                  </h3>
                  <p
                    className="font-subtext"
                    style={{
                      fontSize: '0.88rem',
                      color: '#55534E',
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    Connect with MetaMask or Rabby to claim your 1,000 USDso testnet trading balance.
                  </p>
                </div>
              </div>
            </div>

            {/* Launch Action Button */}
            <div>
              <button
                onClick={() => handleLaunchApp('dashboard')}
                className="btn-launch-black"
                style={{
                  padding: '0.65rem 1.45rem',
                  fontSize: '0.82rem',
                }}
              >
                <span>LAUNCH TRADING ARENA</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7.5 SECTION 0.6.5 — SOMNIA SHANNON ON-CHAIN ENGINE & TOKEN ECONOMY        */}
      {/* ========================================================================= */}
      <section
        id="tokens"
        style={{
          backgroundColor: '#0A0A0A',
          color: 'var(--color-white)',
          padding: '4.5rem 0',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            width: '94%',
            margin: '0 auto',
          }}
        >
          <div className="reveal-pop" style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <div style={{ marginBottom: '0.35rem' }}>
              <span className="font-number" style={{ fontSize: '0.98rem', color: '#9CA3AF', letterSpacing: '0.06em' }}>
                0.6.5 —
              </span>
            </div>

            <h2
              className="font-bobz"
              style={{
                fontSize: '1.85rem',
                color: '#FFFFFF',
                margin: '0 0 0.5rem 0',
                lineHeight: 1.15,
              }}
            >
              SOMNIA SHANNON (50312) ON-CHAIN ECONOMY
            </h2>

            <p
              className="font-subtext"
              style={{
                fontSize: '0.90rem',
                color: '#9CA3AF',
                maxWidth: '680px',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              FLIP runs natively on the Somnia Shannon Testnet. Real balances, automated network switching, sub-cent gas fees in STT, and liquid parimutuel settlement in tUSDC.
            </p>
          </div>

          {/* 4 Pillars Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.25rem',
            }}
          >
            <div className="reveal-pop reveal-delay-1" style={{ backgroundColor: '#141414', border: '1px dashed rgba(255,255,255,0.14)', borderRadius: '10px', padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.55rem' }}>
                <Coins size={16} color="var(--color-green)" />
                <span className="font-terminal" style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>COLLATERAL TOKEN</span>
              </div>
              <div className="font-bobz" style={{ fontSize: '1.08rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.35rem' }}>
                tUSDC (6 Decimals)
              </div>
              <p className="font-subtext" style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
                Verified collateral contract at <code style={{ color: '#38BDF8', fontSize: '0.74rem' }}>0x70a8...64B3</code>. 1-to-1 USD parity backing for all binary mints.
              </p>
            </div>

            <div className="reveal-pop reveal-delay-2" style={{ backgroundColor: '#141414', border: '1px dashed rgba(255,255,255,0.14)', borderRadius: '10px', padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.55rem' }}>
                <Zap size={16} color="#38BDF8" />
                <span className="font-terminal" style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>GAS & EXECUTION</span>
              </div>
              <div className="font-bobz" style={{ fontSize: '1.08rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.35rem' }}>
                STT (Native 18 Dec)
              </div>
              <p className="font-subtext" style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
                Ultra-low transaction fees (&lt; $0.0001 STT per position mint). MultiStream parallel EVM finality in under 100 milliseconds.
              </p>
            </div>

            <div className="reveal-pop reveal-delay-3" style={{ backgroundColor: '#141414', border: '1px dashed rgba(255,255,255,0.14)', borderRadius: '10px', padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.55rem' }}>
                <Activity size={16} color="#FBBF24" />
                <span className="font-terminal" style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>CHAIN ID</span>
              </div>
              <div className="font-bobz" style={{ fontSize: '1.08rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.35rem' }}>
                Shannon 50312
              </div>
              <p className="font-subtext" style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
                Automated network detection. 1-click network addition and switching in MetaMask, Rabby, and RainbowKit wallets.
              </p>
            </div>

            <div className="reveal-pop reveal-delay-4" style={{ backgroundColor: '#141414', border: '1px dashed rgba(255,255,255,0.14)', borderRadius: '10px', padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.55rem' }}>
                <ExternalLink size={16} color="var(--color-green)" />
                <span className="font-terminal" style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>FREE TEST TOKENS</span>
              </div>
              <div className="font-bobz" style={{ fontSize: '1.08rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.35rem' }}>
                Telegram Faucet
              </div>
              <p className="font-subtext" style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: '0 0 0.55rem 0', lineHeight: 1.5 }}>
                Claim free STT and tUSDC testnet tokens directly from the official Somnia telegram bot.
              </p>
              <a
                href={SOMNIA_CONFIG.faucetTelegram}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  color: 'var(--color-green)',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                }}
              >
                <span>Open @Somnia_Faucet_Bot</span>
                <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. SECTION 0.7 — DEVELOPER RESOURCES & STARTER TEMPLATES (Editorial Layout)*/}
      {/* ========================================================================= */}
      <section
        id="docs"
        style={{
          backgroundColor: '#FFFFFF',
          padding: '4.5rem 0',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            width: '92%',
            margin: '0 auto',
          }}
        >
          {/* Top Tag */}
          <div className="reveal-pop" style={{ marginBottom: '0.85rem', textAlign: 'left' }}>
            <span
              style={{
                fontFamily: "'Space Mono', 'Special Elite', monospace",
                fontSize: '0.78rem',
                color: '#71717A',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              0.7 · DEVELOPER RESOURCES &amp; STARTER TEMPLATES
            </span>
          </div>

          {/* Top Split Section: Left Headline, Right Paragraphs */}
          <div
            className="reveal-pop"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.15fr 0.85fr',
              gap: '3.5rem',
              alignItems: 'start',
              paddingBottom: '2.5rem',
              borderBottom: '1px dotted rgba(0, 0, 0, 0.22)',
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                  fontSize: '2.1rem',
                  lineHeight: 1.12,
                  fontWeight: 400,
                  color: '#1A1816',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                The fastest engine for prediction market event contracts.
              </h2>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.95rem',
                fontFamily: "'Inter', -apple-system, sans-serif",
                fontSize: '0.90rem',
                lineHeight: 1.6,
                color: '#4A4843',
              }}
            >
              <p style={{ margin: 0 }}>
                Somnia and DreamDEX provide high-throughput infrastructure, deterministic TWAP resolution, and complete SDK toolkits for builders to deploy automated prediction market strategies.
              </p>
              <p style={{ margin: 0 }}>
                High-frequency parimutuel pools settle deterministically at $1.00 USDso without centralized keepers or opaque execution delays.
              </p>
            </div>
          </div>

          {/* Bottom Split Section: Left = Resource Details, Right = MEASURED Benchmarks with Vertical Dotted Line */}
          <div
            className="reveal-pop reveal-delay-1"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.15fr 0.85fr',
              gap: '0',
              alignItems: 'start',
              paddingTop: '2.5rem',
            }}
          >
            {/* Left Column: 3 User Resource Items */}
            <div style={{ paddingRight: '3rem', textAlign: 'left' }}>
              <h3
                style={{
                  fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                  fontSize: '1.45rem',
                  fontWeight: 400,
                  lineHeight: 1.15,
                  color: '#1A1816',
                  margin: '0 0 1.5rem 0',
                }}
              >
                Developer Toolkits &amp; Starter Templates.
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.65rem' }}>
                {/* Resource 1: DreamDEX Bot Kit */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.92rem', color: '#1A1816' }}>&lt;/&gt;</span>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.98rem', color: '#1A1816' }}>DreamDEX Bot Kit</span>
                    </div>
                    <a
                      href="https://github.com/somnia-chain/dreamdex-bot-kit"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.82rem',
                        color: '#1A1816',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <span>GitHub</span>
                      <ArrowUpRight size={13} />
                    </a>
                  </div>
                  <p style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontSize: '0.86rem', color: '#55534E', lineHeight: 1.55, margin: 0 }}>
                    Open-source bot toolkit with 5 pre-configured trading strategies (<code style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 5px', borderRadius: '4px' }}>Market Making</code>, <code style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 5px', borderRadius: '4px' }}>Grid Trading</code>, <code style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 5px', borderRadius: '4px' }}>Momentum</code>) for Somnia event contracts.
                  </p>
                </div>

                {/* Resource 2: Event Contracts Docs */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <Boxes size={16} color="#1A1816" strokeWidth={1.8} />
                      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.98rem', color: '#1A1816' }}>Event Contracts Docs</span>
                    </div>
                    <a
                      href="https://docs.dreamdex.io/developers/event-contracts"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.82rem',
                        color: '#1A1816',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <span>Docs</span>
                      <ArrowUpRight size={13} />
                    </a>
                  </div>
                  <p style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontSize: '0.86rem', color: '#55534E', lineHeight: 1.55, margin: 0 }}>
                    Complete technical specification of the parimutuel binary option AMM, math parity guarantee, and settlement lifecycle.
                  </p>
                </div>

                {/* Resource 3: Starter Template */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <Cpu size={16} color="#1A1816" strokeWidth={1.8} />
                      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.98rem', color: '#1A1816' }}>Starter Template</span>
                    </div>
                    <a
                      href="https://github.com/IronicDeGawd/ec-dreamdex-hackathon-template"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.82rem',
                        color: '#1A1816',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <span>Boilerplate</span>
                      <ArrowUpRight size={13} />
                    </a>
                  </div>
                  <p style={{ fontFamily: "'Inter', -apple-system, sans-serif", fontSize: '0.86rem', color: '#55534E', lineHeight: 1.55, margin: 0 }}>
                    Official boilerplate with <code style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 5px', borderRadius: '4px' }}>Viem</code>, <code style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 5px', borderRadius: '4px' }}>ethers</code>, and Somnia Shannon RPC integration.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: MEASURED, NOT ESTIMATED Performance Benchmarks */}
            <div style={{ borderLeft: '1px dotted rgba(0, 0, 0, 0.22)', paddingLeft: '3rem', textAlign: 'left' }}>
              <div
                style={{
                  fontFamily: "'Space Mono', 'Special Elite', monospace",
                  fontSize: '0.74rem',
                  color: '#71717A',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: '1.75rem',
                  fontWeight: 600,
                }}
              >
                MEASURED, NOT ESTIMATED
              </div>

              {/* Metric 1 */}
              <div
                style={{
                  paddingBottom: '1.5rem',
                  marginBottom: '1.5rem',
                  borderBottom: '1px dotted rgba(0, 0, 0, 0.22)',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                    fontSize: '2.4rem',
                    fontWeight: 400,
                    color: '#1A1816',
                    lineHeight: 0.95,
                    marginBottom: '0.35rem',
                  }}
                >
                  400k+
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.86rem', fontWeight: 600, color: '#2A2824', marginBottom: '0.15rem' }}>
                  Per claim, sequential depth
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#757570' }}>
                  Somnia MultiStream parallel execution engine
                </div>
              </div>

              {/* Metric 2 */}
              <div
                style={{
                  paddingBottom: '1.5rem',
                  marginBottom: '1.5rem',
                  borderBottom: '1px dotted rgba(0, 0, 0, 0.22)',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                    fontSize: '2.4rem',
                    fontWeight: 400,
                    color: '#1A1816',
                    lineHeight: 0.95,
                    marginBottom: '0.35rem',
                  }}
                >
                  &lt;1 sec
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.86rem', fontWeight: 600, color: '#2A2824', marginBottom: '0.15rem' }}>
                  Per claim, global cost
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#757570' }}>
                  Sub-second deterministic state resolution
                </div>
              </div>

              {/* Metric 3 */}
              <div
                style={{
                  paddingBottom: '1.5rem',
                  marginBottom: '1.5rem',
                  borderBottom: '1px dotted rgba(0, 0, 0, 0.22)',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                    fontSize: '2.4rem',
                    fontWeight: 400,
                    color: '#1A1816',
                    lineHeight: 0.95,
                    marginBottom: '0.35rem',
                  }}
                >
                  &lt; $0.0001
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.86rem', fontWeight: 600, color: '#2A2824', marginBottom: '0.15rem' }}>
                  Settled per transaction
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#757570' }}>
                  Sub-cent STT micro-transaction cost
                </div>
              </div>

              {/* Metric 4 */}
              <div>
                <div
                  style={{
                    fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                    fontSize: '2.4rem',
                    fontWeight: 400,
                    color: '#1A1816',
                    lineHeight: 0.95,
                    marginBottom: '0.35rem',
                  }}
                >
                  100%
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.86rem', fontWeight: 600, color: '#2A2824', marginBottom: '0.15rem' }}>
                  Non-Custodial Escrow
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.78rem', color: '#757570' }}>
                  Smart contract vault verification on Shannon Testnet
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. SECTION 0.8 — THE PROTOCOL (Sotto Editorial Protocol Layout)           */}
      {/* ========================================================================= */}
      <section
        id="protocol"
        style={{
          backgroundColor: '#FAF9F6',
          padding: '4.5rem 0 3.5rem 0',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            width: '92%',
            margin: '0 auto',
          }}
        >
          {/* Top Tag */}
          <div className="reveal-pop" style={{ marginBottom: '0.85rem', textAlign: 'left' }}>
            <span
              style={{
                fontFamily: "'Space Mono', 'Special Elite', monospace",
                fontSize: '0.78rem',
                color: '#71717A',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              08 · THE PROTOCOL
            </span>
          </div>

          {/* Top Split Section: Left Headline, Right Pull Quote & Copy */}
          <div
            className="reveal-pop"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.05fr 1.15fr',
              gap: '3.5rem',
              alignItems: 'start',
              paddingBottom: '2.5rem',
              borderBottom: '1px dotted rgba(0, 0, 0, 0.22)',
            }}
          >
            {/* Left Column: Scaled-down Serif Headline */}
            <div style={{ textAlign: 'left' }}>
              <h2
                style={{
                  fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                  fontSize: '2.1rem',
                  lineHeight: 1.12,
                  fontWeight: 400,
                  color: '#1A1816',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Predict the Future.
              </h2>
            </div>

            {/* Right Column: Pull Quote & Paragraph */}
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontFamily: "'Instrument Serif', 'Playfair Display', serif",
                  fontSize: '1.45rem',
                  lineHeight: 1.25,
                  fontWeight: 400,
                  color: '#1A1816',
                  marginBottom: '1rem',
                  letterSpacing: '-0.01em',
                }}
              >
                “Zero slippage. Instant settlement. 100% Non-custodial.”
              </div>

              <p
                style={{
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  fontSize: '0.90rem',
                  lineHeight: 1.6,
                  color: '#4A4843',
                  margin: '0 0 1.65rem 0',
                }}
              >
                Experience high-velocity binary event trading on Somnia Shannon Testnet. Funds never leave your custody until you execute a position. Smart contracts automatically disburse winnings instantly with zero slippage and deterministic finality.
              </p>

              <div>
                <button
                  onClick={() => handleLaunchApp('dashboard')}
                  className="btn-launch-black"
                  style={{
                    padding: '0.75rem 1.65rem',
                    fontSize: '0.82rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  <span>LAUNCH TRADING ARENA</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Sub-footer Verification Status Line */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '1.25rem',
            }}
          >
            <div
              style={{
                fontFamily: "'Space Mono', 'Special Elite', monospace",
                fontSize: '0.74rem',
                color: '#71717A',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              LIVE ON SOMNIA SHANNON · VERIFIED CONTRACTS
            </div>

            <div
              style={{
                fontFamily: "'Space Mono', 'Special Elite', monospace",
                fontSize: '0.74rem',
                color: '#71717A',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              CHAIN ID 50312 · DEPLOYER 0x48f5...719
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. FOOTER (Harmonious Layout with Centered Watermark Logo)                */}
      {/* ========================================================================= */}
      <footer
        style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--color-white)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          padding: '4.5rem 1rem 3rem 1rem',
        }}
      >
        {/* Giant Watermark Logo in Background */}
        <div
          style={{
            position: 'absolute',
            top: '46%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: '920px',
            opacity: 0.08,
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img
            src="/assets/flip_full_logo.png"
            alt=""
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '340px',
              objectFit: 'contain',
            }}
          />
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '1240px',
            width: '94%',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
            gap: '2.5rem',
            marginBottom: '3rem',
          }}
        >
          <div className="reveal-pop reveal-delay-1">
            <img
              src="/assets/flip_full_logo.png"
              alt="FLIP"
              style={{ height: '54px', width: 'auto', objectFit: 'contain', marginBottom: '1rem' }}
            />
            <p className="font-subtext" style={{ fontSize: '0.94rem', color: 'var(--color-grey-text)', maxWidth: '300px', lineHeight: 1.6 }}>
              High-velocity binary prediction markets powered by Somnia L1 and DreamDEX Event Contracts.
            </p>
          </div>

          <div className="reveal-pop reveal-delay-2">
            <div className="font-bobz" style={{ fontSize: '0.90rem', marginBottom: '1rem', color: 'var(--color-black)', letterSpacing: '0.04em' }}>
              PRODUCT
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.92rem' }}>
              <a href="#about" style={{ color: 'var(--color-grey-text)', textDecoration: 'none' }}>About</a>
              <a href="#architecture" style={{ color: 'var(--color-grey-text)', textDecoration: 'none' }}>Architecture</a>
              <a href="#markets" style={{ color: 'var(--color-grey-text)', textDecoration: 'none' }}>Markets</a>
              <a href="#creator" style={{ color: 'var(--color-grey-text)', textDecoration: 'none' }}>Market Creator</a>
              <a href="#squads" style={{ color: 'var(--color-grey-text)', textDecoration: 'none' }}>Squad Challenges</a>
              <a href="#dynamics-pools" style={{ color: 'var(--color-grey-text)', textDecoration: 'none' }}>Dynamics</a>
              <a href="#tokens" style={{ color: 'var(--color-grey-text)', textDecoration: 'none' }}>Somnia Economy</a>
            </div>
          </div>

          <div className="reveal-pop reveal-delay-3">
            <div className="font-bobz" style={{ fontSize: '0.90rem', marginBottom: '1rem', color: 'var(--color-black)', letterSpacing: '0.04em' }}>
              DEVELOPERS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.92rem' }}>
              <a href="https://docs.dreamdex.io/developers/event-contracts" target="_blank" rel="noreferrer" style={{ color: 'var(--color-grey-text)', textDecoration: 'none' }}>Docs</a>
              <a href="https://github.com/somnia-chain/dreamdex-bot-kit" target="_blank" rel="noreferrer" style={{ color: 'var(--color-grey-text)', textDecoration: 'none' }}>Bot Kit</a>
              <a href="https://github.com/IronicDeGawd/ec-dreamdex-hackathon-template" target="_blank" rel="noreferrer" style={{ color: 'var(--color-grey-text)', textDecoration: 'none' }}>Template</a>
              <a href="https://shannon-explorer.somnia.network" target="_blank" rel="noreferrer" style={{ color: 'var(--color-grey-text)', textDecoration: 'none' }}>Explorer</a>
              <a href={SOMNIA_CONFIG.faucetTelegram} target="_blank" rel="noreferrer" style={{ color: 'var(--color-green)', textDecoration: 'none', fontWeight: 700 }}>Telegram Faucet</a>
            </div>
          </div>

          <div className="reveal-pop reveal-delay-4">
            <div className="font-bobz" style={{ fontSize: '0.90rem', marginBottom: '1rem', color: 'var(--color-black)', letterSpacing: '0.04em' }}>
              NETWORK
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.92rem' }}>
              <span style={{ color: 'var(--color-grey-text)' }}>Somnia Shannon Testnet</span>
              <span style={{ color: 'var(--color-grey-text)' }}>Chain ID: 50312</span>
              <span style={{ color: 'var(--color-grey-text)' }}>Currency: STT / tUSDC</span>
              <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>● Operational</span>
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: '1200px',
            width: '92%',
            margin: '0 auto',
            borderTop: '1px solid rgba(0,0,0,0.05)',
            paddingTop: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            color: 'var(--color-grey-muted)',
          }}
        >
          <div>© 2026 FLIP Protocol. All rights reserved.</div>
          <div>All Event Contracts Settle On-Chain via Somnia MultiStream Consensus.</div>
        </div>
      </footer>

      {/* Modal: Privy Identity & Wallet Hub */}
      <PrivyAccountModal
        isOpen={isPrivyModalOpen}
        onClose={() => setIsPrivyModalOpen(false)}
      />
    </div>
  );
}

