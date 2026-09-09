import React, { useState, useEffect } from "react";
import { ArrowLeft, ArrowUpRight, Search, ChevronDown, ChevronUp, ExternalLink, Wallet, TrendingUp, Users, Coins, Shield, Zap, HelpCircle, Globe } from "lucide-react";

interface HelpPageProps {
  onBack: () => void;
  onLaunchApp: () => void;
}

const CATEGORIES = [
  { id: "getting-started", label: "Getting Started", icon: Zap },
  { id: "trading", label: "Trading & Markets", icon: TrendingUp },
  { id: "wallet", label: "Wallet & Balance", icon: Wallet },
  { id: "squads", label: "Squad Challenges", icon: Users },
  { id: "creator", label: "Market Creator", icon: Globe },
  { id: "resolution", label: "Resolution & Payouts", icon: Coins },
  { id: "security", label: "Security & Privacy", icon: Shield },
  { id: "technical", label: "Technical Issues", icon: HelpCircle },
];

const ALL_FAQS = [
  // Getting Started
  { category: "getting-started", q: "What is FLIP?", a: "FLIP is a binary prediction market protocol on the Somnia Shannon Testnet. You predict whether a crypto asset's price will close above or below a strike price within a 15-minute window. Correct predictions earn payouts from the losing side's pool." },
  { category: "getting-started", q: "Do I need to create an account?", a: "No account creation is needed. You connect your wallet (MetaMask, Rabby, or via social login through Privy) and you are ready to trade. Docs and Help pages are fully accessible without any wallet connection." },
  { category: "getting-started", q: "What do I need to start trading?", a: "You need: (1) A web3 wallet like MetaMask, OKX, or Rabby, or you can sign in with email/Google/Twitter/Discord via Privy. (2) STT tokens for gas fees - get these from the Somnia Telegram Faucet. (3) tUSDC tokens for collateral - you can claim 100 tUSDC directly inside the app down at the Portfolio Analytics section by clicking 'GET 100 tUSDC (FAUCET)', or from the Somnia Telegram community." },
  { category: "getting-started", q: "Is this real money?", a: "No. FLIP runs exclusively on the Somnia Shannon Testnet (Chain ID: 50312). All STT and tUSDC tokens are testnet assets with zero real-world monetary value. This is a testnet application." },
  { category: "getting-started", q: "How do I add Somnia Shannon Testnet to my wallet?", a: "Network Name: Somnia Shannon Testnet | Chain ID: 50312 | RPC URL: https://api.infra.testnet.somnia.network | Currency: STT | Block Explorer: https://shannon-explorer.somnia.network. You can also click the network badge in the FLIP dashboard to trigger automatic network switching." },

  // Trading
  { category: "trading", q: "What does FLIP UP / FLIP DOWN mean?", a: "FLIP UP means you predict the asset price will close at or above the Strike Price when the round timer hits zero. FLIP DOWN means you predict it will close below the Strike Price. You buy shares in either outcome using tUSDC collateral." },
  { category: "trading", q: "What is the Strike Price?", a: "The Strike Price is the price level the asset must finish above (for UP) or below (for DOWN) to determine the winning side. It is set at round open using a volatility-calibrated offset from the live spot price - typically $20 - $55 above spot for BTC in a 15-minute window." },
  { category: "trading", q: "Why does the probability split between UP and DOWN change?", a: "The implied probability is derived from the current price relative to the strike. If the live price is trading well above the strike, UP becomes more likely and its share price rises while DOWN falls. This adjusts dynamically every 6 seconds as new price data arrives." },
  { category: "trading", q: "How are shares calculated?", a: "Shares are priced at the implied probability. If UP probability is 52% (share price = $0.52), and you wager $25, you receive $25 / $0.52 = ~48 shares. If UP wins, each share redeems for exactly $1. Your payout is 48 x $1 = $48 (minus the 2% protocol fee)." },
  { category: "trading", q: "How long is each round?", a: "Standard canonical markets (BTC, ETH, SOL, SOMI, SUI) are all 15-minute rounds. User-created public markets can be 15 or 30 minutes. Squad Challenges can be 15 min, 30 min, 1 hour, or 4 hours." },
  { category: "trading", q: "Why is the price in FLIP slightly different from CoinGecko?", a: "FLIP uses Binance's real-time spot price for BTC, ETH, SOL, and SUI. CoinGecko shows a volume-weighted aggregate across 1,499 exchanges. A $15 - $80 difference is completely normal and expected - both sources are accurate; they reflect different market data pools." },

  // Wallet
  { category: "wallet", q: "Which wallets are supported?", a: "FLIP supports MetaMask, OKX Wallet, Rabby, Coinbase Wallet, and any EIP-1193 compatible browser wallet. You can also sign in with email, Google, Twitter, or Discord through Privy's embedded wallet - no browser extension needed for social login." },
  { category: "wallet", q: "How do I get STT (gas tokens)?", a: "Join the Somnia Telegram community and request STT from the faucet. The faucet link is in the FLIP header, footer and dashboard sidebar. STT is required for all on-chain transactions." },
  { category: "wallet", q: "How do I get tUSDC (collateral)?", a: "You can claim 100 tUSDC directly inside the FLIP app! Simply scroll down to the Portfolio Analytics section on the dashboard and click 'GET 100 tUSDC (FAUCET)'. You can also request testnet collateral from the official Somnia Telegram faucet bot." },
  { category: "wallet", q: "My balance shows $0.00 but I have tokens in my wallet.", a: "This usually means your wallet is still on the wrong network. Ensure you are connected to Somnia Shannon Testnet (Chain ID: 50312). If you just connected, try refreshing the page. The balance is read from the chain in real-time after each block confirmation." },
  { category: "wallet", q: "Can I disconnect my wallet?", a: "Yes. Click your wallet address in the top right of the dashboard to open the account modal, then select Disconnect. This clears your session without affecting your on-chain balances." },

  // Squads
  { category: "squads", q: "What is a Squad Challenge?", a: "A Squad Challenge is a private, invite-only prediction room you create and share with friends. Everyone bets on UP or DOWN, and the round resolves via live oracle data at expiry. Winners split the losers' pool minus a 2% protocol fee." },
  { category: "squads", q: "How do I invite friends to my Squad?", a: "After creating a Squad Challenge, you will see a shareable link and a QR code. Share the link directly or let friends scan the QR code on mobile. Anyone with the link can join until the max player count is reached or the round timer expires." },
  { category: "squads", q: "What happens if everyone in a Squad picks the same side?", a: "If all participants pick UP and the outcome is UP - everyone wins and payouts are made net of the 2% protocol fee. If all pick UP and the outcome is DOWN - the entire pot flows to the DreamDEX ecosystem treasury plus the 2% fee." },
  { category: "squads", q: "Can I leave a Squad Challenge after joining?", a: "No. Once your entry fee is deposited and the round starts, you cannot exit. The entry fee is locked on-chain until resolution." },
  { category: "squads", q: "The Squad share link is not working.", a: "Make sure the challenger app is running and the round has not already expired. Squad deep links (URLs containing ?challenge=) require wallet connection before entering - you will be redirected to the auth page first if not connected." },

  // Creator
  { category: "creator", q: "How do I create a public market?", a: "Click Create Market in the dashboard, switch to the Public Crypto Market tab, select your asset, set a strike price (or use the live sync button), choose a duration (15 or 30 minutes), set your seed collateral, and submit. Your wallet will be prompted to sign the transaction." },
  { category: "creator", q: "What does the Market Fit indicator mean?", a: "The Market Fit indicator shows how realistic your strike price is relative to the current spot price. Green (Optimal) means the strike is within normal 15 - 30 minute volatility range. Yellow (High Volatility) means the strike requires a noticeable breakout. Red means the strike deviates so heavily that liquidity engagement may be very low." },
  { category: "creator", q: "What is seed collateral?", a: "Seed collateral is the tUSDC you provide to bootstrap the initial liquidity pool for your market. Without seed liquidity, no one can trade the market. As creator, you receive an LP allocation from the pool." },
  { category: "creator", q: "Can I edit a market after creating it?", a: "No. Markets are immutable once deployed. The strike price, asset, and duration are locked at creation time. You can create a new market with different parameters." },

  // Resolution
  { category: "resolution", q: "How does market resolution work?", a: "When the round timer hits zero, the system fires a brand-new live API call to Binance (or CoinGecko as fallback) to get the price at that exact moment. This fresh price is compared to the strike - if it is at or above the strike, UP wins; if below, DOWN wins. The on-screen price shown during the round is for display only and does not affect settlement." },
  { category: "resolution", q: "Why did the round resolve at a different price than what was showing on screen?", a: "The resolution price is always a fresh API fetch fired at the exact millisecond the timer expires - not the last displayed price. This means there can be a 1 - 10 second delta between the last screen update and the actual settlement price. This is by design and ensures settlement integrity." },
  { category: "resolution", q: "When do I receive my payout?", a: "Payouts are credited to your tUSDC balance immediately after resolution. A toast notification confirms your win and the payout amount. Your balance refreshes automatically within a few seconds." },
  { category: "resolution", q: "What happens if the oracle fails at resolution time?", a: "The system has four fallback tiers: Binance primary -> CoinGecko fallback -> emergency last-known cache. If all tiers fail, resolution is delayed until the next price update arrives (within 6 - 12 seconds). Markets will not settle on a stale price that is more than 30 seconds old." },

  // Security
  { category: "security", q: "Does FLIP store my private keys?", a: "Never. FLIP is fully non-custodial. Your private keys remain in your browser wallet (MetaMask, Rabby) or within Privy's on-device embedded wallet. FLIP only ever reads your public wallet address." },
  { category: "security", q: "Is my wallet connection safe?", a: "Yes. Wallet connections use the standard EIP-1193 Web3 provider interface. Privy social login uses industry-standard OAuth flows with on-device key generation - your credentials never leave your device." },
  { category: "security", q: "Can FLIP admins change settlement outcomes?", a: "No. Settlement is deterministic and based on public oracle data from Binance and CoinGecko. There are no admin override keys or privileged accounts that can alter any resolution outcome." },
  { category: "security", q: "Is the code open source?", a: "FLIP is built on the @somnia-chain/markets-sdk and DreamDEX Event Contracts, both of which are open source. The FLIP frontend codebase may be shared publicly - check the GitHub links in the footer." },

  // Technical
  { category: "technical", q: "The app is showing a blank screen or not loading.", a: "Try these steps: (1) Hard refresh the page (Ctrl+Shift+R). (2) Clear browser cache. (3) Disable browser extensions that may interfere (ad blockers, privacy tools). (4) Try a different browser. (5) Ensure you are connected to the internet and can reach https://api.infra.testnet.somnia.network." },
  { category: "technical", q: "My wallet transaction is stuck as pending.", a: "Somnia Shannon Testnet may occasionally experience block delays. Wait 30 - 60 seconds. If still stuck, you can speed up or cancel the transaction in MetaMask using the nonce reset approach. If the issue persists, the RPC endpoint may be temporarily congested." },
  { category: "technical", q: "The price feed looks frozen or stuck at one number.", a: "If the live price has not updated in 30+ seconds, the oracle may have hit an API issue. Refresh the page - the LivePriceStreamer will reinitialize and begin polling again. Prices update every 6 seconds under normal conditions." },
  { category: "technical", q: "I connected my wallet but my balance still shows zero.", a: "Ensure your wallet is on Somnia Shannon Testnet (Chain ID: 50312). If so, wait 5 - 10 seconds for the balance to load from chain. If still zero after refreshing, check that you have tUSDC in your wallet on the correct network using the Shannon block explorer." },
  { category: "technical", q: "The QR code for my squad is not showing.", a: "QR codes are generated by api.qrserver.com. If your network blocks this service, the QR code image may fail to load. You can still copy and share the text link - the QR is just a visual aid." },
];

