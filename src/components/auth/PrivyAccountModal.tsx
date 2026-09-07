import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  usePrivy,
  useWallets,
  useLinkAccount,
} from '@privy-io/react-auth';
import { useMarketStore } from '../../store/marketStore';
import { SOMNIA_CONFIG } from '../../contracts/chain';
import { formatUSD } from '../../services/dreamdex';
import {
  Mail,
  Wallet,
  ShieldCheck,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Key,
  LogOut,
  X,
  Sparkles,
  Link2,
  CheckCircle2,
  RefreshCw,
  Zap,
  Globe,
  Layers,
} from 'lucide-react';

interface PrivyAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivyAccountModal: React.FC<PrivyAccountModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    ready,
    authenticated,
    user,
    login,
    logout,
    exportWallet,
    createWallet,
    unlinkWallet,
    unlinkEmail,
  } = usePrivy();

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

  const { wallets } = useWallets();
  const { userBalanceUSD, userGasSTT, refreshBalances, addToast } = useMarketStore();

  const {
    linkWallet,
    linkEmail,
    linkGoogle,
    linkTwitter,
    linkDiscord,
  } = useLinkAccount({
    onSuccess: ({ user: updatedUser, linkMethod }: any) => {
      addToast({
        type: 'success',
        title: 'Account Bound Successfully',
        message: `Linked ${linkMethod} to your FLIP profile.`,
      });
      refreshBalances();
    },
    onError: (error: any) => {
      console.warn('[Privy] Link error:', error);
      addToast({
        type: 'error',
        title: 'Binding Failed',
        message: String(error) || 'Failed to link account.',
      });
    },
  });

  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshBalances();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Find linked wallets
  const linkedWallets = user?.linkedAccounts?.filter(
    (account: any) => account.type === 'wallet'
  ) || [];

  // Find linked socials
  const linkedGoogle = user?.linkedAccounts?.find((a: any) => a.type === 'google_oauth');
  const linkedTwitter = user?.linkedAccounts?.find((a: any) => a.type === 'twitter_oauth');
  const linkedDiscord = user?.linkedAccounts?.find((a: any) => a.type === 'discord_oauth');

  // Primary active wallet
  const activeWalletAddress = user?.wallet?.address || wallets?.[0]?.address;
  const isEmbedded = user?.wallet?.walletClientType === 'privy';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00F2FE] via-[#4FACFE] to-[#00FFA3]" />

        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00F2FE]/20 to-[#00FFA3]/20 border border-[#00F2FE]/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#00F2FE]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Privy Identity &amp; Wallet Hub
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/30">
                  SOMNIA TESTNET
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Manage your authenticated email, embedded wallet, and bound Web3 keys
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Unauthenticated State */}
          {!authenticated ? (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/20 flex items-center justify-center">
                <Mail className="w-8 h-8 text-[#00F2FE]" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-bold text-white">
                  Log in or Connect via Privy
                </h3>
                <p className="text-sm text-white/60">
                  Instant email OTP login, social authentication, or connect your existing Web3 wallet with zero setup.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                <button
                  onClick={() => {
                    login();
                    onClose();
                  }}
                  className="flex-1 px-5 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00F2FE] to-[#00FFA3] text-black hover:opacity-95 shadow-lg shadow-[#00F2FE]/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Mail className="w-4 h-4" />
                  Email / Social Login
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Authenticated Summary Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-white/[0.04] to-white/[0.01] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00FFA3] animate-pulse" />
                    <span className="text-xs font-semibold text-[#00FFA3] uppercase tracking-wider">
                      Privy Session Active
                    </span>
                  </div>
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-white/50" />
                    <span>{user?.email?.address || 'No email bound'}</span>
                    {user?.email?.address && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!user?.email?.address && (
                    <button
                      onClick={() => linkEmail()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#00F2FE]" />
                      Bind Email
                    </button>
                  )}
                  <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
                    title="Refresh Balances"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#00F2FE]' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Primary Active Wallet Card */}
              <div className="p-5 rounded-xl bg-[#161b22] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-[#00F2FE]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Primary Somnia Trading Wallet
                        {isEmbedded ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/30">
                            EMBEDDED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            EXTERNAL BOUND
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-white/50">
                        {isEmbedded
                          ? 'Managed securely in your browser via Privy TSS encryption'
                          : 'Connected via browser Web3 wallet provider'}
                      </p>
                    </div>
                  </div>

                  {isEmbedded && (
                    <button
                      onClick={() => exportWallet()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00F2FE]/10 hover:bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Key className="w-3.5 h-3.5" />
                      Export Key
                    </button>
                  )}
                </div>

                {/* Address Box */}
                {activeWalletAddress ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-white/90">
                    <span className="truncate mr-2">{activeWalletAddress}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleCopy(activeWalletAddress)}
                        className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        title="Copy Address"
                      >
                        {copiedAddress === activeWalletAddress ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={`${SOMNIA_CONFIG.explorerUrl}/address/${activeWalletAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        title="View on Explorer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5">
                    <span className="text-xs text-white/50">No embedded wallet created yet</span>
                    <button
                      onClick={() => createWallet()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00FFA3] text-black hover:opacity-90 transition-all font-sans"
                    >
                      Create Somnia Wallet
                    </button>
                  </div>
                )}

                {/* Live Balances Grid */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="text-[11px] text-white/50 uppercase tracking-wider font-semibold">
                      tUSDC Collateral
                    </div>
                    <div className="text-base font-bold text-white mt-0.5">
                      {formatUSD(userBalanceUSD)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="text-[11px] text-white/50 uppercase tracking-wider font-semibold">
                      STT Gas Balance
                    </div>
                    <div className="text-base font-bold text-[#00FFA3] mt-0.5">
                      {userGasSTT.toFixed(4)} STT
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Binding Hub Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[#00F2FE]" />
                    <h4 className="text-sm font-bold text-white">
                      Bound External Wallets
                    </h4>
                  </div>
                  <button
                    onClick={() => linkWallet()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#00F2FE]/20 to-[#00FFA3]/20 hover:from-[#00F2FE]/30 hover:to-[#00FFA3]/30 text-[#00F2FE] border border-[#00F2FE]/40 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Bind External Wallet
                  </button>
                </div>

                <div className="space-y-2">
                  {linkedWallets.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01] text-center space-y-1">
                      <p className="text-xs text-white/60">
                        No external Web3 wallets bound to this email account yet.
                      </p>
                      <p className="text-[11px] text-white/40">
                        Click "Bind External Wallet" above to connect MetaMask, Coinbase, Rainbow, or Rabby.
                      </p>
                    </div>
                  ) : (
                    linkedWallets.map((walletAcc: any) => {
                      const isCurrent = walletAcc.address?.toLowerCase() === activeWalletAddress?.toLowerCase();
                      return (
                        <div
                          key={walletAcc.address}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                              <Wallet className="w-3.5 h-3.5 text-white/70" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-white truncate font-medium">
                                  {walletAcc.address.slice(0, 8)}...{walletAcc.address.slice(-6)}
                                </span>
                                {walletAcc.walletClientType && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-white/70 uppercase">
                                    {walletAcc.walletClientType}
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-white/40">
                                Bound to Privy profile
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopy(walletAcc.address)}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                              title="Copy"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {linkedWallets.length > 1 && unlinkWallet && (
                              <button
                                onClick={() => unlinkWallet(walletAcc.address)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
                                title="Unbind Wallet"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Social Accounts Section */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00FFA3]" />
                  Linked Social Identities
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Google */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/80">Google</span>
                    {linkedGoogle ? (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Bound
                      </span>
                    ) : (
                      <button
                        onClick={() => linkGoogle()}
                        className="px-2 py-1 rounded text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
                      >
                        + Link
                      </button>
                    )}
                  </div>

                  {/* Twitter */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/80">Twitter / X</span>
                    {linkedTwitter ? (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Bound
                      </span>
                    ) : (
                      <button
                        onClick={() => linkTwitter()}
                        className="px-2 py-1 rounded text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
                      >
                        + Link
                      </button>
                    )}
                  </div>

                  {/* Discord */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/80">Discord</span>
                    {linkedDiscord ? (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Bound
                      </span>
                    ) : (
                      <button
                        onClick={() => linkDiscord()}
                        className="px-2 py-1 rounded text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
                      >
                        + Link
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Bar */}
        {authenticated && (
          <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect Session
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
