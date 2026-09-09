import React, { useState, useEffect } from "react";
import {
  ArrowLeft, ArrowUpRight, User, Wallet, Link2, Unlink, MessageCircle,
  Mail, Shield, ShieldCheck, Copy, Check, ExternalLink, LogOut,
  AlertTriangle, TrendingUp, Coins, Activity, RefreshCw, BarChart3,
  Globe, Key,
} from "lucide-react";
import { usePrivy, useLinkAccount, useWallets } from "@privy-io/react-auth";
import { useDisconnect } from "wagmi";
import { useMarketStore } from "../store/marketStore";
import { WalletRegistry } from "../services/walletRegistry";

interface ProfilePageProps {
  onBack: () => void;
  onLaunchApp: () => void;
}

const StatCard = ({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: any }) => (
  <div style={{ padding: "1.25rem", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
    <div style={{ width: "34px", height: "34px", backgroundColor: "#F4F4F4", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={15} color="var(--color-black)" />
    </div>
    <div>
      <div style={{ fontSize: "1.2rem", fontWeight: 800, fontFamily: "var(--font-bobz)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: "0.76rem", color: "var(--color-grey-muted)", marginBottom: sub ? "0.1rem" : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: "0.72rem", color: "var(--color-green)", fontWeight: 600 }}>{sub}</div>}
    </div>
  </div>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div style={{ marginBottom: "1.25rem" }}>
    <div className="font-bobz" style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "0.01em", marginBottom: subtitle ? "0.2rem" : 0 }}>{title}</div>
    {subtitle && <div style={{ fontSize: "0.80rem", color: "var(--color-grey-text)" }}>{subtitle}</div>}
    <div style={{ width: "28px", height: "2px", backgroundColor: "var(--color-black)", marginTop: "0.5rem" }} />
  </div>
);

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack, onLaunchApp }) => {
  const {
    ready, authenticated, user,
    login, logout, exportWallet,
    unlinkWallet, unlinkEmail, unlinkGoogle, unlinkTwitter, unlinkDiscord,
  } = usePrivy();

  const { wallets } = useWallets();
  const { disconnect } = useDisconnect();
  const { userAddress, userBalanceUSD, userGasSTT, positions, stats, refreshBalances, addToast } = useMarketStore();

  const handleProfileSignOut = async () => {
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
    useMarketStore.getState().setUserAddress(null);
    try {
      localStorage.removeItem('flip_active_session_wallet');
    } catch {}
    onBack();
  };

  const { linkWallet, linkEmail, linkGoogle, linkTwitter, linkDiscord } = useLinkAccount({
    onSuccess: ({ user: updatedUser, linkMethod }: any) => {
      if (linkMethod === 'wallet' && (user?.id || userAddress)) {
        const newlyBound = updatedUser?.linkedAccounts?.find(
          (a: any) => a.type === 'wallet' && a.walletClientType !== 'privy'
        );
        if (newlyBound?.address) {
          const uid = user?.id || `user_${newlyBound.address.toLowerCase()}`;
          const conflict = WalletRegistry.checkConflict(newlyBound.address, uid, user?.email?.address);
          if (conflict.isConflict) {
            addToast({
              type: "error",
              title: "Wallet Already Bound",
              message: "This wallet is already bound to another active FLIP account. Each wallet can only be bound to one user.",
            });
            if (unlinkWallet) {
              unlinkWallet(newlyBound.address).catch(console.warn);
            }
            disconnect();
            return;
          }
          WalletRegistry.bindWallet(newlyBound.address, uid, user?.email?.address);
          useMarketStore.getState().setUserAddress(newlyBound.address);
        }
      } else if (linkMethod === 'google' || linkMethod === 'google_oauth') {
        const googleAcc = updatedUser?.linkedAccounts?.find((a: any) => a.type === 'google_oauth');
        const id = googleAcc?.email || googleAcc?.subject;
        const uid = user?.id || (userAddress ? `user_${userAddress.toLowerCase()}` : '');
        if (id && uid) {
          const conflict = WalletRegistry.checkSocialConflict('google', id, uid);
          if (conflict.isConflict) {
            addToast({
              type: 'error',
              title: 'Google Account Bound Elsewhere',
              message: 'This Google account is already linked to another FLIP user.',
            });
            if (unlinkGoogle) {
              unlinkGoogle(googleAcc.subject || id).catch(console.warn);
            }
            return;
          }
          WalletRegistry.bindSocial('google', id, uid);
        }
      } else if (linkMethod === 'twitter' || linkMethod === 'twitter_oauth') {
        const twitterAcc = updatedUser?.linkedAccounts?.find((a: any) => a.type === 'twitter_oauth');
        const id = twitterAcc?.username || twitterAcc?.subject;
        const uid = user?.id || (userAddress ? `user_${userAddress.toLowerCase()}` : '');
        if (id && uid) {
          const conflict = WalletRegistry.checkSocialConflict('twitter', id, uid);
          if (conflict.isConflict) {
            addToast({
              type: 'error',
              title: 'Twitter Account Bound Elsewhere',
              message: 'This Twitter / X account is already linked to another FLIP user.',
            });
            if (unlinkTwitter) {
              unlinkTwitter(twitterAcc.subject || id).catch(console.warn);
            }
            return;
          }
          WalletRegistry.bindSocial('twitter', id, uid);
        }
      } else if (linkMethod === 'discord' || linkMethod === 'discord_oauth') {
        const discordAcc = updatedUser?.linkedAccounts?.find((a: any) => a.type === 'discord_oauth');
        const id = discordAcc?.username || discordAcc?.email || discordAcc?.subject;
        const uid = user?.id || (userAddress ? `user_${userAddress.toLowerCase()}` : '');
        if (id && uid) {
          const conflict = WalletRegistry.checkSocialConflict('discord', id, uid);
          if (conflict.isConflict) {
            addToast({
              type: 'error',
              title: 'Discord Account Bound Elsewhere',
              message: 'This Discord account is already linked to another FLIP user.',
            });
            if (unlinkDiscord) {
              unlinkDiscord(discordAcc.subject || id).catch(console.warn);
            }
            return;
          }
          WalletRegistry.bindSocial('discord', id, uid);
        }
      } else if (linkMethod === 'email') {
        const emailAcc = updatedUser?.linkedAccounts?.find((a: any) => a.type === 'email');
        const id = emailAcc?.address;
        const uid = user?.id || (userAddress ? `user_${userAddress.toLowerCase()}` : '');
        if (id && uid) {
          const conflict = WalletRegistry.checkSocialConflict('email', id, uid);
          if (conflict.isConflict) {
            addToast({
              type: 'error',
              title: 'Email Bound Elsewhere',
              message: 'This email is already linked to another FLIP user.',
            });
            if (unlinkEmail) {
              unlinkEmail(id).catch(console.warn);
            }
            return;
          }
          WalletRegistry.bindSocial('email', id, uid);
        }
      }
      addToast({ type: "success", title: "Account Linked", message: `${linkMethod} bound to your FLIP profile.` });
      refreshBalances();
    },
    onError: (err: any) => {
      addToast({ type: "error", title: "Link Failed", message: String(err?.message || err) || "Could not link account." });
    },
  });

  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleCopy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBalances();
    setTimeout(() => setIsRefreshing(false), 700);
  };

  const linkedWallets = user?.linkedAccounts?.filter((a: any) => a.type === "wallet") || [];
  const boundExternalWallet = linkedWallets.find((w: any) => w.walletClientType !== "privy");
  const activeWalletAddress = boundExternalWallet?.address || userAddress || null;
  const isEmbedded = user?.wallet?.walletClientType === "privy";

  const isUserSignedIn = authenticated || !!userAddress;

  const linkedGoogle = user?.linkedAccounts?.find((a: any) => a.type === "google_oauth");
  const linkedTwitter = user?.linkedAccounts?.find((a: any) => a.type === "twitter_oauth");
  const linkedDiscord = user?.linkedAccounts?.find((a: any) => a.type === "discord_oauth");
  const linkedEmail = user?.linkedAccounts?.find((a: any) => a.type === "email");

  const linkedSocialsCount = [linkedGoogle, linkedTwitter, linkedDiscord, linkedEmail].filter(Boolean).length;
  const canUnlinkWallet = (linkedWallets.length > 1 || (linkedWallets.length === 1 && !userAddress)) || linkedSocialsCount > 0;
  const canUnlinkSocial = linkedSocialsCount > 1 || (linkedWallets.length > 0 || !!userAddress);

  // Derive display stats from persisted stats store (survives ledger clears)
  const totalPositions = (stats?.totalTrades ?? 0) || positions?.length || 0;
  const wonPositions = stats?.wins ?? positions?.filter((p: any) => p.status === 'WON' || p.status === 'CLAIMED').length ?? 0;
  const winRate = totalPositions > 0 ? ((wonPositions / totalPositions) * 100).toFixed(0) : '0';
  const totalWagered = stats?.totalVolumeUSD ?? positions?.reduce((sum: number, p: any) => sum + (p.investedUSD || 0), 0) ?? 0;
  const currentStreak = stats?.winStreak ?? 0;
  const maxStreak = stats?.maxWinStreak ?? 0;

  // Initials for avatar
  const initials = linkedTwitter
    ? ((linkedTwitter as any).username || "?")[0].toUpperCase()
    : linkedGoogle
    ? ((linkedGoogle as any).name || "?")[0].toUpperCase()
    : linkedEmail
    ? ((linkedEmail as any).address || "?")[0].toUpperCase()
    : activeWalletAddress
    ? activeWalletAddress.slice(2, 4).toUpperCase()
    : "?";

  const displayName = (linkedTwitter as any)?.username
    || (linkedGoogle as any)?.name
    || (linkedEmail as any)?.address?.split("@")[0]
    || (activeWalletAddress ? `${activeWalletAddress.slice(0, 6)}...${activeWalletAddress.slice(-4)}` : "Web3 Trader");

  const handleConnectSocialOption = (provider: 'google' | 'twitter' | 'discord' | 'email') => {
    if (authenticated) {
      if (provider === 'google') linkGoogle();
      else if (provider === 'twitter') linkTwitter();
      else if (provider === 'discord') linkDiscord();
      else if (provider === 'email') linkEmail();
    } else {
      login({ loginMethods: [provider] });
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FFFFFF", color: "var(--color-black)" }}>
      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "0.9rem 1.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "var(--color-grey-text)" }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width: "1px", height: "18px", backgroundColor: "rgba(0,0,0,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img src="/assets/flip_full_logo.png" alt="FLIP" style={{ height: "22px", width: "auto" }} />
            <span style={{ fontSize: "0.78rem", color: "var(--color-grey-muted)", fontFamily: "var(--font-terminal)" }}>/ profile</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button onClick={handleRefresh} style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer", padding: "0.45rem 0.8rem", borderRadius: "6px", fontSize: "0.78rem", color: "var(--color-grey-text)" }}>
            <RefreshCw size={12} className={isRefreshing ? "spin" : ""} />
            Refresh
          </button>
          <button onClick={onLaunchApp} className="btn-launch-black" style={{ padding: "0.5rem 1.1rem", fontSize: "0.8rem" }}>
            <span>Dashboard</span><ArrowUpRight size={12} />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "2.5rem 1.5rem 6rem 1.5rem" }}>

        {!isUserSignedIn ? (
          /* ── NOT LOGGED IN ── */
          <div style={{ textAlign: "center", padding: "5rem 0" }}>
            <div style={{ width: "56px", height: "56px", backgroundColor: "#F4F4F4", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem auto" }}>
              <User size={24} color="var(--color-grey-muted)" />
            </div>
            <div className="font-bobz" style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Not Signed In</div>
            <p style={{ fontSize: "0.88rem", color: "var(--color-grey-text)", marginBottom: "1.5rem" }}>Connect your Web3 wallet or sign in to view and manage your FLIP profile, linked socials, and account stats.</p>
            <button onClick={() => login()} className="btn-launch-black" style={{ padding: "0.7rem 1.5rem", fontSize: "0.85rem" }}>
              <span>Connect / Sign In</span><ArrowUpRight size={13} />
            </button>
          </div>
        ) : (
          <>
            {/* ── IDENTITY HEADER ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1.5rem", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "10px", marginBottom: "2rem" }}>
              <div style={{
                width: "56px", height: "56px", backgroundColor: "var(--color-black)",
                borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span className="font-bobz" style={{ fontSize: "1.25rem", color: "#FFFFFF", fontWeight: 800 }}>{initials}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-bobz" style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.2rem" }}>{displayName}</div>
                <div style={{ fontSize: "0.76rem", color: "var(--color-grey-muted)", fontFamily: "var(--font-terminal)", marginBottom: "0.35rem" }}>
                  {activeWalletAddress ? `${activeWalletAddress.slice(0, 10)}...${activeWalletAddress.slice(-6)}` : "No wallet bound"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-green)", backgroundColor: "rgba(0,200,83,0.08)", border: "1px solid rgba(0,200,83,0.2)", padding: "0.15rem 0.5rem", borderRadius: "4px", fontFamily: "var(--font-terminal)" }}>
                    SOMNIA SHANNON
                  </span>
                  {isEmbedded && (
                    <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6B7280", backgroundColor: "#F9FAFB", border: "1px solid rgba(0,0,0,0.07)", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                      Privy Embedded
                    </span>
                  )}
                </div>
              </div>
              {activeWalletAddress && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => handleCopy(activeWalletAddress)} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "none", border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer", padding: "0.45rem 0.7rem", borderRadius: "6px", fontSize: "0.75rem", color: "var(--color-grey-text)" }}>
                    {copiedAddr === activeWalletAddress ? <Check size={12} color="var(--color-green)" /> : <Copy size={12} />}
                    {copiedAddr === activeWalletAddress ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </div>

            {/* ── BALANCES ── */}
            <div className="landing-grid-4col" style={{ gap: "0.85rem", marginBottom: "1.5rem" }}>
              <StatCard label="tUSDC Balance" value={`$${(userBalanceUSD || 0).toFixed(2)}`} icon={Coins} />
              <StatCard label="STT Gas" value={(userGasSTT || 0).toFixed(4)} icon={Wallet} sub="Somnia Gas Token" />
              <StatCard label="Win Rate" value={`${winRate}%`} icon={TrendingUp} sub={`${wonPositions}W / ${totalPositions > 0 ? totalPositions - wonPositions : 0}L`} />
              <StatCard label="Total Wagered" value={`$${totalWagered.toFixed(2)}`} icon={BarChart3} />
            </div>
            <div className="landing-grid-2col" style={{ gap: "0.85rem", marginBottom: "2.5rem" }}>
              <StatCard label="Win Streak" value={currentStreak > 0 ? `${currentStreak}🔥` : '—'} icon={TrendingUp} sub={`Best: ${maxStreak > 0 ? `${maxStreak}W` : '—'}`} />
              <StatCard label="Net PnL" value={`${(stats?.netPnLUSD ?? 0) >= 0 ? '+' : ''}$${(stats?.netPnLUSD ?? 0).toFixed(2)}`} icon={BarChart3} sub="Realized profit/loss" />
            </div>

            {/* ── CONNECTED WALLETS ── */}
            <div style={{ marginBottom: "2.5rem" }}>
              <SectionTitle title="Bound Wallet" subtitle="The Web3 wallet linked to this account for trading and payouts" />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "0.75rem" }}>
                {linkedWallets.length === 0 && !activeWalletAddress ? (
                  <div style={{ padding: "1.25rem", border: "1px dashed rgba(0,0,0,0.12)", borderRadius: "8px", textAlign: "center", color: "var(--color-grey-muted)", fontSize: "0.84rem" }}>
                    No wallet bound. Bind your Web3 wallet (MetaMask / Rabby) to trade.
                  </div>
                ) : (
                  <>
                    {linkedWallets.map((w: any) => (
                      <div key={w.address} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1rem", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ width: "30px", height: "30px", backgroundColor: "#F4F4F4", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Wallet size={14} color="var(--color-black)" />
                          </div>
                          <div>
                            <div style={{ fontSize: "0.84rem", fontWeight: 700, fontFamily: "var(--font-terminal)" }}>{w.address.slice(0, 10)}...{w.address.slice(-6)}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--color-grey-muted)" }}>
                              {w.walletClientType === "privy" ? "Privy Embedded Wallet" : w.walletClientType || "External Wallet"}
                              {w.address.toLowerCase() === activeWalletAddress?.toLowerCase() && <span style={{ marginLeft: "0.5rem", color: "var(--color-green)", fontWeight: 700 }}>— Active Bound Wallet</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button onClick={() => handleCopy(w.address)} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "none", border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer", padding: "0.35rem 0.65rem", borderRadius: "5px", fontSize: "0.72rem", color: "var(--color-grey-text)" }}>
                            {copiedAddr === w.address ? <Check size={11} color="var(--color-green)" /> : <Copy size={11} />}
                          </button>
                          {w.walletClientType === "privy" && (
                            <button onClick={() => exportWallet()} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "none", border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer", padding: "0.35rem 0.65rem", borderRadius: "5px", fontSize: "0.72rem", color: "var(--color-grey-text)" }}>
                              <Key size={11} /> Export
                            </button>
                          )}
                          {confirmUnlink === w.address ? (
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <button onClick={async () => {
                                try {
                                  await unlinkWallet(w.address);
                                  if (user?.id) {
                                    WalletRegistry.unbindWallet(w.address, user.id);
                                  }
                                  setConfirmUnlink(null);
                                  addToast({ type: "success", title: "Wallet Removed", message: "Wallet removed from your profile." });
                                } catch (e: any) {
                                  addToast({ type: "error", title: "Cannot Remove", message: e?.message || "Failed to remove wallet." });
                                }
                              }}
                                style={{ fontSize: "0.72rem", fontWeight: 700, backgroundColor: "#DC2626", color: "#FFFFFF", border: "none", borderRadius: "5px", padding: "0.35rem 0.65rem", cursor: "pointer" }}>
                                Confirm Remove
                              </button>
                              <button onClick={() => setConfirmUnlink(null)} style={{ fontSize: "0.72rem", background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "5px", padding: "0.35rem 0.65rem", cursor: "pointer", color: "var(--color-grey-text)" }}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => canUnlinkWallet ? setConfirmUnlink(w.address) : addToast({ type: "error", title: "Cannot Unbind", message: "You must have at least one auth method remaining." })}
                              style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "none", border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer", padding: "0.35rem 0.65rem", borderRadius: "5px", fontSize: "0.72rem", color: "#DC2626" }}>
                              <Unlink size={11} /> {w.walletClientType === "privy" ? "Remove Unused Wallet" : "Unbind Wallet"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* If userAddress is connected but not in linkedWallets array */}
                    {linkedWallets.length === 0 && activeWalletAddress && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1rem", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ width: "30px", height: "30px", backgroundColor: "#F4F4F4", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Wallet size={14} color="var(--color-black)" />
                          </div>
                          <div>
                            <div style={{ fontSize: "0.84rem", fontWeight: 700, fontFamily: "var(--font-terminal)" }}>{activeWalletAddress.slice(0, 10)}...{activeWalletAddress.slice(-6)}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--color-grey-muted)" }}>
                              Connected Web3 Wallet <span style={{ marginLeft: "0.5rem", color: "var(--color-green)", fontWeight: 700 }}>— Active Bound Wallet</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button onClick={() => handleCopy(activeWalletAddress)} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "none", border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer", padding: "0.35rem 0.65rem", borderRadius: "5px", fontSize: "0.72rem", color: "var(--color-grey-text)" }}>
                            {copiedAddr === activeWalletAddress ? <Check size={11} color="var(--color-green)" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              {!boundExternalWallet && !activeWalletAddress && (
                <button onClick={() => linkWallet()} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--color-black)", color: "#FFFFFF", border: "none", cursor: "pointer", padding: "0.7rem 1.25rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, marginTop: "0.75rem" }}>
                  <Link2 size={14} /> Bind Real Web3 Wallet (MetaMask / Rabby)
                </button>
              )}
            </div>

            {/* ── CONNECTED SOCIALS ── */}
            <div style={{ marginBottom: "2.5rem" }}>
              <SectionTitle title="Connected Identities" subtitle="Social accounts and email linked to your FLIP profile" />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {[
                  { key: 'twitter' as const, label: 'Twitter / X', icon: MessageCircle, linked: linkedTwitter, linkFn: () => handleConnectSocialOption('twitter'), unlinkFn: () => unlinkTwitter((linkedTwitter as any)?.subject), identifier: (linkedTwitter as any)?.username ? `@${(linkedTwitter as any).username}` : null },
                  { key: "google" as const, label: "Google", icon: Globe, linked: linkedGoogle, linkFn: () => handleConnectSocialOption('google'), unlinkFn: () => unlinkGoogle((linkedGoogle as any)?.subject), identifier: (linkedGoogle as any)?.email || null },
                  { key: "discord" as const, label: "Discord", icon: Activity, linked: linkedDiscord, linkFn: () => handleConnectSocialOption('discord'), unlinkFn: () => unlinkDiscord((linkedDiscord as any)?.subject), identifier: (linkedDiscord as any)?.username ? `@${(linkedDiscord as any).username}` : null },
                  { key: "email" as const, label: "Email", icon: Mail, linked: linkedEmail, linkFn: () => handleConnectSocialOption('email'), unlinkFn: () => unlinkEmail((linkedEmail as any)?.address), identifier: (linkedEmail as any)?.address || null },
                ].map(({ key, label, icon: Icon, linked, linkFn, unlinkFn, identifier }) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem", border: `1px solid ${linked ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.05)"}`, borderRadius: "8px", backgroundColor: linked ? "#FFFFFF" : "#FAFAFA" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: "30px", height: "30px", backgroundColor: linked ? "#F4F4F4" : "#F0F0F0", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={14} color={linked ? "var(--color-black)" : "var(--color-grey-muted)"} />
                      </div>
                      <div>
                        <div style={{ fontSize: "0.84rem", fontWeight: linked ? 700 : 500, color: linked ? "var(--color-black)" : "var(--color-grey-muted)" }}>{label}</div>
                        {identifier && <div style={{ fontSize: "0.72rem", color: "var(--color-grey-muted)", fontFamily: "var(--font-terminal)" }}>{identifier}</div>}
                      </div>
                    </div>
                    {linked ? (
                      confirmUnlink === key ? (
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button onClick={() => { unlinkFn(); setConfirmUnlink(null); addToast({ type: "success", title: `${label} Unlinked`, message: `${label} has been removed from your FLIP profile.` }); }}
                            style={{ fontSize: "0.72rem", fontWeight: 700, backgroundColor: "#DC2626", color: "#FFFFFF", border: "none", borderRadius: "5px", padding: "0.35rem 0.65rem", cursor: "pointer" }}>
                            Confirm
                          </button>
                          <button onClick={() => setConfirmUnlink(null)} style={{ fontSize: "0.72rem", background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "5px", padding: "0.35rem 0.65rem", cursor: "pointer", color: "var(--color-grey-text)" }}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => canUnlinkSocial ? setConfirmUnlink(key) : addToast({ type: "error", title: "Cannot Unlink", message: "You must keep at least one auth method." })}
                          style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "none", border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer", padding: "0.35rem 0.75rem", borderRadius: "5px", fontSize: "0.75rem", color: "var(--color-grey-text)" }}>
                          <Unlink size={11} /> Unlink
                        </button>
                      )
                    ) : (
                      <button onClick={linkFn} style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "1px solid rgba(0,0,0,0.12)", cursor: "pointer", padding: "0.35rem 0.75rem", borderRadius: "5px", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-black)" }}>
                        <Link2 size={11} /> Connect
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── DANGER ZONE ── */}
            <div style={{ padding: "1.25rem", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "8px", backgroundColor: "#FFF9F9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <AlertTriangle size={15} color="#DC2626" />
                <span className="font-bobz" style={{ fontSize: "0.88rem", fontWeight: 800, color: "#DC2626" }}>Danger Zone</span>
              </div>
              <p style={{ fontSize: "0.81rem", color: "#6B7280", marginBottom: "1rem", lineHeight: 1.55 }}>
                Logging out ends your current session. Your linked wallets and social accounts remain bound to your FLIP identity and will reconnect automatically on next login.
              </p>
              <button onClick={handleProfileSignOut} style={{ display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: "#DC2626", color: "#FFFFFF", border: "none", cursor: "pointer", padding: "0.6rem 1.1rem", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 700 }}>
                <LogOut size={14} /> Sign Out of FLIP
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
