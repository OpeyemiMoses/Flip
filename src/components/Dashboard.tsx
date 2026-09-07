import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Activity,
  Layers,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  Award,
  DollarSign,
  Flame,
  CheckCircle2,
  RefreshCw,
  Wallet,
  ChevronDown,
  Copy,
  Cpu,
  Lock,
  Compass,
  Check,
  Users,
  Coins,
  AlertTriangle,
  PlusCircle,
  QrCode,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import confetti from 'canvas-confetti';
import { useMarketStore } from '../store/marketStore';
import { useTrade } from '../hooks/useTrade';
import { usePositions } from '../hooks/usePositions';
import { BinaryMarket, formatUSD, formatPercent } from '../services/dreamdex';
import { RealMarketChart } from './RealMarketChart';
import { CreateMarketModal } from './CreateMarketModal';
import { ConnectWalletModal } from './ConnectWalletModal';
import { PrivyAccountModal } from './auth/PrivyAccountModal';
import { PrivateChallengeView } from './PrivateChallengeView';
import { SOMNIA_CONFIG } from '../contracts/chain';
import { usePrivy } from '@privy-io/react-auth';

interface DashboardProps {
  onBackToLanding: () => void;
  onOpenAnalytics: () => void;
  /** Optional challenge ID to deep-link into on load (from ?challenge= URL param) */
  initialChallengeId?: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onBackToLanding, onOpenAnalytics, initialChallengeId }) => {
  const {
    markets,
    userCreatedMarkets,
    privateChallenges,
    selectedMarketId,
    setSelectedMarketId,
    userBalanceUSD,
    userGasSTT,
    userAddress,
    isConnected,
    currentChainId,
    isCorrectNetwork,
    setUserAddress,
    setUserBalance,
    loadInitialData,
    refreshBalances,
    markActivityViewed,
    lastSeenPositionCount,
    clearPositions,
  } = useMarketStore();


  const { address: wagmiAddress, isConnected: wagmiIsConnected } = useAccount();
  const { user, authenticated } = usePrivy();

  // Active module selection in the sidebar
  const [activeModule, setActiveModule] = useState<'arena' | 'activity' | 'squads' | 'security' | 'community'>('arena');
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isPrivyModalOpen, setIsPrivyModalOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'standard' | 'community' | 'squad'>('all');
  const [joinRoomInput, setJoinRoomInput] = useState('');

  // Sync Wagmi / Privy connection with Zustand Store
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      setUserAddress(user.wallet.address);
    } else if (wagmiIsConnected && wagmiAddress) {
      setUserAddress(wagmiAddress);
    } else if (!authenticated && !wagmiIsConnected && userAddress) {
      setUserAddress(null);
    }
  }, [authenticated, user, wagmiIsConnected, wagmiAddress, setUserAddress, userAddress]);

  const { placeQuickBet, isExecuting } = useTrade();
  const { positions, activePositions, historyPositions, cashOut } = usePositions();
  // Derive badge count reactively — always accurate, survives any navigation (no local state needed)
  const unseenActivityCount = Math.max(0, positions.length - lastSeenPositionCount);

  // Trade deck state
  const [selectedSide, setSelectedSide] = useState<'UP' | 'DOWN'>('UP');
  const [betAmount, setBetAmount] = useState<number>(25);
  const [timeRemaining, setTimeRemaining] = useState('02:44');
  const [notification, setNotification] = useState<string | null>(null);
  const [copiedContract, setCopiedContract] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Deep-link: open challenge room from prop (passed by App on ?challenge= URL param)
  useEffect(() => {
    if (initialChallengeId) {
      setSelectedChallengeId(initialChallengeId);
      setActiveModule('squads');
      // Clear the query param from the URL without a page reload
      if (typeof window !== 'undefined' && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete('challenge');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [initialChallengeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep-link: also watch for URL changes in-session (e.g., link pasted into address bar)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const challengeParam = params.get('challenge');
      if (challengeParam) {
        setSelectedChallengeId(challengeParam);
        setActiveModule('squads');
        const url = new URL(window.location.href);
        url.searchParams.delete('challenge');
        window.history.replaceState({}, '', url.toString());
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Merge standard and user-created markets
  const allMarkets = useMemo(() => {
    return [...markets, ...userCreatedMarkets];
  }, [markets, userCreatedMarkets]);

  // Live countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const seconds = 59 - now.getSeconds();
      const mins = 4 - (now.getMinutes() % 5);
      setTimeRemaining(`${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedMarket: BinaryMarket | undefined = useMemo(() => {
    return allMarkets.find((m) => m.marketId === selectedMarketId) || allMarkets[0] || markets[0];
  }, [allMarkets, markets, selectedMarketId]);

  // Filtered positions for unified Activity page (strictly tied to active session wallet)
  const filteredActivityPositions = useMemo(() => {
    if (!userAddress) return [];
    const normalized = userAddress.toLowerCase();
    return positions
      .filter((pos) => !pos.userAddress || pos.userAddress.toLowerCase() === normalized)
      .filter((pos) => {
        if (activityFilter === 'all') return true;
        if (activityFilter === 'standard') return !pos.marketCategory || pos.marketCategory === 'standard';
        if (activityFilter === 'community') return pos.marketCategory === 'community';
        if (activityFilter === 'squad') return pos.marketCategory === 'squad';
        return true;
      });
  }, [positions, userAddress, activityFilter]);

  // Calculations for trade deck
  const currentProbability = selectedMarket
    ? selectedSide === 'UP'
      ? selectedMarket.bestUpProbability
      : selectedMarket.bestDownProbability
    : 0.5;

  const estimatedContracts = betAmount / (currentProbability || 0.5);
  const potentialPayout = estimatedContracts * 1.0;
  const potentialProfit = potentialPayout - betAmount;
  const roiPercent = (potentialProfit / betAmount) * 100;

  const handleTrade = async () => {
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
        setNotification(`Transaction Confirmed! Minted ${estimatedContracts.toFixed(1)} ${selectedSide} on ${selectedMarket.underlyingAsset}`);
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (err: any) {
      setNotification(err.message || 'Order submission cancelled in wallet.');
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleCashOutWithConfetti = async (positionId: string) => {
    const res = await cashOut(positionId);
    if (res) {
      try {
        confetti({
          particleCount: 55,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#00C853', '#FFFFFF', '#000000'],
        });
      } catch {
        // Safe fallback
      }
      setNotification('Claim Signed! Settlement credited to balance.');
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const handleFaucet = () => {
    setUserBalance(userBalanceUSD + 500, userGasSTT + 10);
    setNotification('+$500 USDso & +10 STT Gas credited to session wallet!');
    setTimeout(() => setNotification(null), 3000);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(SOMNIA_CONFIG.collateralRouter);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  const displayAddr = userAddress
    ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
    : '0x7a83...42Fa';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8F9FA', color: 'var(--color-black)' }}>
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION HEADER (Matches Screenshot Exact Top Bar)               */}
      {/* ========================================================================= */}
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
        {/* Left: Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
            onClick={onBackToLanding}
          >
            <img
              src="/assets/flip_full_logo.png"
              alt="FLIP"
              style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          {/* Center Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            <button
              onClick={() => setActiveModule('arena')}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-bobz)',
                fontSize: '0.94rem',
                fontWeight: activeModule === 'arena' ? 800 : 500,
                color: activeModule === 'arena' ? 'var(--color-black)' : '#6B7280',
                cursor: 'pointer',
                padding: '0.3rem 0',
                borderBottom: activeModule === 'arena' ? '2.5px solid var(--color-black)' : '2.5px solid transparent',
                transition: 'all 0.2s ease',
              }}
            >
              Trading Arena
            </button>

            <button
              onClick={() => setActiveModule('community')}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-bobz)',
                fontSize: '0.94rem',
                fontWeight: activeModule === 'community' ? 800 : 500,
                color: activeModule === 'community' ? 'var(--color-black)' : '#6B7280',
                cursor: 'pointer',
                padding: '0.3rem 0',
                borderBottom: activeModule === 'community' ? '2.5px solid var(--color-black)' : '2.5px solid transparent',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Globe size={14} />
              <span>Community Markets</span>
              {userCreatedMarkets.length > 0 && (
                <span style={{ backgroundColor: 'rgba(0,200,83,0.12)', color: 'var(--color-green)', fontSize: '0.68rem', padding: '0.1rem 0.38rem', borderRadius: '4px', fontWeight: 800 }}>
                  {userCreatedMarkets.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveModule('activity');
                markActivityViewed();
              }}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-bobz)',
                fontSize: '0.94rem',
                fontWeight: activeModule === 'activity' ? 800 : 500,
                color: activeModule === 'activity' ? 'var(--color-black)' : '#6B7280',
                cursor: 'pointer',
                padding: '0.3rem 0',
                borderBottom: activeModule === 'activity' ? '2.5px solid var(--color-black)' : '2.5px solid transparent',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                position: 'relative',
              }}
            >
              <Layers size={15} />
              <span>My Activity</span>
              {unseenActivityCount > 0 && (
                <span style={{
                  backgroundColor: 'var(--color-green)',
                  color: '#000',
                  fontSize: '0.68rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '999px',
                  fontWeight: 800,
                  animation: 'pulse 2s infinite',
                }}>
                  {unseenActivityCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveModule('squads')}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-bobz)',
                fontSize: '0.94rem',
                fontWeight: activeModule === 'squads' ? 800 : 500,
                color: activeModule === 'squads' ? 'var(--color-black)' : '#6B7280',
                cursor: 'pointer',
                padding: '0.3rem 0',
                borderBottom: activeModule === 'squads' ? '2.5px solid var(--color-black)' : '2.5px solid transparent',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Users size={15} />
              <span>Squad PvP</span>
            </button>

            <button
              onClick={() => setActiveModule('security')}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-bobz)',
                fontSize: '0.94rem',
                fontWeight: activeModule === 'security' ? 800 : 500,
                color: activeModule === 'security' ? 'var(--color-black)' : '#6B7280',
                cursor: 'pointer',
                padding: '0.3rem 0',
                borderBottom: activeModule === 'security' ? '2.5px solid var(--color-black)' : '2.5px solid transparent',
                transition: 'all 0.2s ease',
              }}
            >
              Protocol
            </button>

            <button
              onClick={onOpenAnalytics}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-bobz)',
                fontSize: '0.94rem',
                fontWeight: 500,
                color: '#6B7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.2s ease',
                padding: '0.3rem 0',
                borderBottom: '2.5px solid transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-black)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
            >
              <BarChart3 size={14} />
              <span>Analytics</span>
              <ArrowUpRight size={12} />
            </button>
          </nav>
        </div>

        {/* Right: Network, Balances, Telegram Faucet, Create Action & Wallet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Create Market / Squad Trigger */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              backgroundColor: 'var(--color-black)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '24px',
              padding: '0.45rem 1rem',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-bobz)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
          >
            <PlusCircle size={14} />
            <span>Create Market</span>
          </button>

          {/* Real On-Chain Balances */}
          {userAddress && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#F3F4F6',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.06)',
                fontSize: '0.84rem',
              }}
            >
              <Coins size={14} color="var(--color-black)" />
              <span className="font-mono" style={{ fontWeight: 700 }}>
                ${userBalanceUSD.toFixed(2)} tUSDC
              </span>
              <span style={{ color: 'rgba(0,0,0,0.2)' }}>|</span>
              <span className="font-mono" style={{ color: '#4B5563' }}>
                {userGasSTT.toFixed(3)} STT
              </span>
            </div>
          )}

          {/* Official Telegram Faucet Link */}
          <a
            href={SOMNIA_CONFIG.faucetTelegram}
            target="_blank"
            rel="noreferrer"
            style={{
              backgroundColor: 'rgba(0, 200, 83, 0.08)',
              color: 'var(--color-green)',
              border: '1px solid rgba(0, 200, 83, 0.25)',
              borderRadius: '24px',
              padding: '0.42rem 0.95rem',
              fontSize: '0.80rem',
              fontFamily: 'var(--font-bobz)',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <ExternalLink size={12} />
            <span>Telegram Faucet</span>
          </a>

          {/* Network Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.80rem', color: '#6B7280' }} className="font-terminal">
            <span style={{ color: isCorrectNetwork ? 'var(--color-green)' : 'var(--color-red)' }}>●</span>
            <span>{isCorrectNetwork ? 'Somnia Shannon (50312)' : 'Wrong Network'}</span>
          </div>

          {/* Privy & Web3 Account Widget */}
          {authenticated || userAddress ? (
            <button
              onClick={() => setIsPrivyModalOpen(true)}
              className="wallet-connected-widget"
              style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
              title="Open Privy Identity & Wallet Hub"
            >
              <div className="wallet-chain-chip">
                <span style={{ color: 'var(--color-green)', fontSize: '0.72rem' }}>●</span>
                <span>{user?.email?.address ? user.email.address.split('@')[0] : 'Somnia Shannon'}</span>
              </div>
              <div className="wallet-account-pill">
                <span>{userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Wallet Hub'}</span>
              </div>
            </button>
          ) : (
            <button onClick={() => setIsConnectModalOpen(true)} className="btn-wallet-connect">
              <Wallet size={14} />
              <span>SIGN IN / CONNECT</span>
            </button>
          )}
        </div>
      </header>

      {/* Network Switch Warning Banner */}
      {userAddress && currentChainId !== null && currentChainId !== SOMNIA_CONFIG.chainId && (
        <div
          style={{
            backgroundColor: '#FFF3E0',
            borderBottom: '1px solid #FFE0B2',
            padding: '0.65rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            color: '#E65100',
            zIndex: 90,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            <span>
              <strong>Wrong Network Detected:</strong> You are currently connected to Chain ID {currentChainId}. Please switch to <strong>Somnia Shannon Testnet (Chain ID 50312)</strong> to interact with live Event Contracts.
            </span>
          </div>
          <button
            onClick={async () => {
              if (typeof window !== 'undefined' && (window as any).ethereum) {
                try {
                  await (window as any).ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: SOMNIA_CONFIG.chainIdHex }],
                  });
                } catch (switchError: any) {
                  if (switchError.code === 4902) {
                    await (window as any).ethereum.request({
                      method: 'wallet_addEthereumChain',
                      params: [
                        {
                          chainId: SOMNIA_CONFIG.chainIdHex,
                          chainName: 'Somnia Shannon Testnet',
                          nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
                          rpcUrls: [SOMNIA_CONFIG.rpcUrl],
                          blockExplorerUrls: [SOMNIA_CONFIG.explorerUrl],
                        },
                      ],
                    });
                  }
                }
              }
            }}
            className="btn-launch-black"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}
          >
            Switch to Somnia Shannon
          </button>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '4.5rem',
            right: '2rem',
            zIndex: 100,
            backgroundColor: 'var(--color-black-night)',
            color: 'var(--color-white)',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
            fontSize: '0.80rem',
            fontFamily: 'var(--font-subtext)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <Sparkles size={14} color="var(--color-green)" />
          <span>{notification}</span>
        </div>
      )}

      {/* Modal: Create Market / Squad Challenge */}
      <CreateMarketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccessCreated={(type, id) => {
          if (type === 'squad') {
            setSelectedChallengeId(id);
            setActiveModule('squads');
          } else {
            // Community market: navigate to community page to see it live
            setSelectedMarketId(id);
            setActiveModule('community');
          }
          setIsCreateModalOpen(false);
          setNotification(type === 'squad' ? 'Squad Challenge Created! Share the link.' : 'Community Market Published! Live on FLIP.');
          setTimeout(() => setNotification(null), 4000);
        }}
      />

      {/* Modal: Split-Screen Onboarding Connect Wallet Modal */}
      <ConnectWalletModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />

      {/* Modal: Privy Identity & Wallet Hub */}
      <PrivyAccountModal
        isOpen={isPrivyModalOpen}
        onClose={() => setIsPrivyModalOpen(false)}
      />

      {/* ========================================================================= */}
      {/* 2. MAIN BODY (Left Sidebar + Center Canvas)                              */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* LEFT LIGHT SIDEBAR (Matches Screenshot Sidebar) */}
        <aside
          style={{
            width: '260px',
            minWidth: '260px',
            backgroundColor: '#FFFFFF',
            borderRight: '1px solid rgba(0, 0, 0, 0.08)',
            padding: '2rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Section 1: STANDARD PREDICTION MARKETS */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div
                className="font-terminal"
                style={{
                  fontSize: '0.78rem',
                  color: '#9CA3AF',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                  paddingLeft: '0.5rem',
                  fontWeight: 700,
                }}
              >
                STANDARD MARKETS
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {markets.map((m) => {
                  const isSelected = selectedMarketId === m.marketId && activeModule === 'arena';
                  return (
                    <button
                      key={m.marketId}
                      onClick={() => {
                        setSelectedMarketId(m.marketId);
                        setActiveModule('arena');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: isSelected ? 'var(--color-grey-pill)' : 'transparent',
                        color: isSelected ? 'var(--color-black)' : '#4B5563',
                        fontFamily: 'var(--font-bobz)',
                        fontSize: '0.88rem',
                        fontWeight: isSelected ? 800 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#F3F4F6';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <Activity size={15} color={isSelected ? 'var(--color-black)' : '#9CA3AF'} />
                        <span>{m.underlyingAsset} / USD Strike</span>
                      </div>
                      <span className="font-terminal" style={{ fontSize: '0.76rem', color: isSelected ? 'var(--color-black)' : '#9CA3AF', fontWeight: 700 }}>
                        {formatPercent(m.bestUpProbability)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: COMMUNITY MARKETS → Sidebar Link */}
            <div style={{ marginBottom: '1.75rem' }}>
              <button
                onClick={() => setActiveModule('community')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '8px',
                  border: activeModule === 'community' ? '1px solid rgba(0,200,83,0.25)' : '1px solid rgba(0,0,0,0.04)',
                  backgroundColor: activeModule === 'community' ? 'rgba(0,200,83,0.06)' : 'transparent',
                  color: activeModule === 'community' ? 'var(--color-black)' : '#4B5563',
                  fontFamily: 'var(--font-bobz)',
                  fontSize: '0.88rem',
                  fontWeight: activeModule === 'community' ? 800 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { if (activeModule !== 'community') e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                onMouseLeave={(e) => { if (activeModule !== 'community') e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <Globe size={15} color={activeModule === 'community' ? 'var(--color-green)' : '#9CA3AF'} />
                  <span>Community Markets</span>
                </div>
                {userCreatedMarkets.length > 0 ? (
                  <span style={{ backgroundColor: 'rgba(0,200,83,0.12)', color: 'var(--color-green)', fontSize: '0.70rem', padding: '0.12rem 0.42rem', borderRadius: '4px', fontWeight: 800 }} className="font-terminal">
                    {userCreatedMarkets.length} LIVE
                  </span>
                ) : (
                  <PlusCircle size={13} color="#9CA3AF" />
                )}
              </button>
            </div>

            {/* Section 3: ACTIVITY & AUDIT */}
            <div style={{ marginBottom: '2rem' }}>
              <div
                className="font-terminal"
                style={{
                  fontSize: '0.78rem',
                  color: '#9CA3AF',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                  paddingLeft: '0.5rem',
                  fontWeight: 700,
                }}
              >
                ACCOUNT & ACTIVITY
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <button
                  onClick={() => {
                    setActiveModule('activity');
                    markActivityViewed();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: activeModule === 'activity' ? 'var(--color-grey-pill)' : 'transparent',
                    color: activeModule === 'activity' ? 'var(--color-black)' : '#4B5563',
                    fontFamily: 'var(--font-bobz)',
                    fontSize: '0.88rem',
                    fontWeight: activeModule === 'activity' ? 800 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (activeModule !== 'activity') e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    if (activeModule !== 'activity') e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <Layers size={16} />
                    <span>My Activity</span>
                  </div>
                  {/* Badge only shows for unseen/new bets — clears on visit */}
                  {unseenActivityCount > 0 && (
                    <span
                      style={{
                        backgroundColor: 'var(--color-green)',
                        color: '#000',
                        fontSize: '0.70rem',
                        padding: '0.12rem 0.42rem',
                        borderRadius: '999px',
                        fontWeight: 800,
                        animation: 'pulse 2s infinite',
                      }}
                      className="font-terminal"
                    >
                      {unseenActivityCount} new
                    </span>
                  )}
                </button>

                <button
                  onClick={onOpenAnalytics}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#4B5563',
                    fontFamily: 'var(--font-bobz)',
                    fontSize: '0.88rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <BarChart3 size={16} />
                    <span>Portfolio Analytics</span>
                  </div>
                  <ArrowUpRight size={13} color="#9CA3AF" />
                </button>
              </div>
            </div>

            {/* Section 3: PROTOCOL VERIFICATION */}
            <div>
              <div
                className="font-terminal"
                style={{
                  fontSize: '0.78rem',
                  color: '#9CA3AF',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                  paddingLeft: '0.5rem',
                  fontWeight: 700,
                }}
              >
                PROTOCOL VERIFICATION
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <button
                  onClick={() => setActiveModule('security')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: activeModule === 'security' ? 'var(--color-grey-pill)' : 'transparent',
                    color: activeModule === 'security' ? 'var(--color-black)' : '#4B5563',
                    fontFamily: 'var(--font-bobz)',
                    fontSize: '0.88rem',
                    fontWeight: activeModule === 'security' ? 800 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (activeModule !== 'security') e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    if (activeModule !== 'security') e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <ShieldCheck size={16} />
                  <span>On-Chain Specs</span>
                </button>

                <a
                  href="https://shannon-explorer.somnia.network"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '8px',
                    color: '#4B5563',
                    fontFamily: 'var(--font-bobz)',
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <ExternalLink size={16} />
                    <span>Shannon Explorer</span>
                  </div>
                  <ArrowUpRight size={13} color="#9CA3AF" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Sidebar: Return to Landing */}
          <div>
            <button
              onClick={onBackToLanding}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.9rem',
                borderRadius: '8px',
                backgroundColor: 'var(--color-grey-light)',
                border: '1px solid rgba(0,0,0,0.06)',
                color: 'var(--color-black)',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-bobz)',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E5E7EB')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-grey-light)')}
            >
              <ArrowLeft size={14} />
              <span>RETURN TO LANDING</span>
            </button>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* 3. CENTER CONTENT AREA (Matches Screenshot Layout with Tab Rise-In)       */}
        {/* ========================================================================= */}
        <main key={activeModule} className="tab-content-rise page-rise-in" style={{ flex: 1, padding: '2.5rem 3.5rem 4.5rem 3.5rem', maxWidth: '1280px' }}>
          {/* Breadcrumb & Top Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <button
              onClick={onBackToLanding}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--color-grey-light)',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '6px',
                padding: '0.38rem 0.85rem',
                fontSize: '0.84rem',
                fontFamily: 'var(--font-bobz)',
                fontWeight: 800,
                color: 'var(--color-black)',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={13} />
              <span>Back</span>
            </button>

            <div className="font-terminal" style={{ fontSize: '0.84rem', color: '#9CA3AF' }}>
              Somnia Shannon • {selectedMarket?.title || 'BTC 15-Minute Strike'}
            </div>
          </div>

          {/* Module Title & Editorial Subtext (Matches Screenshot) */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 className="font-bobz" style={{ fontSize: '1.85rem', color: 'var(--color-black)', margin: '0 0 0.5rem 0', letterSpacing: '-0.015em' }}>
              {activeModule === 'arena' && (selectedMarket?.title || 'BTC / USD 15-Minute Strike')}
              {activeModule === 'activity' && 'My Activity Ledger & Settlement Records'}
              {activeModule === 'community' && 'Community Prediction Markets'}
              {activeModule === 'security' && 'Somnia Shannon On-Chain Protocol Verification'}
              {activeModule === 'squads' && 'Private Squad Challenges (PvP)'}
            </h1>
            <p className="font-subtext" style={{ fontSize: '1.05rem', color: 'var(--color-grey-text)', margin: 0, maxWidth: '820px', lineHeight: 1.6 }}>
              {activeModule === 'arena' && (selectedMarket?.description || `Live binary event contract settling against real-time DreamDEX TWAP oracle ticks. Strike target is $${selectedMarket?.strikePrice.toLocaleString()}. If the asset price is at or above the strike when the candle closes, UP shares pay out exactly $1.00 USDso in USDC collateral.`)}
              {activeModule === 'activity' && 'Complete verifiable record of all your open and settled wagers across Standard Arenas, Community Markets, and Private Squads. Active bets can be cashed out early or claimed immediately upon resolution.'}
              {activeModule === 'community' && 'Decentralized prediction markets created by community members. Deploy custom strike parameters, seed initial parimutuel liquidity, and trade with zero platform custody.'}
              {activeModule === 'security' && 'Cryptographic transparency and non-custodial verification on Somnia Shannon Testnet. 400,000+ TPS parallel multi-stream consensus ensures zero front-running and deterministic TWAP resolution.'}
              {activeModule === 'squads' && 'Peer-to-peer prediction lobbies with friends. Features anti-herd blind ballot odds that stay sealed until round expiry to prevent copy-trading, shareable QR codes, and zero protocol fees.'}
            </p>
          </div>

          {/* Status Capsule (Matches Screenshot "Scanning protocols..." capsule) */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                backgroundColor: '#FFFFFF',
                border: '1px dashed rgba(0, 0, 0, 0.22)',
                borderRadius: '8px',
                padding: '0.45rem 1rem',
                fontSize: '0.85rem',
                color: 'var(--color-black)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
              className="font-terminal"
            >
              <RefreshCw size={14} className="animate-spin" color="var(--color-green)" />
              <span>Resolving in {timeRemaining} • Oracle Heartbeat: DreamDEX TWAP</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. MAIN CARDS CONTAINER (Wrinkled Deckled Paper Cards on Light Canvas)     */}
          {/* ========================================================================= */}
          {activeModule === 'arena' && (
            <div key="arena" className="module-enter" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2rem', alignItems: 'start' }}>
              {/* LEFT COLUMN: Real Market Chart + Round Mechanics + Settlement Invariants */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* 1. REAL INTERACTIVE MARKET CHART CARD */}
                <div className="card-paper" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.35rem' }}>
                        <span className="font-terminal" style={{ fontSize: '0.76rem', color: '#9CA3AF', letterSpacing: '0.04em' }}>
                          DreamDEX TWAP Oracle • {selectedMarket?.underlyingAsset}/USD
                        </span>
                        {selectedMarket?.change24h !== undefined && (
                          <span
                            style={{
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              color: selectedMarket.change24h >= 0 ? 'var(--color-green)' : 'var(--color-red)',
                              backgroundColor: selectedMarket.change24h >= 0 ? 'rgba(0,200,83,0.08)' : 'rgba(229,9,20,0.08)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                            }}
                            className="font-terminal"
                          >
                            {selectedMarket.change24h >= 0 ? `+${selectedMarket.change24h.toFixed(2)}%` : `${selectedMarket.change24h.toFixed(2)}%`}
                          </span>
                        )}
                      </div>
                      <div className="font-bobz" style={{ fontSize: '2.35rem', color: 'var(--color-black)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        ${selectedMarket?.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="font-terminal" style={{ fontSize: '0.80rem', color: '#9CA3AF', display: 'block', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                        TARGET STRIKE BARRIER
                      </span>
                      <div className="font-terminal" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-black)' }}>
                        ${selectedMarket?.strikePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Real Interactive Kline / Area Chart */}
                  {selectedMarket && <RealMarketChart market={selectedMarket} />}

                  {/* Dashed Paper Divider */}
                  <div className="divider-dashed" style={{ margin: '1.5rem 0 1rem 0' }} />

                  {/* Market Depth & Invariant Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', color: '#6B7280' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span className="font-subtext">Total Pool Liquidity:</span>
                      <span className="font-bobz" style={{ color: 'var(--color-black)', fontWeight: 800 }}>
                        ${selectedMarket?.totalVolumeUSD.toLocaleString()} USDso
                      </span>
                    </div>
                    <div className="font-terminal" style={{ fontSize: '0.82rem', color: 'var(--color-green)', fontWeight: 700 }}>
                      Invariant: P_UP + P_DOWN = $1.00
                    </div>
                  </div>
                </div>

                {/* 2. ROUND PROTOCOL MECHANICS & 5-PHASE LIFECYCLE CARD (Dark Sleek Style) */}
                <div
                  style={{
                    backgroundColor: '#0A0A0A',
                    color: 'var(--color-white)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(255, 255, 255, 0.16)',
                    padding: '2rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                        <span className="font-bobz" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF' }}>
                          ROUND #{Math.floor(Date.now() / 900000).toLocaleString()}
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            backgroundColor: 'rgba(0, 200, 83, 0.18)',
                            color: 'var(--color-green)',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(0, 200, 83, 0.3)',
                          }}
                          className="font-terminal"
                        >
                          OPEN FOR ENTRY
                        </span>
                      </div>
                      <p className="font-subtext" style={{ fontSize: '0.94rem', color: '#9CA3AF', margin: 0, maxWidth: '680px', lineHeight: 1.6 }}>
                        Collateral is held in non-custodial smart contract escrow. If the DreamDEX TWAP spot price at expiry is ≥ the target strike price (${selectedMarket?.strikePrice.toLocaleString()}), all UP shares redeem for $1.00 each. Otherwise, DOWN shares redeem for $1.00.
                      </p>
                    </div>
                  </div>

                  {/* 3 Metric Columns (POOL LIQUIDITY, ACTIVE POSITIONS, YOUR COMMITTED ENTRY) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', margin: '1.5rem 0' }}>
                    <div style={{ backgroundColor: '#141414', border: '1px dashed rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '1rem' }}>
                      <div className="font-terminal" style={{ fontSize: '0.76rem', color: '#9CA3AF', marginBottom: '0.35rem' }}>POOL LIQUIDITY (USDC)</div>
                      <div className="font-bobz" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF' }}>
                        ${selectedMarket?.totalLiquidityUSD ? selectedMarket.totalLiquidityUSD.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0'} USDso
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#141414', border: '1px dashed rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '1rem' }}>
                      <div className="font-terminal" style={{ fontSize: '0.76rem', color: '#9CA3AF', marginBottom: '0.35rem' }}>YOUR OPEN POSITIONS</div>
                      <div className="font-bobz" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF' }}>
                        {activePositions.length} {activePositions.length === 1 ? 'Wager' : 'Wagers'}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#141414', border: '1px dashed rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '1rem' }}>
                      <div className="font-terminal" style={{ fontSize: '0.76rem', color: '#9CA3AF', marginBottom: '0.35rem' }}>YOUR COMMITTED ENTRY</div>
                      <div className="font-bobz" style={{ fontSize: '1.35rem', fontWeight: 800, color: activePositions.length > 0 ? 'var(--color-green)' : '#FFFFFF' }}>
                        ${activePositions.reduce((sum, p) => sum + p.investedUSD, 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* 5-Phase Round Lifecycle Visual Stepper (Dark Sleek Stepper) */}
                  <div style={{ marginTop: '1.5rem' }}>
                    <div className="font-terminal" style={{ fontSize: '0.76rem', color: '#9CA3AF', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                      ROUND LIFECYCLE PROGRESSION
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      {[
                        { step: '1. Open', status: 'active', desc: 'Accepting Mints' },
                        { step: '2. Locked', status: 'pending', desc: 'Price Snapshot' },
                        { step: '3. Resolving', status: 'pending', desc: 'TWAP Compute' },
                        { step: '4. Settling', status: 'pending', desc: 'Pool Liquidation' },
                        { step: '5. Closed', status: 'pending', desc: 'Payouts Ready' },
                      ].map((phase, idx) => (
                        <div
                          key={phase.step}
                          style={{
                            backgroundColor: idx === 0 ? '#1F1F1F' : '#111111',
                            color: idx === 0 ? '#FFFFFF' : '#6B7280',
                            borderRadius: '6px',
                            padding: '0.65rem 0.5rem',
                            textAlign: 'center',
                            border: idx === 0 ? '1px solid rgba(0, 200, 83, 0.5)' : '1px dashed rgba(255, 255, 255, 0.08)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div className="font-bobz" style={{ fontSize: '0.82rem', fontWeight: 800, marginBottom: '0.2rem', color: idx === 0 ? 'var(--color-green)' : '#9CA3AF' }}>
                            {phase.step}
                          </div>
                          <div className="font-subtext" style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                            {phase.desc}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="font-subtext" style={{ fontSize: '0.84rem', color: '#9CA3AF', lineHeight: 1.5 }}>
                      Current round locks orders 30 seconds prior to epoch resolution to protect traders against oracle latency and sandwich attacks.
                    </div>
                  </div>
                </div>

                {/* 3. PARIMUTUEL SETTLEMENT MATHEMATICS CARD */}
                <div
                  style={{
                    backgroundColor: '#0A0A0A',
                    color: 'var(--color-white)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(255, 255, 255, 0.16)',
                    padding: '2rem',
                  }}
                >
                  <div className="font-bobz" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: '#FFFFFF' }}>
                    PROTOCOL SETTLEMENT & LIQUIDITY SPECIFICATIONS
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', fontSize: '0.88rem' }}>
                    <div style={{ backgroundColor: '#141414', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1.25rem' }}>
                      <div className="font-bobz" style={{ fontWeight: 800, marginBottom: '0.45rem', color: 'var(--color-green)', fontSize: '0.96rem' }}>
                        MARKET MAKING & ZERO SLIPPAGE
                      </div>
                      <p className="font-subtext" style={{ color: '#9CA3AF', margin: 0, lineHeight: 1.6 }}>
                        FLIP utilizes complete-set binary token minting. 1 UP + 1 DOWN is always fully backed by $1.00 USDso in smart contract reserves.
                      </p>
                    </div>

                    <div style={{ backgroundColor: '#141414', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1.25rem' }}>
                      <div className="font-bobz" style={{ fontWeight: 800, marginBottom: '0.45rem', color: '#38BDF8', fontSize: '0.96rem' }}>
                        INSTANT SOMNIA MULTISTREAM
                      </div>
                      <p className="font-subtext" style={{ color: '#9CA3AF', margin: 0, lineHeight: 1.6 }}>
                        Powered by Somnia Multistream parallel execution (400k+ TPS). Final settlement occurs within 100 milliseconds of epoch resolution.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. HOW THE ARENA OPERATES: TECHNICAL & TRADING GUIDE CARD */}
                <div
                  className="card-paper"
                  style={{
                    padding: '2rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.75rem' }}>
                    <ShieldCheck size={18} color="var(--color-green)" />
                    <h3 className="font-bobz" style={{ margin: 0, fontSize: '1.2rem' }}>
                      How This Market Operates: Technical &amp; Trading Guide
                    </h3>
                  </div>
                  <p className="font-subtext" style={{ fontSize: '0.88rem', color: 'var(--color-grey-text)', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
                    FLIP uses high-frequency binary event contracts designed for complete mathematical parity. Here is what happens from trade entry to final resolution:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: '#FAFAFA', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="font-bobz" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-black)', marginBottom: '0.35rem' }}>
                        1. Strike Barrier Target
                      </div>
                      <p className="font-subtext" style={{ fontSize: '0.80rem', color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
                        The market sets a target strike price (${selectedMarket?.strikePrice.toLocaleString()}). If the live price is at or above this target at candle close, UP wins; otherwise DOWN wins.
                      </p>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: '#FAFAFA', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="font-bobz" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-black)', marginBottom: '0.35rem' }}>
                        2. $1.00 Parimutuel Parity
                      </div>
                      <p className="font-subtext" style={{ fontSize: '0.80rem', color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
                        Every share purchased is backed by $1.00 in USDC collateral. Share prices fluctuate between $0.01 and $0.99 based on live market probability.
                      </p>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: '#FAFAFA', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="font-bobz" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-black)', marginBottom: '0.35rem' }}>
                        3. DreamDEX TWAP Oracles
                      </div>
                      <p className="font-subtext" style={{ fontSize: '0.80rem', color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
                        Resolutions are calculated against time-weighted average prices directly on Somnia, preventing flash crashes or single-exchange manipulation.
                      </p>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: '#FAFAFA', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="font-bobz" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-black)', marginBottom: '0.35rem' }}>
                        4. Non-Custodial Payouts
                      </div>
                      <p className="font-subtext" style={{ fontSize: '0.80rem', color: '#6B7280', margin: 0, lineHeight: 1.55 }}>
                        Smart contracts automatically disburse winning payouts ($1.00 per share) directly to your wallet escrow upon epoch resolution.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Order Deck + On-Chain Verification Widget */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* 4. ORDER EXECUTION DECK */}
                <div className="card-paper" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.35rem' }}>
                    <span className="font-bobz" style={{ fontSize: '1.15rem', fontWeight: 800 }}>ORDER EXECUTION</span>
                    <span className="font-terminal" style={{ fontSize: '0.78rem', color: 'var(--color-green)', fontWeight: 700 }}>
                      ● ZERO SLIPPAGE
                    </span>
                  </div>

                  {/* UP / DOWN Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.5rem' }}>
                    <button
                      onClick={() => setSelectedSide('UP')}
                      style={{
                        padding: '1rem 0.65rem',
                        borderRadius: '8px',
                        border: selectedSide === 'UP' ? '2px solid var(--color-green)' : '1px dashed rgba(0,0,0,0.20)',
                        backgroundColor: selectedSide === 'UP' ? 'var(--color-green)' : '#FFFFFF',
                        color: selectedSide === 'UP' ? '#000000' : '#000000',
                        fontFamily: 'var(--font-bobz)',
                        fontSize: '0.96rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <TrendingUp size={18} />
                        <span>FLIP UP</span>
                      </div>
                      <span className="font-terminal" style={{ fontSize: '0.84rem' }}>
                        {((selectedMarket?.bestUpProbability || 0.62) * 100).toFixed(0)}¢ Share
                      </span>
                    </button>

                    <button
                      onClick={() => setSelectedSide('DOWN')}
                      style={{
                        padding: '1rem 0.65rem',
                        borderRadius: '8px',
                        border: selectedSide === 'DOWN' ? '2px solid var(--color-red)' : '1px dashed rgba(0,0,0,0.20)',
                        backgroundColor: selectedSide === 'DOWN' ? 'var(--color-red)' : '#FFFFFF',
                        color: selectedSide === 'DOWN' ? '#FFFFFF' : '#000000',
                        fontFamily: 'var(--font-bobz)',
                        fontSize: '0.96rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <TrendingDown size={18} />
                        <span>FLIP DOWN</span>
                      </div>
                      <span className="font-terminal" style={{ fontSize: '0.84rem' }}>
                        {((selectedMarket?.bestDownProbability || 0.38) * 100).toFixed(0)}¢ Share
                      </span>
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div style={{ marginBottom: '1.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem', fontSize: '0.85rem' }}>
                      <span className="font-subtext" style={{ color: '#6B7280' }}>Wager Collateral (USDso)</span>
                      <span className="font-terminal" style={{ color: '#6B7280', fontWeight: 600 }}>Avail: ${userBalanceUSD.toFixed(2)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: '8px', padding: '0.65rem 1rem', marginBottom: '0.65rem', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <span className="font-bobz" style={{ fontWeight: 800, fontSize: '1.25rem', marginRight: '0.45rem' }}>$</span>
                      <input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                        className="font-bobz"
                        style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-black)' }}
                      />
                    </div>

                    {/* Presets */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem' }}>
                      {[10, 25, 50, 100].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setBetAmount(amt)}
                          className="font-bobz"
                          style={{
                            padding: '0.45rem',
                            borderRadius: '6px',
                            border: betAmount === amt ? '1px solid var(--color-black)' : '1px solid rgba(0,0,0,0.08)',
                            backgroundColor: betAmount === amt ? 'var(--color-black)' : '#FFFFFF',
                            color: betAmount === amt ? '#FFFFFF' : 'var(--color-black)',
                            fontSize: '0.84rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculations Box */}
                  <div style={{ backgroundColor: '#F9FAFB', padding: '1.15rem', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '1.5rem', border: '1px dashed rgba(0,0,0,0.12)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                      <span className="font-subtext" style={{ color: '#6B7280' }}>Shares Minted:</span>
                      <span className="font-terminal" style={{ fontWeight: 700 }}>{estimatedContracts.toFixed(2)} Shares</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                      <span className="font-subtext" style={{ color: '#6B7280' }}>Potential Payout:</span>
                      <span className="font-bobz" style={{ color: 'var(--color-green)', fontSize: '1.05rem', fontWeight: 800 }}>${potentialPayout.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(0,0,0,0.08)', paddingTop: '0.45rem' }}>
                      <span className="font-subtext" style={{ color: '#6B7280' }}>Expected Return:</span>
                      <span className="font-bobz" style={{ color: 'var(--color-green)', fontSize: '1.05rem', fontWeight: 800 }}>+{roiPercent.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Execute Button */}
                  <button
                    onClick={handleTrade}
                    disabled={isExecuting}
                    className="btn-launch-black"
                    style={{
                      width: '100%',
                      padding: '0.95rem',
                      borderRadius: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.92rem',
                    }}
                  >
                    {isExecuting ? (
                      <span>Confirming on Somnia...</span>
                    ) : (
                      <span>MINT {selectedSide} SHARES (${betAmount})</span>
                    )}
                  </button>
                </div>

                {/* 5. ON-CHAIN SPECS & CONTRACT PROOF (Dark Sleek Style Matching Screenshot) */}
                <div
                  style={{
                    backgroundColor: '#0A0A0A',
                    color: 'var(--color-white)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(255, 255, 255, 0.16)',
                    padding: '1.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span className="font-bobz" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>ESCROW SPECIFICATIONS</span>
                    <span className="font-terminal" style={{ fontSize: '0.74rem', color: 'var(--color-green)', fontWeight: 700 }}>● VERIFIED</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.84rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                      <span className="font-subtext" style={{ color: '#9CA3AF' }}>Collateral Token</span>
                      <span className="font-terminal" style={{ fontWeight: 700, color: '#FFFFFF' }}>USDso (Somnia USD)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                      <span className="font-subtext" style={{ color: '#9CA3AF' }}>Oracle Source</span>
                      <span className="font-bobz" style={{ fontWeight: 800, color: '#FFFFFF' }}>DreamDEX / Pyth TWAP</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                      <span className="font-subtext" style={{ color: '#9CA3AF' }}>Gas Overhead</span>
                      <span className="font-terminal" style={{ color: 'var(--color-green)', fontWeight: 700 }}>&lt; $0.0001 STT</span>
                    </div>
                  </div>

                  {/* Wide Router Action Pill */}
                  <div
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px dashed rgba(255, 255, 255, 0.14)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.6rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--color-green)', flexShrink: 0 }}></span>
                      <span className="font-terminal" style={{ fontSize: '0.76rem', color: '#D1D5DB', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        Router: <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{SOMNIA_CONFIG.collateralRouter.slice(0, 6)}...{SOMNIA_CONFIG.collateralRouter.slice(-4)}</span>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={copyAddress}
                        style={{
                          backgroundColor: 'transparent',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          borderRadius: '20px',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-bobz)',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Copy size={11} />
                        <span>{copiedContract ? 'COPIED' : 'COPY'}</span>
                      </button>

                      <a
                        href="https://shannon-explorer.somnia.network"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          backgroundColor: '#FFFFFF',
                          color: '#000000',
                          border: 'none',
                          borderRadius: '20px',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-bobz)',
                          fontWeight: 800,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <span>SOMNIASCAN</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. UNIFIED ACTIVITY & BETS LEDGER (Standard, Community & Squad PvP)      */}
          {/* ========================================================================= */}
          {activeModule === 'activity' && (
            <div
              key="activity"
              className="card-paper module-enter"
              style={{
                padding: '2rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 className="font-bobz" style={{ fontSize: '1.45rem', margin: '0 0 0.25rem 0' }}>
                    Activity &amp; Positions ({userAddress ? filteredActivityPositions.length : 0})
                  </h2>
                  <span className="font-terminal" style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                    Track all your wagers across Standard Protocols, Community Markets &amp; Squad PvP
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {positions.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Clear local activity ledger records?')) {
                          clearPositions();
                        }
                      }}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(0,0,0,0.12)',
                        backgroundColor: '#FFFFFF',
                        color: '#6B7280',
                        fontSize: '0.74rem',
                        fontFamily: 'var(--font-terminal)',
                        cursor: 'pointer',
                      }}
                    >
                      CLEAR LEDGER
                    </button>
                  )}

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', backgroundColor: '#F3F4F6', padding: '0.3rem', borderRadius: '24px' }}>
                    {(['all', 'standard', 'community', 'squad'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActivityFilter(tab)}
                        style={{
                          padding: '0.35rem 0.85rem',
                          borderRadius: '20px',
                          border: 'none',
                          backgroundColor: activityFilter === tab ? '#000000' : 'transparent',
                          color: activityFilter === tab ? '#FFFFFF' : '#4B5563',
                          fontFamily: 'var(--font-bobz)',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {tab === 'all' ? 'All Bets' : tab === 'standard' ? 'Standard' : tab === 'community' ? 'Community' : 'Squad PvP'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Educational Ledger Guide */}
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '10px',
                  border: '1px solid rgba(0,0,0,0.06)',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.90rem', color: 'var(--color-black)', marginBottom: '0.35rem' }}>
                  <ShieldCheck size={16} color="var(--color-green)" />
                  <span>How Your Activity &amp; Payouts Operate</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.55 }}>
                  Active wagers lock collateral in decentralized Somnia smart contracts. You can <strong>Cash Out</strong> before epoch expiration or wait for TWAP resolution to <strong>Claim Payout</strong> ($1.00 USDso per winning share). All settlement transactions are permanently logged on SomniaScan.
                </div>
              </div>

              {!userAddress ? (
                <div style={{ padding: '4.5rem 1rem', textAlign: 'center', color: '#6B7280' }}>
                  <Wallet size={36} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
                  <p className="font-bobz" style={{ fontSize: '1.25rem', margin: '0 0 0.4rem 0', color: '#1A1816' }}>
                    Connect Wallet to View Activity
                  </p>
                  <p className="font-subtext" style={{ fontSize: '0.92rem', margin: '0 0 1.5rem 0', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                    All prediction contracts and settlement records are cryptographically bound to your connected Somnia wallet address. Please connect your wallet to view your active and historical flips.
                  </p>
                  <button
                    onClick={() => setIsConnectModalOpen(true)}
                    className="btn-launch-black"
                    style={{ padding: '0.7rem 1.6rem', fontSize: '0.88rem', margin: '0 auto' }}
                  >
                    <span>Connect Wallet</span>
                  </button>
                </div>
              ) : filteredActivityPositions.length === 0 ? (
                <div style={{ padding: '4rem 1rem', textAlign: 'center', color: '#6B7280' }}>
                  <Layers size={32} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                  <p className="font-bobz" style={{ fontSize: '1.1rem', margin: '0 0 0.35rem 0', color: '#1A1816' }}>
                    No activity found for this wallet
                  </p>
                  <p className="font-subtext" style={{ fontSize: '0.88rem', margin: 0 }}>
                    Switch to the Trading Arena or join a Squad Challenge to place your prediction.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px dashed rgba(0,0,0,0.12)', textAlign: 'left', color: '#6B7280' }}>
                        <th style={{ padding: '0.75rem', fontFamily: 'var(--font-bobz)' }}>CATEGORY</th>
                        <th style={{ padding: '0.75rem', fontFamily: 'var(--font-bobz)' }}>EVENT MARKET</th>
                        <th style={{ padding: '0.75rem', fontFamily: 'var(--font-bobz)' }}>SIDE</th>
                        <th style={{ padding: '0.75rem', fontFamily: 'var(--font-bobz)' }}>INVESTED</th>
                        <th style={{ padding: '0.75rem', fontFamily: 'var(--font-bobz)' }}>SHARES / PAYOUT</th>
                        <th style={{ padding: '0.75rem', fontFamily: 'var(--font-bobz)' }}>STATUS</th>
                        <th style={{ padding: '0.75rem', fontFamily: 'var(--font-bobz)' }}>ON-CHAIN TX</th>
                        <th style={{ padding: '0.75rem', fontFamily: 'var(--font-bobz)', textAlign: 'right' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivityPositions.map((pos) => {
                        const isSquad = pos.marketCategory === 'squad';
                        const isCommunity = pos.marketCategory === 'community';
                        const isStandard = !pos.marketCategory || pos.marketCategory === 'standard';

                        return (
                          <tr key={pos.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                            {/* Category Badge */}
                            <td style={{ padding: '0.85rem 0.75rem' }}>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontFamily: "'Space Mono', monospace",
                                  backgroundColor: isSquad
                                    ? 'rgba(168, 85, 247, 0.12)'
                                    : isCommunity
                                    ? 'rgba(0, 200, 83, 0.12)'
                                    : 'rgba(59, 130, 246, 0.12)',
                                  color: isSquad ? '#9333EA' : isCommunity ? 'var(--color-green)' : '#2563EB',
                                }}
                              >
                                {isSquad ? 'SQUAD PvP' : isCommunity ? 'COMMUNITY' : 'STANDARD'}
                              </span>
                            </td>

                            {/* Market Title */}
                            <td className="font-bobz" style={{ padding: '0.85rem 0.75rem', fontWeight: 700 }}>
                              {pos.marketTitle}
                            </td>

                            {/* Side */}
                            <td style={{ padding: '0.85rem 0.75rem' }}>
                              <span
                                style={{
                                  color: pos.side === 'UP' ? 'var(--color-green)' : 'var(--color-red)',
                                  fontWeight: 800,
                                  fontFamily: 'var(--font-bobz)',
                                }}
                              >
                                {pos.side}
                              </span>
                            </td>

                            {/* Invested */}
                            <td className="font-terminal" style={{ padding: '0.85rem 0.75rem', fontWeight: 700 }}>
                              ${pos.investedUSD.toFixed(2)}
                            </td>

                            {/* Payout */}
                            <td style={{ padding: '0.85rem 0.75rem' }}>
                              <div className="font-terminal" style={{ color: 'var(--color-green)', fontWeight: 800 }}>
                                ${pos.potentialPayoutUSD.toFixed(2)}
                              </div>
                              <div className="font-subtext" style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>
                                {pos.contractsCount.toFixed(1)} shares ({pos.potentialMultiplier.toFixed(2)}x)
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '0.85rem 0.75rem' }}>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontFamily: "'Space Mono', monospace",
                                  backgroundColor:
                                    pos.status === 'ACTIVE'
                                      ? 'rgba(56, 189, 248, 0.12)'
                                      : pos.status === 'WON'
                                      ? 'rgba(0, 255, 102, 0.12)'
                                      : pos.status === 'CASHED_OUT'
                                      ? 'rgba(156, 163, 175, 0.15)'
                                      : 'rgba(255, 59, 105, 0.12)',
                                  color:
                                    pos.status === 'ACTIVE'
                                      ? '#0284C7'
                                      : pos.status === 'WON'
                                      ? '#059669'
                                      : pos.status === 'CASHED_OUT'
                                      ? '#4B5563'
                                      : '#DC2626',
                                }}
                              >
                                {pos.status === 'ACTIVE'
                                  ? '● ACTIVE IN ROUND'
                                  : pos.status === 'WON'
                                  ? '✓ WON (CLAIMABLE)'
                                  : pos.status === 'CASHED_OUT'
                                  ? '✓ CLAIMED'
                                  : '✕ LOST'}
                              </span>
                            </td>

                            {/* On-Chain TX */}
                            <td style={{ padding: '0.85rem 0.75rem' }}>
                              {pos.txHash ? (
                                <a
                                  href={`https://shannon-explorer.somnia.network/tx/${pos.txHash}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    color: '#1A1816',
                                    textDecoration: 'none',
                                    fontSize: '0.74rem',
                                    fontFamily: 'var(--font-terminal)',
                                    backgroundColor: '#F3F4F6',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(0,0,0,0.06)',
                                  }}
                                >
                                  <span>{pos.txHash.slice(0, 6)}...{pos.txHash.slice(-4)}</span>
                                  <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span className="font-terminal" style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>On-Chain</span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                              {pos.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => handleCashOutWithConfetti(pos.id)}
                                  className="btn-launch-black"
                                  style={{ padding: '0.38rem 0.85rem', fontSize: '0.74rem' }}
                                >
                                  <span>CASH OUT</span>
                                </button>
                              ) : pos.status === 'WON' ? (
                                <button
                                  onClick={() => handleCashOutWithConfetti(pos.id)}
                                  style={{
                                    backgroundColor: 'var(--color-green)',
                                    color: '#000000',
                                    border: 'none',
                                    borderRadius: '20px',
                                    padding: '0.38rem 0.85rem',
                                    fontSize: '0.74rem',
                                    fontFamily: 'var(--font-bobz)',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <span>CLAIM PAYOUT</span>
                                </button>
                              ) : (
                                <span className="font-terminal" style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>
                                  Settled
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. COMMUNITY MARKETS BROWSE PAGE                                         */}
          {/* ========================================================================= */}
          {activeModule === 'community' && (
            <div key="community" className="module-enter" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Header Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  padding: '2rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.4rem' }}>
                    <Globe size={20} color="var(--color-green)" />
                    <h2 className="font-bobz" style={{ margin: 0, fontSize: '1.65rem' }}>
                      Community Markets
                    </h2>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(0,200,83,0.10)',
                        color: 'var(--color-green)',
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      PUBLIC
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.94rem', color: 'var(--color-grey-text)' }}>
                    Prediction markets created by FLIP users. Anyone can pick a side and mint shares — all settled on-chain via Somnia Shannon smart contracts.
                  </p>
                </div>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn-launch-black"
                  style={{ padding: '0.75rem 1.4rem', gap: '0.5rem', fontSize: '0.88rem' }}
                >
                  <PlusCircle size={16} />
                  <span>Create Community Market</span>
                </button>
              </div>

              {/* Market Cards */}
              {userCreatedMarkets.length === 0 ? (
                <div
                  style={{
                    padding: '5rem 2rem',
                    textAlign: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px dashed rgba(0,0,0,0.1)',
                  }}
                >
                  <Globe size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.25 }} />
                  <p className="font-bobz" style={{ fontSize: '1.25rem', margin: '0 0 0.4rem 0' }}>
                    No Community Markets Yet
                  </p>
                  <p className="font-subtext" style={{ fontSize: '0.92rem', color: '#6B7280', margin: '0 0 1.5rem 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                    Be the first to deploy a public prediction market on Somnia Shannon. Any asset, any question.
                  </p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="btn-launch-black"
                    style={{ padding: '0.7rem 1.5rem', fontSize: '0.88rem', margin: '0 auto' }}
                  >
                    <PlusCircle size={15} />
                    <span>Deploy First Market</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                  {userCreatedMarkets.map((m) => {
                    const upOdds = Math.round((m.bestUpProbability || 0.5) * 100);
                    const downOdds = 100 - upOdds;
                    return (
                      <div
                        key={m.marketId}
                        className="card-paper"
                        style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}
                      >
                        {/* Card Header */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                color: 'var(--color-green)',
                                backgroundColor: 'rgba(0,200,83,0.08)',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '4px',
                              }}
                              className="font-terminal"
                            >
                              {m.underlyingAsset} / USD
                            </span>
                            <span className="font-terminal" style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                              COMMUNITY
                            </span>
                          </div>

                          <h3 className="font-bobz" style={{ margin: '0 0 0.65rem 0', fontSize: '1.25rem', lineHeight: 1.3 }}>
                            {m.title}
                          </h3>
                          <p className="font-subtext" style={{ margin: '0 0 1rem 0', fontSize: '0.84rem', color: '#6B7280', lineHeight: 1.5 }}>
                            {m.description?.slice(0, 100)}{m.description && m.description.length > 100 ? '...' : ''}
                          </p>

                          {/* Odds bar */}
                          <div style={{ marginBottom: '0.6rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: '0.4rem' }}>
                              <span style={{ color: 'var(--color-green)', fontWeight: 700 }} className="font-terminal">UP {upOdds}%</span>
                              <span style={{ color: '#6B7280' }} className="font-terminal">Strike ${m.strikePrice?.toLocaleString()}</span>
                              <span style={{ color: 'var(--color-red)', fontWeight: 700 }} className="font-terminal">DOWN {downOdds}%</span>
                            </div>
                            <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${upOdds}%`,
                                  background: 'linear-gradient(90deg, #00C853, #69F0AE)',
                                  borderRadius: '3px',
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </div>
                          </div>

                          {/* Pool size */}
                          <div className="font-terminal" style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>
                            Volume: <strong style={{ color: '#374151' }}>${m.totalVolumeUSD.toFixed(2)} tUSDC</strong>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button
                            onClick={() => {
                              setSelectedMarketId(m.marketId);
                              setActiveModule('arena');
                            }}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: 'var(--color-green)',
                              color: '#000',
                              fontFamily: 'var(--font-bobz)',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem',
                              transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                          >
                            <TrendingUp size={15} />
                            <span>Trade</span>
                          </button>
                          <a
                            href={`https://shannon-explorer.somnia.network/address/${m.poolAddress || ''}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              border: '1px solid rgba(0,0,0,0.10)',
                              backgroundColor: '#F9FAFB',
                              color: '#4B5563',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              textDecoration: 'none',
                              fontSize: '0.80rem',
                              fontFamily: 'var(--font-terminal)',
                              fontWeight: 700,
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                          >
                            <ExternalLink size={13} />
                            <span>Explorer</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. PRIVATE SQUAD CHALLENGES (PvP Matchmaking & Invite Joiner)              */}
          {/* ========================================================================= */}
          {activeModule === 'squads' && (
            <div key="squads" className="module-enter">
              {selectedChallengeId ? (
                (() => {
                  const challenge = privateChallenges.find((c) => c.id === selectedChallengeId) || privateChallenges[0];
                  return challenge ? (
                    <PrivateChallengeView
                      challenge={challenge}
                      onBack={() => setSelectedChallengeId(null)}
                      onOpenCreate={() => setIsCreateModalOpen(true)}
                    />
                  ) : (
                    <div>Challenge not found.</div>
                  );
                })()
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* Squad Header with Private Invite Notice */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#FFFFFF',
                      padding: '2rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      flexWrap: 'wrap',
                      gap: '1.25rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <h2 className="font-bobz" style={{ margin: 0, fontSize: '1.65rem' }}>
                          Private Squad Challenges (PvP)
                        </h2>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(168, 85, 247, 0.12)',
                            color: '#9333EA',
                            fontFamily: "'Space Mono', monospace",
                          }}
                        >
                          INVITE-ONLY
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.94rem', color: 'var(--color-grey-text)' }}>
                        Squad challenges are private rooms between friends. Share your invite link or paste a room code below to battle on-chain.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="btn-launch-black"
                      style={{ padding: '0.75rem 1.4rem', gap: '0.5rem', fontSize: '0.88rem' }}
                    >
                      <PlusCircle size={16} />
                      <span>Create Private Squad</span>
                    </button>
                  </div>

                  {/* Quick Join Room Input Bar */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      padding: '1.25rem 1.5rem',
                      borderRadius: '12px',
                      border: '1px dashed rgba(0,0,0,0.14)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                    }}
                  >
                    <div style={{ fontSize: '0.80rem', color: '#6B7280', fontFamily: 'var(--font-subtext)' }}>
                      Paste the invite link or room code your friend shared with you:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '260px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.6rem 0.85rem', backgroundColor: '#F9FAFB' }}>
                        <Users size={16} color="#9CA3AF" />
                        <input
                          type="text"
                          id="squad-room-input"
                          placeholder="https://flip.somnia.network/?challenge=squad-btc-... or just the ID"
                          value={joinRoomInput}
                          onChange={(e) => setJoinRoomInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const trimmed = joinRoomInput.trim();
                              if (!trimmed) return;
                              // Parse any URL or bare ID format
                              let challengeId = trimmed;
                              try {
                                // If it looks like a URL, parse it
                                if (trimmed.startsWith('http') || trimmed.includes('?')) {
                                  const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://x.com/${trimmed}`);
                                  challengeId = parsed.searchParams.get('challenge') || parsed.searchParams.get('id') || trimmed;
                                }
                              } catch {
                                // Not a URL — use as-is (bare ID)
                              }
                              setSelectedChallengeId(challengeId.trim());
                              setJoinRoomInput('');
                            }
                          }}
                          className="font-terminal"
                          style={{
                            width: '100%',
                            border: 'none',
                            outline: 'none',
                            fontSize: '0.85rem',
                            color: '#1A1816',
                            background: 'transparent',
                          }}
                        />
                      </div>

                      <button
                        onClick={() => {
                          const trimmed = joinRoomInput.trim();
                          if (!trimmed) return;
                          // Robust URL parser — handles ?challenge=, ?id=, bare IDs, full https URLs
                          let challengeId = trimmed;
                          try {
                            if (trimmed.startsWith('http') || trimmed.includes('?challenge=') || trimmed.includes('?id=')) {
                              const urlToParse = trimmed.startsWith('http') ? trimmed : `https://placeholder.com/${trimmed}`;
                              const parsed = new URL(urlToParse);
                              challengeId = parsed.searchParams.get('challenge') || parsed.searchParams.get('id') || trimmed;
                            }
                          } catch {
                            // Not a URL — treat the whole input as an ID
                          }
                          const id = challengeId.trim();
                          const found = privateChallenges.find((c) => c.id === id);
                          setSelectedChallengeId(found ? found.id : id);
                          setJoinRoomInput('');
                        }}
                        className="btn-launch-black"
                        style={{ padding: '0.6rem 1.35rem', fontSize: '0.84rem', whiteSpace: 'nowrap' }}
                      >
                        <span>OPEN ROOM</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'var(--font-terminal)' }}>
                      TIP: You can also just click the invite link your friend sent — it will open FLIP and load the room automatically.
                    </div>
                  </div>

                  {/* Challenge Cards Grid */}
                  {privateChallenges.length === 0 ? (
                    <div
                      style={{
                        padding: '3.5rem 1rem',
                        textAlign: 'center',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px dashed rgba(0,0,0,0.1)',
                      }}
                    >
                      <Users size={32} style={{ margin: '0 auto 0.75rem auto', opacity: 0.3 }} />
                      <p className="font-bobz" style={{ fontSize: '1.15rem', margin: '0 0 0.35rem 0' }}>
                        No Private Squad Challenges Active
                      </p>
                      <p className="font-subtext" style={{ fontSize: '0.88rem', color: '#6B7280', margin: '0 0 1.25rem 0' }}>
                        Create a private lobby for your group or paste an invite room code above.
                      </p>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-launch-black"
                        style={{ padding: '0.6rem 1.25rem', fontSize: '0.82rem', margin: '0 auto' }}
                      >
                        <PlusCircle size={14} />
                        <span>Create Squad Challenge</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                      {privateChallenges.map((c) => {
                        const isFull = c.participants.length >= c.maxParticipants;
                        const isExpired = Date.now() >= c.expiryTimestampMs;
                        return (
                          <div
                            key={c.id}
                            className="card-paper"
                            style={{
                              padding: '1.75rem',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '1.25rem',
                            }}
                          >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <span
                                style={{
                                  fontSize: '0.80rem',
                                  fontWeight: 700,
                                  color: 'var(--color-green)',
                                  backgroundColor: 'rgba(0,194,120,0.08)',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '4px',
                                }}
                              >
                                {c.underlyingAsset} / USD
                              </span>
                              <span className="font-mono" style={{ fontSize: '0.80rem', color: 'var(--color-grey-muted)' }}>
                                {isExpired ? 'EXPIRED' : `${Math.max(0, Math.round((c.expiryTimestampMs - Date.now()) / 60000))}m left`}
                              </span>
                            </div>

                            <h3 className="font-bobz" style={{ margin: '0 0 0.65rem 0', fontSize: '1.35rem' }}>
                              {c.title}
                            </h3>

                            <div style={{ fontSize: '0.90rem', color: 'var(--color-grey-text)', marginBottom: '1rem' }}>
                              Strike Target: <strong>${c.strikePrice.toLocaleString()}</strong> · Entry: <strong>${c.entryFeeUSD} tUSDC</strong>
                            </div>

                            {/* Pot & Players Progress */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.84rem',
                                padding: '0.85rem 1rem',
                                backgroundColor: '#F9FAFB',
                                borderRadius: '8px',
                              }}
                            >
                              <div>
                                <div style={{ color: '#9CA3AF' }}>Squad Pot</div>
                                <div className="font-mono" style={{ fontWeight: 800, color: 'var(--color-black)', fontSize: '1.05rem' }}>
                                  ${c.totalPotUSD} tUSDC
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#9CA3AF' }}>Squad Capacity</div>
                                <div className="font-mono" style={{ fontWeight: 800, color: isFull ? 'var(--color-red)' : 'var(--color-green)', fontSize: '1.05rem' }}>
                                  {c.participants.length} / {c.maxParticipants} Players
                                </div>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedChallengeId(c.id)}
                            className="btn-launch-black"
                            style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.88rem' }}
                          >
                            <span>Enter Squad Room & QR</span>
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

          {/* Protocol Security View */}
          {activeModule === 'security' && (
            <div
              key="security"
              className="card-paper module-enter"
              style={{
                padding: '2rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span className="font-bobz" style={{ fontSize: '1.25rem' }}>PROTOCOL ARCHITECTURE & VERIFICATION</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-green)', fontWeight: 700 }} className="font-terminal">
                  ● Verified on Shannon (50312)
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(0,0,0,0.08)', paddingBottom: '0.65rem' }}>
                  <span className="font-subtext" style={{ color: '#6B7280' }}>Execution Engine</span>
                  <span className="font-bobz" style={{ fontWeight: 800 }}>Somnia MultiStream (400,000+ TPS)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(0,0,0,0.08)', paddingBottom: '0.65rem' }}>
                  <span className="font-subtext" style={{ color: '#6B7280' }}>Collateral Standard</span>
                  <span className="font-terminal" style={{ fontWeight: 700, color: 'var(--color-green)' }}>tUSDC (6 Decimals) · Shannon Testnet</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(0,0,0,0.08)', paddingBottom: '0.65rem' }}>
                  <span className="font-subtext" style={{ color: '#6B7280' }}>Oracle Coprocessor</span>
                  <span className="font-bobz" style={{ fontWeight: 800 }}>DreamDEX High-Frequency TWAP / Pyth</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(0,0,0,0.08)', paddingBottom: '0.65rem' }}>
                  <span className="font-subtext" style={{ color: '#6B7280' }}>Settlement Escrow</span>
                  <span className="font-terminal" style={{ color: 'var(--color-green)', fontWeight: 700 }}>100% Non-Custodial EVM</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(0,0,0,0.08)', paddingBottom: '0.65rem' }}>
                  <span className="font-subtext" style={{ color: '#6B7280' }}>Router Contract</span>
                  <span className="font-terminal" style={{ color: '#2563EB', cursor: 'pointer' }} onClick={copyAddress}>
                    {SOMNIA_CONFIG.collateralRouter} {copiedContract ? '✓' : ''}
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: '#F9FAFB', padding: '1.15rem', borderRadius: '8px', fontSize: '0.86rem', color: '#4B5563', lineHeight: 1.6, border: '1px dashed rgba(0,0,0,0.08)' }} className="font-subtext">
                FLIP smart contracts operate deterministically over on-chain cryptographic state ticks. No central operator holds custody of collateral. All winning payouts are distributed automatically in tUSDC upon epoch resolution.
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 4. FOOTER (Matches Screenshot Footer)                                     */}
      {/* ========================================================================= */}
      <footer
        style={{
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          padding: '2.5rem 1.5rem 2rem 1.5rem',
          backgroundColor: '#FFFFFF',
          textAlign: 'center',
          marginTop: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <span className="font-bobz" style={{ fontSize: '0.98rem', fontWeight: 800 }}>FLIP Protocol</span>
          <span
            style={{
              fontSize: '0.72rem',
              fontFamily: 'var(--font-terminal)',
              padding: '0.2rem 0.55rem',
              borderRadius: '4px',
              backgroundColor: 'rgba(0, 200, 83, 0.1)',
              color: 'var(--color-green)',
              fontWeight: 700,
            }}
          >
            Somnia Shannon
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.75rem', marginBottom: '1rem', fontSize: '0.88rem' }}>
          <button onClick={() => setActiveModule('arena')} className="font-subtext" style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
            Trading Arena
          </button>
          <button onClick={onOpenAnalytics} className="font-subtext" style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
            Portfolio Analytics
          </button>
          <a href="https://docs.dreamdex.io" target="_blank" rel="noreferrer" className="font-subtext" style={{ color: '#6B7280', textDecoration: 'none' }}>
            Documentation
          </a>
          <a href="https://shannon-explorer.somnia.network" target="_blank" rel="noreferrer" className="font-subtext" style={{ color: '#6B7280', textDecoration: 'none' }}>
            Explorer
          </a>
        </div>

        <div className="font-subtext" style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>
          © 2026 FLIP. High-velocity binary prediction markets on Somnia Shannon Testnet.
        </div>
      </footer>
    </div>
  );
};
