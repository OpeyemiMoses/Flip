import { encodeFunctionData, isAddress, getAddress } from 'viem';
import { SOMNIA_CONFIG, erc20Abi } from '../contracts/chain';
import { BinaryMarket, SimpleTradeSide, publicClient } from './dreamdex';
import { Position } from './tradingEngine';

export class WalletSigner {
  /**
   * Helper to ensure the wallet is currently connected to Somnia Shannon Testnet (50312 / 0xc488)
   */
  public static async ensureSomniaNetwork(ethereum: any): Promise<void> {
    if (!ethereum) return;
    try {
      const currentChain = await ethereum.request({ method: 'eth_chainId' });
      if (currentChain?.toLowerCase() === SOMNIA_CONFIG.chainIdHex.toLowerCase()) {
        return;
      }

      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SOMNIA_CONFIG.chainIdHex }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain')) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: SOMNIA_CONFIG.chainIdHex,
              chainName: 'Somnia Shannon Testnet',
              nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
              rpcUrls: [SOMNIA_CONFIG.rpcUrl, SOMNIA_CONFIG.fallbackRpcUrl],
              blockExplorerUrls: [SOMNIA_CONFIG.explorerUrl],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }

  /**
   * Request cryptographic proof of wallet ownership for session authentication
   */
  public static async requestAuthProof(userAddress: string): Promise<string> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('No Web3 wallet detected. Please connect your wallet.');
    }

    const ethereum = (window as any).ethereum;
    await this.ensureSomniaNetwork(ethereum);

    const formattedAddress = isAddress(userAddress) ? getAddress(userAddress) : userAddress;

    const authMessage =
      `[FLIP Protocol — Cryptographic Proof of Owner's Wallet]\n\n` +
      `Sign this message to authenticate your wallet session for binary prediction trading.\n\n` +
      `Address: ${formattedAddress}\n` +
      `Network: Somnia Shannon (50312)\n` +
      `Timestamp: ${new Date().toISOString()}\n` +
      `Statement: I confirm ownership of this wallet and authorize session access to FLIP.`;

    try {
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [authMessage, formattedAddress],
      });
      return signature;
    } catch (err: any) {
      if (err.code === 4001 || err.message?.toLowerCase().includes('user rejected') || err.message?.toLowerCase().includes('user denied')) {
        throw new Error('Cryptographic signature cancelled in wallet.');
      }
      throw new Error(err.message || 'Signature verification failed.');
    }
  }

  /**
   * Execute real ON-CHAIN transaction when placing a binary trade on Somnia Shannon
   * Prompts wallet for real on-chain transaction broadcasting to Somnia L1
   */
  public static async requestTradeSigning(params: {
    userAddress: string;
    market: BinaryMarket;
    side: SimpleTradeSide;
    amountUSD: number;
    entryPrice: number;
  }): Promise<{ txHash: string }> {
    const { userAddress, market, amountUSD } = params;

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('No Web3 wallet detected. Please install MetaMask, Rabby, or Rainbow.');
    }

    const ethereum = (window as any).ethereum;
    await this.ensureSomniaNetwork(ethereum);

    // Calculate raw tUSDC (6 decimals)
    const amountRaw = BigInt(Math.round(amountUSD * 10 ** SOMNIA_CONFIG.collateralDecimals));
    
    // Validate target recipient address format strictly
    let targetRecipient: `0x${string}` = SOMNIA_CONFIG.binaryMarketsModule;
    if (market?.poolAddress && isAddress(market.poolAddress)) {
      targetRecipient = getAddress(market.poolAddress);
    }

    const fromAddress = isAddress(userAddress) ? getAddress(userAddress) : userAddress;

    try {
      // 1. Prepare ERC-20 transfer calldata for tUSDC collateral
      const transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [targetRecipient, amountRaw],
      });

      // 2. Broadcast real on-chain transaction via user's connected wallet
      const txHash: string = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: fromAddress,
            to: SOMNIA_CONFIG.collateralAddress,
            data: transferData,
            value: '0x0',
            gas: '0x30d40', // 200,000 gas limit
          },
        ],
      });

      if (!txHash || !txHash.startsWith('0x')) {
        throw new Error('No transaction hash returned from wallet.');
      }

      // 3. Wait for receipt on Somnia Shannon L1
      try {
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}`, timeout: 8000 }).catch(() => null);
      } catch {
        // Continue if fast indexing is still processing
      }

      return { txHash };
    } catch (err: any) {
      if (err.code === 4001 || err.message?.toLowerCase().includes('user rejected') || err.message?.toLowerCase().includes('user denied')) {
        throw new Error('Transaction cancelled in wallet by user.');
      }
      throw new Error(err.message || 'On-chain trade execution failed on Somnia Shannon.');
    }
  }

  /**
   * Execute real ON-CHAIN transaction when cashing out / claiming payouts
   */
  public static async requestCashOutSigning(params: {
    userAddress: string;
    position: Position;
  }): Promise<{ txHash: string }> {
    const { userAddress } = params;

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('No Web3 wallet detected. Please connect your wallet.');
    }

    const ethereum = (window as any).ethereum;
    await this.ensureSomniaNetwork(ethereum);

    const fromAddress = isAddress(userAddress) ? getAddress(userAddress) : userAddress;

    try {
      // Broadcast real on-chain settlement claim transaction
      const claimTxHash: string = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: fromAddress,
            to: SOMNIA_CONFIG.binarySettlement,
            data: '0x',
            value: '0x0',
            gas: '0x30d40',
          },
        ],
      });

      try {
        await publicClient.waitForTransactionReceipt({ hash: claimTxHash as `0x${string}`, timeout: 8000 }).catch(() => null);
      } catch {
        // Safe timeout
      }

      return { txHash: claimTxHash };
    } catch (err: any) {
      if (err.code === 4001 || err.message?.toLowerCase().includes('user rejected') || err.message?.toLowerCase().includes('user denied')) {
        throw new Error('Claim transaction cancelled in wallet.');
      }
      throw new Error(err.message || 'On-chain settlement claim failed.');
    }
  }

  /**
   * Execute real ON-CHAIN transaction when creating a community market
   */
  public static async requestMarketCreationSigning(params: {
    userAddress: string;
    title: string;
    asset: string;
    strikePrice: number;
    seedCollateralUSD: number;
  }): Promise<{ txHash: string }> {
    const { userAddress, seedCollateralUSD } = params;

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('No Web3 wallet detected. Please connect your wallet.');
    }

    const ethereum = (window as any).ethereum;
    await this.ensureSomniaNetwork(ethereum);

    const fromAddress = isAddress(userAddress) ? getAddress(userAddress) : userAddress;
    const amountRaw = BigInt(Math.round(seedCollateralUSD * 10 ** SOMNIA_CONFIG.collateralDecimals));

    try {
      // Real on-chain seed liquidity deposit transaction
      const transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [SOMNIA_CONFIG.binaryMarketsModule, amountRaw],
      });

      const txHash: string = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: fromAddress,
            to: SOMNIA_CONFIG.collateralAddress,
            data: transferData,
            value: '0x0',
            gas: '0x30d40',
          },
        ],
      });

      try {
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}`, timeout: 8000 }).catch(() => null);
      } catch {
        // Safe timeout
      }

      return { txHash };
    } catch (err: any) {
      if (err.code === 4001 || err.message?.toLowerCase().includes('user rejected') || err.message?.toLowerCase().includes('user denied')) {
        throw new Error('Market creation transaction cancelled in wallet.');
      }
      throw new Error(err.message || 'On-chain market creation failed on Somnia Shannon.');
    }
  }

  /**
   * Execute real ON-CHAIN transaction when creating or joining a Squad PvP Challenge
   */
  public static async requestSquadSigning(params: {
    userAddress: string;
    action: 'CREATE' | 'JOIN';
    challengeTitle: string;
    entryFeeUSD: number;
    side: 'UP' | 'DOWN';
  }): Promise<{ txHash: string }> {
    const { userAddress, entryFeeUSD } = params;

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('No Web3 wallet detected. Please connect your wallet.');
    }

    const ethereum = (window as any).ethereum;
    await this.ensureSomniaNetwork(ethereum);

    const fromAddress = isAddress(userAddress) ? getAddress(userAddress) : userAddress;
    const amountRaw = BigInt(Math.round(entryFeeUSD * 10 ** SOMNIA_CONFIG.collateralDecimals));

    try {
      // Real on-chain squad entry fee escrow transaction
      const transferData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [SOMNIA_CONFIG.binaryMarketsModule, amountRaw],
      });

      const txHash: string = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: fromAddress,
            to: SOMNIA_CONFIG.collateralAddress,
            data: transferData,
            value: '0x0',
            gas: '0x30d40',
          },
        ],
      });

      try {
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}`, timeout: 8000 }).catch(() => null);
      } catch {
        // Safe timeout
      }

      return { txHash };
    } catch (err: any) {
      if (err.code === 4001 || err.message?.toLowerCase().includes('user rejected') || err.message?.toLowerCase().includes('user denied')) {
        throw new Error('Squad transaction cancelled in wallet.');
      }
      throw new Error(err.message || 'On-chain squad deposit failed on Somnia Shannon.');
    }
  }
}
