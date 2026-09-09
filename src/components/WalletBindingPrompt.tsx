import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  X,
  Loader2,
  CheckCircle2,
  Lock,
  LogOut,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Download,
} from "lucide-react";
import { usePrivy, useLinkAccount } from "@privy-io/react-auth";
import { useMarketStore } from "../store/marketStore";
import { WalletRegistry } from "../services/walletRegistry";
import { WalletSigner } from "../services/walletSigner";
import {
  ProviderDetector,
  SupportedWalletId,
  WALLET_METADATA_LIST,
} from "../services/providerDetector";

// --- Authentic Official Wallet SVG Logos ---

const MetaMaskLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 318.6 318.6" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M274.1 35.5l-99.5 73.9L193 65.3z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M44.4 35.5l98.7 74.6-18.4-44.8z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M238.3 206.8l-28.4 43.1 56.4 15.5 16.3-57.9z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M36 207.5l16.3 57.9 56.3-15.5-28.3-43.1z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M103.6 138.2l-15.8 23.9 56.3 2.5-2-60.5z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M214.9 138.2l-39-34.8-1.3 61.2 56.2-2.5z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M106.8 247.4l33.8-16.5-29.3-22.8z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M177.9 230.9l34 16.5-4.7-39.3z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M211.9 247.4l-34-16.5 2.7 22.1-.3 9.3 31.6-14.9z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M106.8 247.4l31.6 14.9-.2-9.3 2.5-22.1z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M140.8 198.8l-34.5-10.2 24.3 19.8 10.2-9.6z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M177.8 198.8l10.1 9.6 24.4-19.8-34.5 10.2z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M106.3 208.4l29.4 22.8 5-22.4-34.4-.4z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M177.9 208.8l4.9 22.4 29.4-22.8-34.3.4z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M230.8 164.8l-56.2 2.5 4.3 21.5 9.7 10 43.1-34z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M87.8 164.8l43.2 34 9.6-10 4.4-21.5-57.2-2.5z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M87.8 164.8l18.5 42.7 2.3-18.7z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M212.3 188.8l2.3 18.7 18.5-42.7z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M142.1 167.3l-4.4 21.5 5.6 29.5 1.3-41.4z" fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M176.5 167.3l-2.6 9.6 1.4 41.4 5.5-29.5z" fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M174.6 103.4l-15.3-44.5-15.3 44.5 1.3 61.2 28 0z" fill="#161616" stroke="#161616" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M274.1 35.5l-8.5 73.1-50.7 29.6 23.4-37.4z" fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M44.4 35.5l35.8 65.3 23.4 37.4-50.7-29.6z" fill="#763D16" stroke="#763D16" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M265.6 108.6l8.5-73.1 8.5 73.6-17 12.3z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M35.9 109.1l8.5-73.6 8.5 73.1-17-11.8z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M159.3 58.9l15.3 44.5 18.4-38.1z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M125.6 65.3l18.4 38.1 15.3-44.5z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const OkxLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="20" fill="#000000"/>
    <rect x="18" y="18" width="28" height="28" rx="4" fill="#FFFFFF"/>
    <rect x="54" y="18" width="28" height="28" rx="4" fill="#FFFFFF"/>
    <rect x="36" y="36" width="28" height="28" rx="4" fill="#FFFFFF"/>
    <rect x="18" y="54" width="28" height="28" rx="4" fill="#FFFFFF"/>
    <rect x="54" y="54" width="28" height="28" rx="4" fill="#FFFFFF"/>
  </svg>
);

const RabbyLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="24" fill="#8697FF"/>
    <path d="M28 66C28 48.3269 42.3269 34 60 34C77.6731 34 92 48.3269 92 66V74C92 81.732 85.732 88 78 88H42C34.268 88 28 81.732 28 74V66Z" fill="#FFFFFF"/>
    <circle cx="48" cy="62" r="6" fill="#1C244B"/>
    <circle cx="72" cy="62" r="6" fill="#1C244B"/>
    <path d="M42 34L47 22M78 34L73 22" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round"/>
    <rect x="54" y="72" width="12" height="6" rx="3" fill="#FF8383"/>
  </svg>
);

const CoinbaseLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#0052FF"/>
    <circle cx="50" cy="50" r="28" fill="#FFFFFF"/>
    <rect x="42" y="42" width="16" height="16" rx="4" fill="#0052FF"/>
  </svg>
);

const PhantomLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#AB9FF2"/>
    <path d="M68 52c0 9.941-8.059 18-18 18s-18-8.059-18-18c0-14.5 12-24 18-24s18 9.5 18 24z" fill="#FFFFFF"/>
    <circle cx="44" cy="50" r="3.5" fill="#4E44CE"/>
    <circle cx="56" cy="50" r="3.5" fill="#4E44CE"/>
  </svg>
);

const WalletConnectLogo: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#3B99FC"/>
    <path d="M30 40C41.0457 28.9543 58.9543 28.9543 70 40L72 42C72.5523 42.5523 72.5523 43.4477 72 44L67 49C66.4477 49.5523 65.5523 49.5523 65 49L61.5 45.5C55.1487 39.1487 44.8513 39.1487 38.5 45.5L35 49C34.4477 49.5523 33.5523 49.5523 33 49L28 44C27.4477 43.4477 27.4477 42.5523 28 42L30 40Z" fill="#FFFFFF"/>
    <path d="M22 50L28 44C28.5523 43.4477 29.4477 43.4477 30 44L36 50L45 41C45.5523 40.4477 46.4477 40.4477 47 41L50 44L53 41C53.5523 40.4477 54.4477 40.4477 55 41L64 50L70 44C70.5523 43.4477 71.4477 43.4477 72 44L78 50C78.5523 50.5523 78.5523 51.4477 78 52L66 64C65.4477 64.5523 64.5523 64.5523 64 64L51 51C50.4477 50.4477 49.5523 50.4477 49 51L36 64C35.4477 64.5523 34.5523 64.5523 34 64L22 52C21.4477 51.4477 21.4477 50.5523 22 50Z" fill="#FFFFFF"/>
  </svg>
);

interface WalletBindingPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onBound: () => void;
}

interface WalletOptionItem {
  id: SupportedWalletId | "privy_multi";
  name: string;
  desc: string;
  logo: React.ReactNode;
  downloadUrl?: string;
}

