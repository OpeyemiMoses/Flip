import React, { useState, useEffect } from "react";
import {
  ArrowLeft, BookOpen, Zap, TrendingUp, Users, Shield, Code2, Layers,
  Clock, Coins, ArrowUpRight, ExternalLink, Terminal,
} from "lucide-react";

interface DocsPageProps {
  onBack: () => void;
  onLaunchApp: () => void;
}

const NAV_SECTIONS = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "architecture", label: "Architecture", icon: Layers },
  { id: "markets", label: "Binary Markets", icon: TrendingUp },
  { id: "resolution", label: "Resolution & Oracle", icon: Clock },
  { id: "squads", label: "Squad Challenges", icon: Users },
  { id: "creator", label: "Market Creator", icon: Zap },
  { id: "tokens", label: "Tokens & Economy", icon: Coins },
  { id: "security", label: "Security", icon: Shield },
  { id: "sdk", label: "Developer SDK", icon: Code2 },
  { id: "network", label: "Network Reference", icon: Terminal },
];

const SectionHeader = ({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) => (
  <div style={{ marginBottom: "2rem" }}>
    <span style={{ fontSize: "0.78rem", fontFamily: "var(--font-number)", color: "var(--color-grey-muted)", letterSpacing: "0.06em" }}>
      {number} //
    </span>
    <h2 className="font-bobz" style={{ fontSize: "1.55rem", margin: "0.3rem 0 0.5rem 0", color: "var(--color-black)", letterSpacing: "-0.01em" }}>
      {title}
    </h2>
    {subtitle && <p style={{ fontSize: "0.92rem", color: "var(--color-grey-text)", lineHeight: 1.6, maxWidth: "640px" }}>{subtitle}</p>}
    <div style={{ width: "40px", height: "2px", backgroundColor: "var(--color-black)", marginTop: "0.8rem" }} />
  </div>
);

const CodeBlock = ({ code, language = "code" }: { code: string; language?: string }) => (
  <div style={{ backgroundColor: "#0D0D0D", borderRadius: "8px", padding: "1.25rem 1.5rem", marginBottom: "1.25rem", overflowX: "auto" }}>
    <div style={{ fontSize: "0.7rem", color: "#666", marginBottom: "0.75rem", fontFamily: "var(--font-terminal)", letterSpacing: "0.08em" }}>{language.toUpperCase()}</div>
    <pre style={{ margin: 0, fontFamily: "var(--font-terminal)", fontSize: "0.82rem", color: "#E8E8E8", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{code}</pre>
  </div>
);

const InfoBox = ({ type = "info", children }: { type?: "info" | "warning" | "tip"; children: React.ReactNode }) => {
  const colors = {
    info: { bg: "#F0F4FF", border: "#BFCFFF", text: "#1A3080" },
    warning: { bg: "#FFFBEB", border: "#FCD34D", text: "#92400E" },
    tip: { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46" },
  };
  const c = colors[type];
  return (
    <div style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, borderRadius: "8px", padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
      <p style={{ margin: 0, fontSize: "0.87rem", color: c.text, lineHeight: 1.6 }}>{children}</p>
    </div>
  );
};

export const DocsPage = ({ onBack, onLaunchApp }: DocsPageProps) => {
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) setActiveSection(entry.target.id); }),
      { rootMargin: "-20% 0px -70% 0px" }
    );
    NAV_SECTIONS.forEach(({ id }) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

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
            <span style={{ fontSize: "0.78rem", color: "var(--color-grey-muted)", fontFamily: "var(--font-terminal)" }}>/ docs</span>
          </div>
        </div>
        <button onClick={onLaunchApp} className="btn-launch-black" style={{ padding: "0.5rem 1.1rem", fontSize: "0.8rem" }}>
          <span>Launch App</span><ArrowUpRight size={12} />
        </button>
      </div>

      <div style={{ display: "flex", maxWidth: "1280px", margin: "0 auto", padding: "0 1rem" }}>
        {/* Desktop Sidebar */}
        <aside className="desktop-only" style={{ width: "220px", flexShrink: 0, position: "sticky", top: "58px", height: "calc(100vh - 58px)", overflowY: "auto", padding: "2rem 0", borderRight: "1px solid rgba(0,0,0,0.07)", flexDirection: "column" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--color-grey-muted)", marginBottom: "0.75rem", paddingLeft: "1rem", fontFamily: "var(--font-terminal)" }}>DOCUMENTATION</div>
          {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setActiveSection(id); }}
              style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 1rem", fontSize: "0.84rem", textDecoration: "none", borderLeft: activeSection === id ? "2px solid var(--color-black)" : "2px solid transparent", color: activeSection === id ? "var(--color-black)" : "var(--color-grey-text)", fontWeight: activeSection === id ? 700 : 400, transition: "all 0.15s" }}>
              <Icon size={13} />{label}
            </a>
          ))}
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: "2rem 1.25rem 6rem 1.25rem", maxWidth: "840px", width: "100%", overflowX: "hidden" }}>

          {/* Mobile Horizontal Section Navigator */}
          <div className="mobile-only" style={{ overflowX: "auto", scrollbarWidth: "none", gap: "0.45rem", paddingBottom: "1.25rem", marginBottom: "1.5rem", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                  setActiveSection(id);
                }}
                className={`mobile-market-chip ${activeSection === id ? "is-active" : ""}`}
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem" }}
              >
                <Icon size={12} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <section id="overview" style={{ marginBottom: "5rem" }}>
            <SectionHeader number="01" title="What is FLIP?" subtitle="FLIP is a high-velocity binary prediction market protocol built on Somnia's L1 blockchain, powered by DreamDEX Event Contracts for on-chain settlement." />
            <p style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "var(--color-grey-text)", marginBottom: "1rem" }}>
              FLIP lets anyone trade short-interval crypto price predictions - flipping UP or DOWN on BTC, ETH, SOL, SOMI, and SUI with 15-minute resolution windows. Every round settles via a fresh live oracle call at the exact moment the timer hits zero, never using cached or on-screen prices.
            </p>
            <p style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "var(--color-grey-text)", marginBottom: "1.5rem" }}>
              Beyond standard markets, FLIP lets users create their own public crypto prediction markets and launch Private Squad Challenges - invite-only rooms where friends bet against each other with QR-code sharing and on-chain parimutuel settlement.
            </p>
            <InfoBox type="tip">FLIP runs on the Somnia Shannon Testnet (Chain ID: 50312) and uses tUSDC as collateral. All trades are signed through your connected wallet and broadcast to the Somnia L1.</InfoBox>
            <div className="landing-grid-3col" style={{ marginTop: "1.5rem" }}>
              {[
                { label: "15-Min Markets", desc: "Short-interval binary predictions on live crypto prices" },
                { label: "Squad Challenges", desc: "Private parimutuel rooms with QR-code invite links" },
                { label: "Market Creator", desc: "Deploy your own community prediction market in seconds" },
              ].map((c) => (
                <div key={c.label} style={{ padding: "1rem", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.4rem" }}>{c.label}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--color-grey-text)", lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section id="architecture" style={{ marginBottom: "5rem" }}>
            <SectionHeader number="02" title="Architecture" subtitle="FLIP is a full-stack prediction market built in React + TypeScript, connected to Somnia Shannon L1 via viem and the @somnia-chain/markets-sdk." />
            <div style={{ borderLeft: "2px solid rgba(0,0,0,0.1)", paddingLeft: "1.5rem", marginBottom: "1.5rem" }}>
              {[
                { title: "Price Oracle Layer", desc: "LivePriceStreamer polls Binance Vision (primary) and CoinGecko (fallback) every 6 seconds. SOMI is always fetched from CoinGecko directly since it is not listed on Binance." },
                { title: "State Management", desc: "Zustand marketStore holds all market state, positions, balances, and resolution logic. It subscribes to the oracle stream and triggers resolution at timer expiry." },
                { title: "Settlement Engine", desc: "When a market expires, checkAndRolloverMarkets() fires a fresh API call at that exact millisecond. Settlement price is always a live fetch - never the on-screen display value." },
                { title: "On-Chain Layer", desc: "DreamDEX Event Contracts on Somnia Shannon handle escrow, parimutuel accounting, and settlement. Transactions are signed via Privy or injected wallet." },
              ].map((item, i) => (
                <div key={item.title} style={{ marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.84rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                    <span style={{ color: "var(--color-grey-muted)", marginRight: "0.5rem", fontFamily: "var(--font-terminal)" }}>{String(i + 1).padStart(2, "0")}</span>{item.title}
                  </div>
                  <div style={{ fontSize: "0.86rem", color: "var(--color-grey-text)", lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <CodeBlock language="architecture" code={`FLIP Frontend (React + TypeScript)
  |
  +-- livePriceStream.ts       -> Oracle: Binance primary / CoinGecko fallback
  +-- marketStore.ts (Zustand) -> State + resolution engine
  +-- dreamdex.ts              -> DreamDEX SDK + market initialization
  +-- tradingEngine.ts         -> Position management + PnL
  +-- challengeEngine.ts       -> Squad room creation + parimutuel math
  +-- walletSigner.ts          -> Wallet tx + signature requests
       |
  Somnia Shannon RPC
       |
  @somnia-chain/markets-sdk    -> DreamDEX Event Contracts
  Privy Auth                   -> Embedded wallet / social login`} />
          </section>

          <section id="markets" style={{ marginBottom: "5rem" }}>
            <SectionHeader number="03" title="Binary Markets" subtitle="FLIP operates five canonical 15-minute markets on BTC, ETH, SOL, SOMI, and SUI. Each round resolves with a fresh live oracle price." />
            <p style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "var(--color-grey-text)", marginBottom: "1.25rem" }}>
              Each market displays a Strike Price - the level the asset must finish above (UP) or below (DOWN) for a position to win. The strike is set at round open using a volatility-calibrated offset from the live spot price.
            </p>
            <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(0,0,0,0.1)" }}>
                    {["Asset", "Symbol", "Duration", "15m Strike Offset", "Oracle Source"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "0.6rem 0.75rem", fontWeight: 700, fontSize: "0.75rem", color: "var(--color-grey-muted)", fontFamily: "var(--font-terminal)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Bitcoin", "BTC", "15 min", "+/- $20 to $55", "Binance BTCUSDT"],
                    ["Ethereum", "ETH", "15 min", "+/- $2 to $5", "Binance ETHUSDT"],
                    ["Solana", "SOL", "15 min", "+/- $0.40 to $0.80", "Binance SOLUSDT"],
                    ["Somnia", "SOMI", "15 min", "+/- $0.0015 to $0.003", "CoinGecko (somnia)"],
                    ["Sui", "SUI", "15 min", "+/- $0.002 to $0.004", "Binance SUIUSDT"],
                  ].map((row, i) => (
                    <tr key={row[0]} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", backgroundColor: i % 2 === 0 ? "transparent" : "#FAFAFA" }}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: "0.6rem 0.75rem", color: j === 0 ? "var(--color-black)" : "var(--color-grey-text)", fontFamily: j >= 2 ? "var(--font-terminal)" : "inherit", fontSize: "0.82rem" }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>How to Trade</h3>
            <ol style={{ paddingLeft: "1.25rem", fontSize: "0.9rem", color: "var(--color-grey-text)", lineHeight: 2 }}>
              <li>Select a market from the sidebar (BTC, ETH, SOL, SOMI, or SUI)</li>
              <li>Review the live price, strike price, and time remaining</li>
              <li>Pick your collateral amount in tUSDC</li>
              <li>Click FLIP UP if price closes above strike, or FLIP DOWN if below</li>
              <li>Approve the wallet transaction on Somnia Shannon</li>
              <li>When the timer hits zero, the oracle settles the round and winners are paid out</li>
            </ol>
            <InfoBox type="info">Shares are minted at the implied probability. If UP is at $0.52 per share and you wager $25, you mint ~48 shares. If UP wins, each share redeems for $1 - payout of $48.</InfoBox>
          </section>

          <section id="resolution" style={{ marginBottom: "5rem" }}>
            <SectionHeader number="04" title="Resolution & Oracle" subtitle="Markets settle using a fresh live oracle fetch fired at the exact millisecond the timer expires - never the on-screen display price." />
            <CodeBlock language="resolution flow" code={`Timer hits 0
  -> checkAndRolloverMarkets() fires
  -> hasExpiredMarket = true
  -> LIVE API CALL: livePriceStreamer.fetchRestPrices()
      -> Primary: Binance Vision 24hr ticker
      -> Fallback: CoinGecko Simple Price API
  -> settlementPrice = freshOraclePrices[asset].price
  -> winningSide = settlementPrice >= strikePrice ? "UP" : "DOWN"
  -> TradingEngine.resolvePositionsForMarket(marketId, winningSide)
  -> Next round spawns with new strike anchored to settlement price`} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              {[
                { tier: "Tier 1 - Primary", source: "Binance Vision", desc: "Real-time tick data, no rate limits. Used for BTC, ETH, SOL, SUI.", color: "#065F46", bg: "#ECFDF5" },
                { tier: "Tier 1b - SOMI only", source: "CoinGecko", desc: "SOMI is not listed on Binance. Always fetched from CoinGecko separately.", color: "#1A3080", bg: "#F0F4FF" },
                { tier: "Tier 2 - Fallback", source: "CoinGecko (all)", desc: "Activates only if Binance completely fails for all assets.", color: "#92400E", bg: "#FFFBEB" },
                { tier: "Emergency Cache", source: "Last Known Price", desc: "If all fetches fail, last successfully fetched price is used rather than blocking resolution.", color: "#4B1818", bg: "#FEF2F2" },
              ].map((t) => (
                <div key={t.tier} style={{ padding: "1rem", backgroundColor: t.bg, borderRadius: "8px", border: `1px solid ${t.color}30` }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: t.color, fontFamily: "var(--font-terminal)", marginBottom: "0.35rem" }}>{t.tier}</div>
                  <div style={{ fontSize: "0.84rem", fontWeight: 700, marginBottom: "0.3rem" }}>{t.source}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--color-grey-text)", lineHeight: 1.5 }}>{t.desc}</div>
                </div>
              ))}
            </div>
            <InfoBox type="tip">The ~$15 - $80 gap between FLIP and CoinGecko is expected. FLIP uses Binance's single-exchange price; CoinGecko aggregates across 1,499 exchanges. Both are correct - they represent different market data pools.</InfoBox>
          </section>

          <section id="squads" style={{ marginBottom: "5rem" }}>
            <SectionHeader number="05" title="Squad Challenges" subtitle="Private invite-only rooms where friends bet against each other with on-chain parimutuel settlement and QR-code invites." />
            <p style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "var(--color-grey-text)", marginBottom: "1.25rem" }}>
              Squad Challenges are FLIP's social layer. Create a room, set the asset, strike, entry fee, max players, pick your side, and share the QR code. Anyone who joins takes the opposing side. At round expiry, fresh oracle data settles the outcome.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {[
                { scenario: "All squad members WIN", outcome: "Deposits paid out net of 2% protocol + ecosystem fee." },
                { scenario: "All squad members LOSE", outcome: "Pot flows into DreamDEX ecosystem treasury plus 2% protocol fee." },
                { scenario: "Mixed results", outcome: "Losers' pot is shared among winners proportional to their stake, minus 2% fee." },
              ].map((r) => (
                <div key={r.scenario} style={{ display: "flex", gap: "1rem", padding: "0.85rem 1rem", border: "1px solid rgba(0,0,0,0.07)", borderRadius: "8px" }}>
                  <div style={{ flexShrink: 0, width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-green)", marginTop: "5px" }} />
                  <div>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700, marginBottom: "0.2rem" }}>{r.scenario}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--color-grey-text)" }}>{r.outcome}</div>
                  </div>
                </div>
              ))}
            </div>
            <InfoBox type="warning">Squad duration options: 15 min, 30 min, 1 hour, 4 hours. The creator's entry fee is locked at creation and cannot be recovered once the round starts.</InfoBox>
          </section>

          <section id="creator" style={{ marginBottom: "5rem" }}>
            <SectionHeader number="06" title="Market Creator" subtitle="Anyone can deploy a public binary prediction market on FLIP with a custom asset, strike price, and seed liquidity." />
            <p style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "var(--color-grey-text)", marginBottom: "1.25rem" }}>
              Public markets work identically to canonical markets - live oracle feed, auto-resolving timer, and parimutuel order book. The creator sets the initial parameters and seeds the liquidity.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {[
                { param: "Asset", detail: "BTC, ETH, SOL, SOMI, or SUI - price is fetched live from oracle at creation time" },
                { param: "Strike Price", detail: "Auto-synced to live spot on modal open. Editable manually. Market Fit indicator shows if strike is realistic." },
                { param: "Round Duration", detail: "15 minutes or 30 minutes. Timer starts immediately on creation." },
                { param: "Seed Collateral", detail: "tUSDC amount that seeds the initial pool liquidity. Creator receives the LP allocation." },
              ].map((r) => (
                <div key={r.param} style={{ display: "flex", gap: "1rem", padding: "0.85rem 1rem", border: "1px solid rgba(0,0,0,0.07)", borderRadius: "8px" }}>
                  <div style={{ minWidth: "110px", fontSize: "0.82rem", fontWeight: 700 }}>{r.param}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--color-grey-text)", lineHeight: 1.55 }}>{r.detail}</div>
                </div>
              ))}
            </div>
          </section>

          <section id="tokens" style={{ marginBottom: "5rem" }}>
            <SectionHeader number="07" title="Tokens & Economy" subtitle="FLIP runs on the Somnia Shannon Testnet economy with STT for gas and tUSDC for collateral." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { token: "STT", name: "Somnia Testnet Token", desc: "Native gas token of Somnia Shannon. Required to pay transaction fees for all FLIP interactions.", source: "Get from Somnia Telegram Faucet" },
                { token: "tUSDC", name: "Testnet USDC", desc: "ERC-20 collateral token used for all wagers and payouts. 6 decimal precision. All pools denominate in tUSDC.", source: "Claim In-App at Portfolio Analytics or Telegram Faucet" },
              ].map((t) => (
                <div key={t.token} style={{ padding: "1.25rem", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.65rem" }}>
                    <span className="font-mono" style={{ fontSize: "1.1rem", fontWeight: 800 }}>{t.token}</span>
                    <span style={{ fontSize: "0.78rem", color: "var(--color-grey-muted)" }}>{t.name}</span>
                  </div>
                  <p style={{ fontSize: "0.84rem", color: "var(--color-grey-text)", lineHeight: 1.6, marginBottom: "0.75rem" }}>{t.desc}</p>
                  <div style={{ fontSize: "0.76rem", color: "var(--color-green)", fontWeight: 600 }}>- {t.source}</div>
                </div>
              ))}
            </div>
            <InfoBox type="info">Need tUSDC to test? Scroll down to the <strong>Portfolio Analytics</strong> section on the main trading dashboard and click <strong>"GET 100 tUSDC (FAUCET)"</strong> to mint testnet collateral directly to your connected wallet.</InfoBox>
          </section>

          <section id="security" style={{ marginBottom: "5rem" }}>
            <SectionHeader number="08" title="Security" subtitle="FLIP is a testnet application. All interactions carry testnet risk - real assets are never at stake." />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {[
                { title: "Testnet Only", desc: "Runs exclusively on Somnia Shannon Testnet (Chain ID: 50312). tUSDC and STT have no real-world monetary value." },
                { title: "Non-Custodial", desc: "FLIP never holds private keys. All transactions are signed in your wallet and broadcast directly to the Somnia L1 RPC." },
                { title: "Oracle Integrity", desc: "Resolution prices are fetched fresh from Binance Vision's public API at the exact second the timer fires. The UI display is for reference only." },
                { title: "Auth via Privy", desc: "Social login is powered by Privy's embedded wallet infrastructure. Sessions are signed on-device and verified against the connected wallet address." },
                { title: "No Admin Keys", desc: "Market resolution is deterministic and based on public oracle data. No admin override keys or privileged accounts can alter settlement outcomes." },
              ].map((item) => (
                <div key={item.title} style={{ display: "flex", gap: "1rem", padding: "1rem", border: "1px solid rgba(0,0,0,0.07)", borderRadius: "8px" }}>
                  <Shield size={16} style={{ flexShrink: 0, marginTop: "2px", color: "var(--color-green)" }} />
                  <div>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700, marginBottom: "0.2rem" }}>{item.title}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--color-grey-text)", lineHeight: 1.55 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="sdk" style={{ marginBottom: "5rem" }}>
            <SectionHeader number="09" title="Developer SDK" subtitle="FLIP is built on the @somnia-chain/markets-sdk - the official DreamDEX Event Contracts SDK for Somnia." />
            <CodeBlock language="typescript" code={`import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

export const dreamdex = new SomniaMarkets({
  indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
  chain: somniaShannon,
  wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
  addresses: SOMNIA_TESTNET_ADDRESSES,
});`} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {[
                { label: "FLIP Live Web App (Vercel)", url: "https://flip-prediction.vercel.app/" },
                { label: "FLIP High-Availability Mirror (Railway)", url: "https://flip-production-63c7.up.railway.app/" },
                { label: "DreamDEX Documentation", url: "https://docs.dreamdex.io/developers/event-contracts" },
                { label: "DreamDEX Bot Kit (GitHub)", url: "https://github.com/somnia-chain/dreamdex-bot-kit" },
                { label: "Hackathon Starter Template", url: "https://github.com/IronicDeGawd/ec-dreamdex-hackathon-template" },
                { label: "DreamBot Builder", url: "https://dreambot-builder.vercel.app/" },
                { label: "Shannon Block Explorer", url: "https://shannon-explorer.somnia.network" },
              ].map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", textDecoration: "none", color: "var(--color-black)", fontSize: "0.86rem", fontWeight: 600 }}>
                  <span>{link.label}</span><ExternalLink size={13} color="var(--color-grey-muted)" />
                </a>
              ))}
            </div>
          </section>

          <section id="network" style={{ marginBottom: "5rem" }}>
            <SectionHeader number="10" title="Network Reference" subtitle="All FLIP transactions run on Somnia Shannon Testnet. Add these parameters to your wallet." />
            <CodeBlock language="network config" code={`Network Name:    Somnia Shannon Testnet
Chain ID:        50312 (0xC488)
Currency:        STT
RPC URL:         https://api.infra.testnet.somnia.network
WebSocket RPC:   wss://api.infra.testnet.somnia.network/ws
Block Explorer:  https://shannon-explorer.somnia.network
Faucet:          https://t.me/somnianetwork (Telegram)

Collateral:      tUSDC (ERC-20, 6 decimals)
DreamDEX:        https://dev.smk.somnia.host/v1/graphql (Indexer)`} />
            <InfoBox type="info">You need STT for gas and tUSDC for trading. Claim STT from the official Somnia Telegram faucet bot, and claim 100 tUSDC directly in the FLIP app by scrolling down to the <strong>Portfolio Analytics</strong> section.</InfoBox>
          </section>

        </main>
      </div>
    </div>
  );
};
