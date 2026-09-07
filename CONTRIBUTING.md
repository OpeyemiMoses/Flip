# Contributing to FLIP Protocol

Thank you for your interest in contributing to **FLIP** — the consumer prediction protocol built on Somnia Shannon Testnet and DreamDEX Event Contracts!

We welcome contributions of all kinds: bug reports, documentation improvements, architectural proposals, UI enhancements, and new on-chain features.

---

## Code of Conduct

All contributors are expected to adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md). Please report any unacceptable behavior to [security@flip-protocol.io](mailto:security@flip-protocol.io).

---

## Development Workflow

### 1. Fork & Clone Repository
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
Ensure your environment points to Somnia Shannon RPC:
```ini
VITE_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
VITE_PRIVY_APP_ID=cm66w9hha01x2k4a827v3r68h
VITE_APP_ENV=testnet
```

### 4. Run Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000`.

---

## Quality Standards & Guidelines

### Design Constraints
1. **No Pill Shapes**: Avoid full rounded-full pills for buttons or cards. Use subtle, consistent corner radiuses.
2. **No Stickers or Flat Cliparts**: Keep visual hierarchy clean, crisp, and data-driven.
3. **No Decorative Gradients**: Use flat, intentional token colors (`#00C278` green, `#FF4444` red, `#111827` dark).
4. **Authentic Price Precision**: Do not introduce artificial decimals into integer-denominated prediction questions or strikes.

### TypeScript & Linting
Ensure your code strictly typechecks with zero errors before opening a PR:
```bash
npm run build
```

### Executing On-Chain Test Scripts
Test your changes against Somnia Shannon testnet:
```bash
# Verify DreamDEX market & pool discovery
npm run test:discover

# Verify complete mint -> order -> fill -> cancel lifecycle
npm run test:lifecycle

# Verify resolution & collateral payout redemption
npm run test:redeem
```

---

## Submitting a Pull Request

1. **Branch Naming**:
   - `feat/feature-name` for new features
   - `fix/bug-description` for bug fixes
   - `docs/documentation-update` for docs
   - `perf/optimization` for performance improvements

2. **Commit Messages**:
   Use conventional commit format:
   ```
   feat: add dynamic strike pricing engine
   fix: resolve spot price rate limit lock
   docs: update parimutuel fee specifications
   ```

3. **Open Pull Request**:
   Fill out the [Pull Request Template](./.github/PULL_REQUEST_TEMPLATE.md) completely with verification screenshots and test results.

---

## Reporting Issues

Use our GitHub Issue Tracker:
- [Report a Bug](https://github.com/OpeyemiMoses/Flip/issues/new?template=bug_report.md)
- [Request a Feature](https://github.com/OpeyemiMoses/Flip/issues/new?template=feature_request.md)