export const WalletBindingPrompt: React.FC<WalletBindingPromptProps> = ({
  isOpen,
  onClose,
  onBound,
}) => {
  const { user, logout } = usePrivy();
  const { setUserAddress, setAuthSignature, addToast, refreshBalances } = useMarketStore();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [selectedWalletName, setSelectedWalletName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notInstalledPrompt, setNotInstalledPrompt] = useState<{
    name: string;
    downloadUrl: string;
  } | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Dynamic live detection state from ProviderDetector
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

  // Determine user's known bound wallet if they have bound one before
  const knownBoundWallet =
    user?.id ? WalletRegistry.getUserBoundWallet(user.id, user.email?.address) : null;

  // Safely resolve user identity without operator precedence bug
  const getIdentityDisplay = (): string => {
    if (user?.email?.address) return user.email.address;
    if ((user as any)?.twitter?.username) return `@${(user as any).twitter.username}`;
    if ((user as any)?.discord?.username) return (user as any).discord.username;
    if ((user as any)?.google?.email) return (user as any).google.email;
    if ((user as any)?.google?.name) return (user as any).google.name;

    const linked = user?.linkedAccounts?.find(
      (a: any) =>
        a.type === "google_oauth" ||
        a.type === "twitter_oauth" ||
        a.type === "discord_oauth" ||
        a.type === "email"
    ) as any;

    if (linked?.username) return `@${linked.username}`;
    if (linked?.email) return linked.email;
    if (linked?.name) return linked.name;
    if (linked?.address) return `${linked.address.slice(0, 6)}...${linked.address.slice(-4)}`;
    return "Verified Trader";
  };

  const userEmailDisplay = getIdentityDisplay();

  // Privy link account hook for native WalletConnect QR fallback only
  const { linkWallet } = useLinkAccount({
    onSuccess: ({ user: updatedUser }: any) => {
      const boundAddr = (
        updatedUser?.linkedAccounts?.find(
          (a: any) => a.type === "wallet" && a.walletClientType !== "privy"
        ) as any
      )?.address;
      if (boundAddr && user?.id) {
        // Enforce uniqueness
        const conflict = WalletRegistry.checkConflict(boundAddr, user.id, user?.email?.address);
        if (conflict.isConflict) {
          addToast({
            type: "error",
            title: "Wallet Bound to Another Account",
            message: "This wallet is already bound to another active FLIP user.",
          });
          return;
        }

        WalletRegistry.bindWallet(boundAddr, user.id, user?.email?.address);
        setUserAddress(boundAddr);
        refreshBalances();
        onBound();
        onClose();
      }
    },
    onError: (err: any) => {
      console.warn("[Privy Link Account Error]:", err);
      setIsConnecting(false);
      setIsSigning(false);
    },
  });

  const walletOptions: WalletOptionItem[] = [
    {
      id: "okx",
      name: "OKX Wallet",
      desc: "Connect via official OKX Web3 extension",
      logo: <OkxLogo size={28} />,
      downloadUrl: WALLET_METADATA_LIST.okx.downloadUrl,
    },
    {
      id: "metamask",
      name: "MetaMask",
      desc: "Connect via official MetaMask browser extension",
      logo: <MetaMaskLogo size={28} />,
      downloadUrl: WALLET_METADATA_LIST.metamask.downloadUrl,
    },
    {
      id: "rabby",
      name: "Rabby Wallet",
      desc: "Game-ready high performance EVM extension",
      logo: <RabbyLogo size={28} />,
      downloadUrl: WALLET_METADATA_LIST.rabby.downloadUrl,
    },
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      desc: "Connect via Coinbase Wallet extension",
      logo: <CoinbaseLogo size={28} />,
      downloadUrl: WALLET_METADATA_LIST.coinbase.downloadUrl,
    },
    {
      id: "phantom",
      name: "Phantom",
      desc: "Connect via Phantom EVM multi-chain wallet",
      logo: <PhantomLogo size={28} />,
      downloadUrl: WALLET_METADATA_LIST.phantom.downloadUrl,
    },
    {
      id: "privy_multi",
      name: "WalletConnect / Mobile App",
      desc: "Scan QR code with any mobile wallet app",
      logo: <WalletConnectLogo size={28} />,
    },
  ];

  const handleSelectWallet = async (wallet: WalletOptionItem) => {
    setErrorMessage(null);
    setNotInstalledPrompt(null);
    setSelectedWalletName(wallet.name);

    if (wallet.id === "privy_multi") {
      linkWallet();
      return;
    }

    const targetProviderId = wallet.id as SupportedWalletId;
    const provider = ProviderDetector.resolveProvider(targetProviderId);

    // If the chosen wallet is genuinely NOT installed, show prompt and DO NOT hijack with OKX!
    if (!provider) {
      const meta = WALLET_METADATA_LIST[targetProviderId];
      setNotInstalledPrompt({
        name: wallet.name,
        downloadUrl: meta?.downloadUrl || "https://metamask.io/download/",
      });
      return;
    }

    setIsConnecting(true);

    try {
      // Lock WalletSigner to this specific isolated provider
      WalletSigner.setActiveProvider(provider);
      try {
        await WalletSigner.ensureSomniaNetwork(provider);
      } catch (netErr) {
        console.warn("[Network Switch Notice]:", netErr);
      }

      let accounts: string[] = [];
      try {
        accounts = await provider.request({
          method: "eth_requestAccounts",
        });
      } catch (reqErr: any) {
        if (reqErr.code === 4001 || reqErr.message?.toLowerCase().includes("user rejected") || reqErr.message?.toLowerCase().includes("user denied")) {
          throw new Error(`Connection request cancelled in ${wallet.name}.`);
        }
        throw new Error(reqErr?.message || `Failed to connect with ${wallet.name}.`);
      }

      if (!accounts || !accounts[0]) {
        throw new Error(`No account authorized in ${wallet.name}.`);
      }

      const chosenAddress = accounts[0].toLowerCase();
      setIsConnecting(false);

      // 2. CHECK ADDRESS MATCH IF BOUND PREVIOUSLY
      if (knownBoundWallet) {
        if (chosenAddress.toLowerCase() !== knownBoundWallet.toLowerCase()) {
          const shortExpected = `${knownBoundWallet.slice(0, 6)}...${knownBoundWallet.slice(-4)}`;
          const shortConnected = `${chosenAddress.slice(0, 6)}...${chosenAddress.slice(-4)}`;
          throw new Error(
            `Address Mismatch: Your account is bound to ${shortExpected}, but your wallet is on ${shortConnected}. Please switch accounts in ${wallet.name} to activate your session.`
          );
        }
      } else {
        // First-time binding: check if wallet is bound to another user
        if (user?.id) {
          const conflict = WalletRegistry.checkConflict(chosenAddress, user.id, user?.email?.address);
          if (conflict.isConflict) {
            throw new Error(
              "This wallet is already bound to another active FLIP account. Each wallet can only be bound to one user."
            );
          }
        }
      }

      // 3. PROMPT SIGN-IN REQUEST TO ACTIVATE SESSION
      setIsSigning(true);
      const signature = await WalletSigner.requestAuthProof(chosenAddress, provider);

      // 4. BIND & ACTIVATE SESSION
      if (user?.id) {
        WalletRegistry.bindWallet(chosenAddress, user.id, user?.email?.address);
      }

      setAuthSignature(signature);
      setUserAddress(chosenAddress);
      try {
        localStorage.setItem("flip_active_session_wallet", chosenAddress);
      } catch {}

      addToast({
        type: "success",
        title: "Session Activated",
        message: `${wallet.name} (${chosenAddress.slice(0, 6)}...${chosenAddress.slice(-4)}) connected. Ready to trade on Somnia!`,
      });

      refreshBalances();
      setIsSigning(false);
      onBound();
      onClose();
    } catch (err: any) {
      setIsConnecting(false);
      setIsSigning(false);
      console.warn("[Wallet Selection Error]:", err);
      const msg = err?.message || "Failed to connect wallet.";
      setErrorMessage(msg);
      addToast({
        type: "error",
        title: "Wallet Verification Failed",
        message: msg,
      });
    }
  };

  const handleCopyAddress = (addr: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(addr);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUserAddress(null);
      setAuthSignature(null);
      try {
        localStorage.removeItem("flip_active_session_wallet");
      } catch {}
      onClose();
      addToast({
        type: "info",
        title: "Session Terminated",
        message: "You have been logged out.",
      });
    } catch (err) {
      console.warn("[SignOut Error]:", err);
      onClose();
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: "#0E0E0E",
          color: "#FFFFFF",
          width: "100%",
          maxWidth: "520px",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 30px 70px -10px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 200, 83, 0.1)",
          overflow: "hidden",
          animation: "modalRise 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div
          style={{
            height: "3px",
            background: "linear-gradient(90deg, #00C853 0%, #00FFA3 50%, #00F2FE 100%)",
            width: "100%",
          }}
        />

        {/* Modal Header */}
        <div
          style={{
            padding: "1.4rem 1.75rem 0.85rem 1.75rem",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "0.03em",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
                textTransform: "uppercase",
              }}
            >
              <span>SELECT WALLET TO SIGN &amp; TRADE</span>
            </div>
            <div
              className="font-terminal"
              style={{
                fontSize: "0.76rem",
                color: "#9CA3AF",
                marginTop: "0.35rem",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
              }}
            >
              <span>Identity:</span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#00FFA3",
                  backgroundColor: "rgba(0, 255, 163, 0.08)",
                  border: "1px solid rgba(0, 255, 163, 0.25)",
                  padding: "0.15rem 0.55rem",
                  borderRadius: "6px",
                  fontSize: "0.76rem",
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {userEmailDisplay}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            title="Cancel & Sign Out"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              cursor: "pointer",
              padding: "0.45rem",
              color: "#9CA3AF",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.12)";
              e.currentTarget.style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
              e.currentTarget.style.color = "#9CA3AF";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.25rem 1.75rem 1.75rem 1.75rem" }}>
          {/* Identity & Bound Status Banner */}
          <div
            style={{
              padding: "1rem 1.15rem",
              backgroundColor: knownBoundWallet ? "rgba(0, 200, 83, 0.08)" : "rgba(255, 255, 255, 0.03)",
              border: knownBoundWallet ? "1px solid rgba(0, 200, 83, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              marginBottom: "1.25rem",
            }}
          >
            {knownBoundWallet ? (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(0, 200, 83, 0.2)",
                    border: "1px solid rgba(0, 200, 83, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  <Lock size={16} color="var(--color-green)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="font-terminal"
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "var(--color-green)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    BOUND ACCOUNT WALLET
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    <span
                      className="font-mono"
                      style={{
                        fontSize: "0.86rem",
                        color: "#FFFFFF",
                        fontWeight: 700,
                        wordBreak: "break-all",
                      }}
                    >
                      {knownBoundWallet}
                    </span>
                    <button
                      onClick={() => handleCopyAddress(knownBoundWallet)}
                      title="Copy Address"
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        padding: "0.25rem",
                        color: "var(--color-green)",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {copiedAddress ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                  <div className="font-subtext" style={{ fontSize: "0.74rem", color: "#9CA3AF", marginTop: "0.3rem" }}>
                    Select your wallet below to authenticate and enter the trading arena.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(0, 200, 83, 0.15)",
                    border: "1px solid rgba(0, 200, 83, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={16} color="var(--color-green)" />
                </div>
                <div>
                  <div className="font-bobz" style={{ fontSize: "0.88rem", fontWeight: 800, color: "#FFFFFF" }}>
                    Session Wallet Authorization
                  </div>
                  <div className="font-subtext" style={{ fontSize: "0.75rem", color: "#9CA3AF", marginTop: "0.15rem" }}>
                    Select your Web3 wallet for executing orders and receiving testnet settlements on Somnia Shannon.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Not Installed Extension Guidance Box */}
          {notInstalledPrompt && (
            <div
              style={{
                padding: "1rem 1.15rem",
                backgroundColor: "rgba(255, 179, 0, 0.09)",
                border: "1px solid rgba(255, 179, 0, 0.35)",
                borderRadius: "12px",
                marginBottom: "1.2rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem" }}>
                <AlertTriangle size={18} color="#FFB300" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div className="font-bobz" style={{ fontSize: "0.86rem", fontWeight: 800, color: "#FFB300" }}>
                    {notInstalledPrompt.name.toUpperCase()} NOT DETECTED
                  </div>
                  <div className="font-subtext" style={{ fontSize: "0.75rem", color: "#E5E7EB", marginTop: "0.2rem" }}>
                    The {notInstalledPrompt.name} extension is not installed in your browser. You can install it below, or choose your detected wallet (e.g. OKX Wallet) to proceed immediately.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginTop: "0.15rem" }}>
                <a
                  href={notInstalledPrompt.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bobz"
                  style={{
                    backgroundColor: "#FFB300",
                    color: "#000000",
                    padding: "0.45rem 0.85rem",
                    borderRadius: "8px",
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <Download size={13} />
                  <span>Install {notInstalledPrompt.name}</span>
                  <ExternalLink size={12} />
                </a>

                {detectionMap.okx && (
                  <button
                    onClick={() => handleSelectWallet(walletOptions[0])}
                    className="font-bobz"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#FFFFFF",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "8px",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <span>Use Detected OKX Wallet</span>
                    <ArrowRight size={13} color="var(--color-green)" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              style={{
                padding: "0.85rem 1rem",
                backgroundColor: "rgba(255, 59, 105, 0.1)",
                border: "1px solid rgba(255, 59, 105, 0.3)",
                borderRadius: "10px",
                color: "#FF6B8B",
                fontSize: "0.81rem",
                lineHeight: 1.45,
                marginBottom: "1.2rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.6rem",
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Wallet Options List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1.25rem" }}>
            {walletOptions.map((wallet) => {
              const isDetected =
                wallet.id !== "privy_multi" && !!detectionMap[wallet.id as SupportedWalletId];
              const isProcessing =
                (isConnecting || isSigning) && selectedWalletName === wallet.name;

              return (
                <button
                  key={wallet.id}
                  disabled={isConnecting || isSigning}
                  onClick={() => handleSelectWallet(wallet)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.85rem 1.1rem",
                    backgroundColor: isProcessing
                      ? "rgba(0, 200, 83, 0.08)"
                      : isDetected
                      ? "rgba(255, 255, 255, 0.04)"
                      : "rgba(255, 255, 255, 0.02)",
                    border: `1.5px solid ${
                      isProcessing
                        ? "rgba(0, 200, 83, 0.4)"
                        : isDetected
                        ? "rgba(255, 255, 255, 0.12)"
                        : "rgba(255, 255, 255, 0.06)"
                    }`,
                    borderRadius: "14px",
                    cursor: isConnecting || isSigning ? "not-allowed" : "pointer",
                    textAlign: "left",
                    transition: "all 0.16s ease",
                    opacity: isConnecting || isSigning ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isConnecting && !isSigning) {
                      e.currentTarget.style.borderColor = "var(--color-green)";
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isConnecting && !isSigning) {
                      e.currentTarget.style.borderColor = isDetected
                        ? "rgba(255, 255, 255, 0.12)"
                        : "rgba(255, 255, 255, 0.06)";
                      e.currentTarget.style.backgroundColor = isDetected
                        ? "rgba(255, 255, 255, 0.04)"
                        : "rgba(255, 255, 255, 0.02)";
                      e.currentTarget.style.transform = "none";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.95rem" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {wallet.logo}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.94rem",
                          fontWeight: 700,
                          color: "#FFFFFF",
                          letterSpacing: "0.01em",
                          fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
                        }}
                      >
                        {wallet.name}
                      </div>
                      <div className="font-subtext" style={{ fontSize: "0.74rem", color: "#9CA3AF" }}>
                        {wallet.desc}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                    {isDetected && (
                      <span
                        className="font-terminal"
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 750,
                          backgroundColor: "rgba(0, 200, 83, 0.15)",
                          color: "var(--color-green)",
                          border: "1px solid rgba(0, 200, 83, 0.3)",
                          padding: "0.18rem 0.55rem",
                          borderRadius: "999px",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Detected
                      </span>
                    )}
                    {isProcessing ? (
                      <Loader2 size={17} className="animate-spin" color="var(--color-green)" />
                    ) : (
                      <ArrowRight size={16} color="#9CA3AF" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Signing State Notification */}
          {isSigning && (
            <div
              style={{
                padding: "0.85rem 1rem",
                backgroundColor: "rgba(0, 200, 83, 0.12)",
                border: "1px solid rgba(0, 200, 83, 0.35)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <Loader2 size={18} className="animate-spin" color="var(--color-green)" />
              <div>
                <div className="font-bobz" style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--color-green)" }}>
                  AWAITING WALLET SIGNATURE...
                </div>
                <div className="font-terminal" style={{ fontSize: "0.72rem", color: "#D1D5DB" }}>
                  Please sign the session authentication request in your wallet.
                </div>
              </div>
            </div>
          )}

          {/* Footer Subtext Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "0.85rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div
              className="font-terminal"
              style={{
                fontSize: "0.72rem",
                color: "#6B7280",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span style={{ color: "var(--color-green)" }}>●</span>
              <span>Somnia Shannon Testnet (50312)</span>
            </div>

            <button
              onClick={handleSignOut}
              className="font-bobz"
              style={{
                background: "none",
                border: "none",
                color: "#9CA3AF",
                fontSize: "0.76rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FF3B69")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
            >
              <LogOut size={13} />
              <span>Cancel &amp; Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
