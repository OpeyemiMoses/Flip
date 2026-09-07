# FLIP ⚡ — High-Velocity Consumer Prediction Protocol on Somnia

> **Somnia × DreamDEX Event Contracts Submission**  
> *Track: Event Contracts & Next-Gen Binary Trading*  
> *Network: Somnia Shannon Testnet (`Chain ID: 50312`)*

FLIP is a consumer-grade, ultra-fast binary prediction market application built natively on **Somnia Shannon Testnet** and powered by **DreamDEX Event Contracts**. It transforms complex on-chain order books and parimutuel pools into a fluid, two-tap trading experience with frictionless Privy email onboarding, viral private squad challenges with sealed odds, and real-time sub-150ms spot price feeds.

---

## 🌟 Key Innovations & Architecture

### 1. 2-Tap Binary Trading Interface
- **Complete Set Minting**: Converts \$1.00 tUSDC collateral into `1 UP + 1 DOWN` ERC-6909 outcome tokens via DreamDEX Event Contracts.
- **Dynamic Implied Odds**: Pricing denominated in $10^6$ probability units ($900,000 = 90\% = \$0.90$).
- **Instant Settlement**: Winning positions automatically redeem $1:1$ for tUSDC collateral upon round expiry.

### 2. Private Squad PvP Challenges (Sealed Odds Mechanism)
- **Anti-Bias Game Theory**: Players create private wagers (e.g., *BTC Breakout*) and share instant QR codes or room links.
- **Sealed Odds**: Odds and side distribution remain **completely hidden** from all participants until timer expiry to prevent herd mentality and social bias.
- **On-Chain Parimutuel Escrow**: Winners share the pooled deposits of the opposing side directly on Somnia Shannon net of standard **2% protocol & ecosystem fee**.

### 3. Dynamic Rollover & Volatility-Tailored Strikes
- **Clean Integer Strike Engine**: Strips artificial decimal fragments from prediction questions (e.g. `$79,483`, `$79,521`, `$2,492`, `$106`).
- **Anchored Close Reference**: Automatically calculates the subsequent round target from the authentic closing spot price and momentum direction of the previous epoch.

### 4. Zero-Latency Multi-Exchange Price Streaming (<150ms)
- **High-Throughput Exchange Feeds**: Real-time spot prices streamed via Gate.io and Huobi/HTX global ticker engines with zero CORS issues and zero rate limits.
- **Instant Settlement Oracle**: Direct REST settlement queries against spot market prices at the exact second of epoch expiration.

### 5. Frictionless Privy Email OTP & Embedded TSS Wallets
- **Web2 to Web3 Onboarding**: Users log in instantly via Email OTP with an auto-provisioned **Embedded Somnia Wallet**.
- **Web3 Wallet Binding**: Connect and link MetaMask, Coinbase Wallet, Rabby, or Rainbow.
- **Automated Network Switch**: Automatically configures and switches users to Somnia Shannon (`50312`).

---

## 📐 Mathematical Model & Settlement Specification

### 1. Parimutuel Pool Equilibrium ($1.00 USDso Parity)
Every binary market guarantees mathematical conservation of collateral:
$$\text{Pool Collateral} = \sum \text{Invested}_{\text{UP}} + \sum \text{Invested}_{\text{DOWN}}$$
$$\text{Winning Share Payout} = \frac{\text{Total Distributable Pot}}{\text{Total Winning Shares}} = \$1.00 \text{ tUSDC per winning contract}$$

### 2. Squad Parimutuel Distribution Logic
- **Unanimous Win Scenario** ($\text{Winners} = \text{Total Squad}$):
  $$\text{Payout}_i = \text{Deposit}_i \times (1 - 0.02)$$
  *All participants receive their stake back net of the 2% protocol & ecosystem fee.*
- **Unanimous Loss Scenario** ($\text{Losers} = \text{Total Squad}$):
  $$\text{Protocol Fee} = \text{Total Pot} \times 0.02, \quad \text{Ecosystem Pot} = \text{Total Pot} \times 0.98$$
- **Mixed Win / Loss Scenario**:
  $$\text{Distributable Pot} = \text{Losers Pot} \times (1 - 0.02)$$
  $$\text{Payout}_w = \text{Deposit}_w + \left( \text{Distributable Pot} \times \frac{\text{Deposit}_w}{\sum \text{Deposit}_{\text{Winners}}} \right)$$

---

## 📜 Somnia Shannon Testnet Verified Contracts

| Contract Name | Contract Address | Explorer Link |
| :--- | :--- | :--- |
| **Binary Markets Module** | `0x3ecC694Cef705358864a646142ac17A90E29e388` | [Shannon Explorer](https://shannon-explorer.somnia.network/address/0x3ecC694Cef705358864a646142ac17A90E29e388) |
| **Markets Core & Orderbook** | `0x2802504314685D89bF6C992CA5a8e7cC78bc0294` | [Shannon Explorer](https://shannon-explorer.somnia.network/address/0x2802504314685D89bF6C992CA5a8e7cC78bc0294) |
| **Binary Settlement Engine** | `0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23` | [Shannon Explorer](https://shannon-explorer.somnia.network/address/0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23) |
| **ERC-6909 Outcome Tokens** | `0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9` | [Shannon Explorer](https://shannon-explorer.somnia.network/address/0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9) |
| **Collateral Router** | `0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C` | [Shannon Explorer](https://shannon-explorer.somnia.network/address/0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C) |
| **tUSDC Collateral Token** | `0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E` | [Shannon Explorer](https://shannon-explorer.somnia.network/address/0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E) |

---

## 🚀 Quickstart & Local Setup

### 1. Clone Repository
```bash
git clone https://github.com/OpeyemiMoses/Flip.git
cd Flip
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your configuration matches Somnia Shannon:
```ini
VITE_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
VITE_PRIVY_APP_ID=cm66w9hha01x2k4a827v3r68h
VITE_APP_ENV=testnet
```

### 4. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 On-Chain Test Suites

Execute verification scripts against Somnia Shannon testnet:

```bash
# 1. Query live DreamDEX binary pools and check network block height
npm run test:discover

# 2. Test full event contracts lifecycle (mintSet -> maker -> taker -> cancel)
npm run test:lifecycle

# 3. Test epoch resolution and winning collateral redemption
npm run test:redeem

# 4. Production build and TypeScript validation
npm run build
```

---

## 📂 Repository Standards & Community

- **[Code of Conduct](./CODE_OF_CONDUCT.md)**: Community standards and harassment-free pledge.
- **[Contributing Guidelines](./CONTRIBUTING.md)**: Development workflow, design constraints, and PR submission process.
- **[Security Policy](./SECURITY.md)**: Responsible vulnerability disclosure and bug bounty guidelines.
- **[License](./LICENSE)**: Open-source licensed under the MIT License.
