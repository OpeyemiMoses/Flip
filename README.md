# FLIP ⚡ — High-Velocity Consumer Prediction Protocol on Somnia

> **Somnia × DreamDEX Event Contracts Hackathon Submission**  
> *Track: Event Contracts & Next-Gen Binary Trading*

FLIP is a consumer-grade, ultra-fast binary prediction market application built on **Somnia Shannon Testnet** (Chain ID `50312`) powered by **DreamDEX Event Contracts**. It transforms complex on-chain order books into a fluid, two-tap trading experience with gasless Privy onboarding, viral private squad challenges with sealed odds, and real-time multi-oracle data feeds.

---

## 🌟 Key Innovations & Features

### 1. 2-Tap Binary Trading Interface
- **Complete Set Minting**: Converts \$1.00 tUSDC collateral into `1 UP + 1 DOWN` outcome tokens via DreamDEX Event Contracts.
- **Dynamic Implied Odds**: Pricing denominated in $10^6$ probability units ($900,000 = 90\% = \$0.90$).
- **Instant Settlement**: Winning positions automatically redeem $1:1$ for tUSDC collateral upon round expiry.

### 2. Private Squad PvP Challenges (Sealed Odds Mechanism)
- **Anti-Bias Game Theory**: Players create private wagers (e.g., *BTC $88,000 Breakout*) and share invite links / QR codes.
- **Sealed Odds**: Odds and side distribution remain **completely hidden** from all participants until timer expiry to prevent herd mentality and bias.
- **On-Chain Parimutuel Escrow**: Winners share the pooled deposits of the opposing side directly on Somnia Shannon.

### 3. Frictionless Privy Email OTP & Embedded TSS Wallets
- **Web2 to Web3 Onboarding**: Users log in instantly via Email OTP with an auto-provisioned **Embedded Somnia Wallet**.
- **Web3 Wallet Binding**: Connect and link MetaMask, Coinbase Wallet, Rabby, or Rainbow to your authenticated email profile.
- **Automated Network Switch**: Automatically configures and switches users to Somnia Shannon (`50312`).

### 4. High-Frequency Multi-Oracle Price Streaming (5-Second Sync)
- **Live Feeds**: Direct dual-stream WebSockets from Binance and Coinbase tickers.
- **Pyth Network & Binance Vision**: Sub-second spot prices and TWAP oracle fallbacks with synchronized 5-second store state refreshes.
- **Market-Fit Engine**: Validates target strike prices against real-time spot volatility corridors ($\le 25\%$ optimal corridor) before deploying markets.

---

## 🏗 System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FLIP CLIENT LAYER                                   │
│    Next-Gen Binary Trading UI  •  Private Squad PvP Rooms  •  Community Market Mint    │
└──────────────────┬─────────────────────────────────┬───────────────────────────────────┘
                   │                                 │
                   ▼                                 ▼
┌─────────────────────────────────────┐   ┌──────────────────────────────────────────────┐
│       PRIVY & WEB3 WALLET LAYER     │   │         LIVE ORACLE & TICKER ENGINE          │
│ • Email OTP & Embedded TSS Wallet   │   │ • Binance WS (`stream.binance.com:9443`)     │
│ • Web3 Connect (MetaMask, Rabby)    │   │ • Coinbase WS (`ws-feed.exchange.coinbase`)  │
│ • Somnia Shannon Auto-Switch (50312)│   │ • 5-Second Multi-Asset Sync (BTC, ETH, SOL)  │
└──────────────────┬──────────────────┘   └──────────────────────┬───────────────────────┘
                   │                                             │
                   ▼                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      DREAMDEX EVENT CONTRACTS & SOMNIA SHANNON L1                      │
│                                                                                        │
│  • Binary Markets Module:   0x3ecC694Cef705358864a646142ac17A90E29e388                │
│  • Markets Core & CLOB:     0x2802504314685D89bF6C992CA5a8e7cC78bc0294                │
│  • Binary Settlement:       0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23                │
│  • ERC-6909 Outcome Tokens: 0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9                │
│  • Collateral Router:       0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C                │
│  • tUSDC Collateral Token:  0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📜 Somnia Shannon Testnet Verified Contracts

| Contract Name | Contract Address | Explorer Link |
| :--- | :--- | :--- |
| **Binary Markets Module** | `0x3ecC694Cef705358864a646142ac17A90E29e388` | [Shannon Explorer](https://shannon-explorer.somnia.network/address/0x3ecC694Cef705358864a646142ac17A90E29e388) |
| **Markets Core & Orderbook** | `0x2802504314685D89bF6C992CA5a8e7cC78bc0294` | [Shannon Explorer](https://shannon-explorer.somnia.network/address/0x2802504314685D89bF6C992CA5a8e7cC78bc0294) |
| **Binary Settlement Engine** | `0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23` | [Shannon Explorer](https://shannon-explorer.somnia.network/address/0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23) |
| **ERC-6909 Outcome Tokens** | `0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9` | [Shannon Explorer](https://shannon-explorer.somnia.network/address/0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9) |
| **Collateral Router** | `0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C` | [Shannon Explorer](https://shannon-explorer.somnia.network/address/0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C) |
| **tUSDC Collateral** | `0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E` | [Shannon Explorer](https://shannon-explorer.somnia.network/address/0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E) |

---

## 🚀 Quickstart & Local Setup

### 1. Clone & Install
```bash
git clone <YOUR_REPO_URL>
cd flip
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🏆 Alignment with Hackathon Judging Criteria

- **Innovation & Originality (20%)**: Introduces Private Squad PvP Rooms with sealed odds to solve herd-bias in social prediction wagers, alongside simplified 2-tap binary trading on Somnia.
- **Technical Implementation (25%)**: Complete end-to-end integration of `@somnia-chain/markets-sdk`, DreamDEX Event Contracts, Viem calldata encoding, Privy Email OTP + embedded TSS wallets, and 5-second multi-oracle price feeds.
- **User Experience & Design (20%)**: Custom cyberpunk aesthetic, rise-and-reveal page transitions, real-time pulse tickers, and wallet-gated activity tracking.
- **Business & Ecosystem Impact (20%)**: Drives organic trading volume and transactions onto Somnia Shannon L1 and boosts DreamDEX liquidity pool adoption.
- **Presentation & Demo (15%)**: Clean architecture, comprehensive documentation, and direct testnet explorer links.

---

## 📄 License
MIT License. Built for the Somnia Ecosystem.
