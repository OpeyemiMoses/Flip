# Security Policy

## Supported Versions

We actively release patches and security improvements for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Reporting a Vulnerability

The FLIP team takes the security of decentralized applications, smart contract interactions, and user funds seriously.

If you discover a security vulnerability or exploit vector within FLIP (including client frontend logic, smart contract interfaces, wallet session management, or oracle feeds), **please do NOT open a public GitHub issue.**

### Reporting Process
1. Send a detailed report via encrypted email to:  
   **[security@flip-protocol.io](mailto:security@flip-protocol.io)** or contact lead maintainers directly.
2. Include the following details:
   - **Type of Vulnerability**: (e.g., smart contract reentrancy, oracle arbitrage, client injection, session hijacking).
   - **Severity Assessment**: (Critical, High, Medium, Low).
   - **Step-by-Step Reproduction Steps** or Proof of Concept (PoC) code.
   - **Potential Impact**: Estimated scope of affected funds, transactions, or state integrity.

### Our Commitment
- We will acknowledge receipt of your vulnerability report within **24 hours**.
- We will provide an initial assessment and timeline for a patch within **48 hours**.
- We will coordinate public disclosure only after the vulnerability has been patched and verified on Somnia Shannon testnet and mainnet deployments.

---

## Bug Bounty & Scope

Vulnerabilities eligible for recognition:
- Collateral draining or unauthorized minting / burning of outcome tokens
- Parimutuel settlement manipulation or mathematical fee bypasses
- Oracle front-running or settlement timestamp exploits
- Private key or session leakage via embedded TSS wallet flows

Thank you for helping keep FLIP secure!