const FAQ = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
      <button onClick={() => setOpen((p) => !p)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "1.1rem 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-black)", lineHeight: 1.5 }}>{q}</span>
        {open ? <ChevronUp size={16} color="var(--color-grey-muted)" style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color="var(--color-grey-muted)" style={{ flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ paddingBottom: "1.1rem", fontSize: "0.88rem", color: "var(--color-grey-text)", lineHeight: 1.7 }}>
          {a}
        </div>
      )}
    </div>
  );
};

export const HelpPage = ({ onBack, onLaunchApp }: HelpPageProps) => {
  const [activeCategory, setActiveCategory] = useState("getting-started");
  const [search, setSearch] = useState("");

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const filtered = search.trim().length > 1
    ? ALL_FAQS.filter((f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
    : ALL_FAQS.filter((f) => f.category === activeCategory);

  const isSearching = search.trim().length > 1;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FFFFFF", color: "var(--color-black)" }}>
      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "var(--color-grey-text)" }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width: "1px", height: "18px", backgroundColor: "rgba(0,0,0,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img src="/assets/flip_full_logo.png" alt="FLIP" style={{ height: "22px", width: "auto" }} />
            <span style={{ fontSize: "0.78rem", color: "var(--color-grey-muted)", fontFamily: "var(--font-terminal)" }}>/ help</span>
          </div>
        </div>
        <button onClick={onLaunchApp} className="btn-launch-black" style={{ padding: "0.5rem 1.1rem", fontSize: "0.8rem" }}>
          <span>Launch App</span><ArrowUpRight size={12} />
        </button>
      </div>

      {/* Hero */}
      <div style={{ backgroundColor: "#FAFAFA", borderBottom: "1px solid rgba(0,0,0,0.07)", padding: "3.5rem 1.5rem 3rem 1.5rem", textAlign: "center" }}>
        <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-terminal)", letterSpacing: "0.1em", color: "var(--color-grey-muted)", fontWeight: 700 }}>HELP CENTER</span>
        <h1 className="font-bobz" style={{ fontSize: "2rem", margin: "0.5rem 0 0.75rem 0", letterSpacing: "-0.02em" }}>How can we help?</h1>
        <p style={{ fontSize: "0.92rem", color: "var(--color-grey-text)", marginBottom: "1.75rem", lineHeight: 1.6 }}>Find answers to common questions about FLIP, trading, wallets, and more.</p>

        {/* Search */}
        <div style={{ maxWidth: "480px", margin: "0 auto", position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-grey-muted)" }} />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "0.8rem 1rem 0.8rem 2.6rem", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.14)", fontSize: "0.9rem", backgroundColor: "#FFFFFF", boxSizing: "border-box", outline: "none" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", maxWidth: "1100px", margin: "0 auto", padding: "0 1rem" }}>
        {/* Desktop Category sidebar */}
        {!isSearching && (
          <aside className="desktop-only" style={{ width: "220px", flexShrink: 0, position: "sticky", top: "58px", height: "calc(100vh - 58px)", overflowY: "auto", padding: "2rem 0", borderRight: "1px solid rgba(0,0,0,0.07)", flexDirection: "column" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--color-grey-muted)", marginBottom: "0.75rem", paddingLeft: "1rem", fontFamily: "var(--font-terminal)" }}>CATEGORIES</div>
            {CATEGORIES.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveCategory(id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 1rem", fontSize: "0.84rem", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderLeft: activeCategory === id ? "2px solid var(--color-black)" : "2px solid transparent", color: activeCategory === id ? "var(--color-black)" : "var(--color-grey-text)", fontWeight: activeCategory === id ? 700 : 400, transition: "all 0.15s" }}>
                <Icon size={13} />{label}
              </button>
            ))}
          </aside>
        )}

        {/* FAQ content */}
        <main style={{ flex: 1, padding: "2rem 1.25rem 6rem 1.25rem", maxWidth: "800px", width: "100%", overflowX: "hidden" }}>
          {/* Mobile Category Chips */}
          {!isSearching && (
            <div className="mobile-only" style={{ overflowX: "auto", scrollbarWidth: "none", gap: "0.45rem", paddingBottom: "1.25rem", marginBottom: "1.5rem", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
              {CATEGORIES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveCategory(id)}
                  className={`mobile-market-chip ${activeCategory === id ? "is-active" : ""}`}
                  style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem" }}
                >
                  <Icon size={12} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}

          {isSearching ? (
            <>
              <div style={{ marginBottom: "1.5rem", fontSize: "0.84rem", color: "var(--color-grey-muted)" }}>
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for <strong>"{search}"</strong>
              </div>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--color-grey-muted)" }}>
                  <HelpCircle size={32} style={{ marginBottom: "1rem", opacity: 0.4 }} />
                  <p style={{ fontSize: "0.9rem" }}>No results found. Try different search terms.</p>
                </div>
              ) : (
                filtered.map((f) => <FAQ key={f.q} q={f.q} a={f.a} />)
              )}
            </>
          ) : (
            <>
              <div style={{ marginBottom: "1.5rem" }}>
                <h2 className="font-bobz" style={{ fontSize: "1.3rem", marginBottom: "0.3rem" }}>
                  {CATEGORIES.find((c) => c.id === activeCategory)?.label}
                </h2>
                <div style={{ width: "32px", height: "2px", backgroundColor: "var(--color-black)" }} />
              </div>
              {filtered.map((f) => <FAQ key={f.q} q={f.q} a={f.a} />)}
            </>
          )}

          {/* Contact section */}
          <div style={{ marginTop: "3rem", padding: "1.5rem", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", backgroundColor: "#FAFAFA" }}>
            <div className="font-bobz" style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>Still need help?</div>
            <p style={{ fontSize: "0.86rem", color: "var(--color-grey-text)", lineHeight: 1.6, marginBottom: "1rem" }}>
              If you did not find your answer above, reach out via the Somnia community channels or check the developer documentation.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <a href="https://docs.dreamdex.io/developers/event-contracts" target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.6rem 1rem", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "6px", textDecoration: "none", fontSize: "0.83rem", fontWeight: 600, color: "var(--color-black)" }}>
                <ExternalLink size={13} /> DreamDEX Docs
              </a>
              <a href="https://t.me/somnianetwork" target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.6rem 1rem", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "6px", textDecoration: "none", fontSize: "0.83rem", fontWeight: 600, color: "var(--color-black)" }}>
                <ExternalLink size={13} /> Somnia Telegram
              </a>
              <a href="https://shannon-explorer.somnia.network" target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.6rem 1rem", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "6px", textDecoration: "none", fontSize: "0.83rem", fontWeight: 600, color: "var(--color-black)" }}>
                <ExternalLink size={13} /> Block Explorer
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
