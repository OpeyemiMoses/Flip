/**
 * Provider Detector Service
 * Handles multi-wallet discovery via EIP-6963 and isolated global object inspection.
 * Prevents OKX Wallet (or any single wallet) from hijacking MetaMask, Rabby, Coinbase, etc.
 */

export interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

export type SupportedWalletId =
  | 'metamask'
  | 'okx'
  | 'rabby'
  | 'coinbase'
  | 'phantom'
  | 'trust'
  | 'bitget'
  | 'injected';

export interface WalletMetadata {
  id: SupportedWalletId;
  name: string;
  downloadUrl: string;
  rdnsPatterns: string[];
}

export const WALLET_METADATA_LIST: Record<SupportedWalletId, WalletMetadata> = {
  metamask: {
    id: 'metamask',
    name: 'MetaMask',
    downloadUrl: 'https://metamask.io/download/',
    rdnsPatterns: ['io.metamask', 'io.metamask.flask', 'io.metamask.mobile'],
  },
  okx: {
    id: 'okx',
    name: 'OKX Wallet',
    downloadUrl: 'https://www.okx.com/web3',
    rdnsPatterns: ['com.okex.wallet', 'com.okx.wallet'],
  },
  rabby: {
    id: 'rabby',
    name: 'Rabby Wallet',
    downloadUrl: 'https://rabby.io/',
    rdnsPatterns: ['io.rabby'],
  },
  coinbase: {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    downloadUrl: 'https://www.coinbase.com/wallet',
    rdnsPatterns: ['com.coinbase.wallet'],
  },
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    downloadUrl: 'https://phantom.app/',
    rdnsPatterns: ['app.phantom'],
  },
  trust: {
    id: 'trust',
    name: 'Trust Wallet',
    downloadUrl: 'https://trustwallet.com/',
    rdnsPatterns: ['com.trustwallet.app'],
  },
  bitget: {
    id: 'bitget',
    name: 'Bitget Wallet',
    downloadUrl: 'https://web3.bitget.com/',
    rdnsPatterns: ['com.bitget.web3'],
  },
  injected: {
    id: 'injected',
    name: 'Browser Wallet',
    downloadUrl: 'https://metamask.io/download/',
    rdnsPatterns: [],
  },
};

class ProviderDetectorService {
  private eip6963Providers: Map<string, EIP6963ProviderDetail> = new Map();
  private listeners: Set<() => void> = new Set();
  private initialized = false;

  constructor() {
    this.init();
  }

  public init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    window.addEventListener('eip6963:announceProvider', (event: any) => {
      const detail = event?.detail as EIP6963ProviderDetail;
      if (detail?.info?.rdns && detail?.provider) {
        const key = detail.info.rdns.toLowerCase();
        this.eip6963Providers.set(key, detail);
        this.notifyListeners();
      }
    });

    this.requestProviders();
  }

  public requestProviders(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    this.requestProviders();
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.warn('EIP-6963 listener callback error:', e);
      }
    });
  }

  public getAllAnnounced(): EIP6963ProviderDetail[] {
    return Array.from(this.eip6963Providers.values());
  }

  /**
   * Resolves the isolated target Ethereum provider for a specific wallet ID.
   * Returns null if the requested wallet is not installed, rather than returning a hijacked provider.
   */
  public resolveProvider(walletId: SupportedWalletId): any | null {
    if (typeof window === 'undefined') return null;
    const win = window as any;
    const eth = win.ethereum;
    const providers: any[] = Array.isArray(eth?.providers) ? eth.providers : [];

    switch (walletId) {
      case 'okx': {
        // 1. Check EIP-6963
        for (const [rdns, detail] of this.eip6963Providers.entries()) {
          if (rdns.includes('okex') || rdns.includes('okx')) {
            return detail.provider;
          }
        }
        // 2. Check window.okxwallet
        if (win.okxwallet?.ethereum) return win.okxwallet.ethereum;
        if (win.okxwallet) return win.okxwallet;
        // 3. Check multi-provider array
        const okx = providers.find((p: any) => p.isOkxWallet);
        if (okx) return okx;
        // 4. Check window.ethereum
        if (eth?.isOkxWallet) return eth;
        return null;
      }

      case 'metamask': {
        // 1. Check EIP-6963
        for (const [rdns, detail] of this.eip6963Providers.entries()) {
          if (rdns.startsWith('io.metamask')) {
            return detail.provider;
          }
        }
        // 2. Check multi-provider array (strictly ensure it is NOT OKX, Rabby, Phantom, Coinbase)
        const mm = providers.find(
          (p: any) =>
            p.isMetaMask &&
            !p.isOkxWallet &&
            !p.isRabby &&
            !p.isPhantom &&
            !p.isCoinbaseWallet &&
            !p.isBraveWallet &&
            !p.isBitKeep
        );
        if (mm) return mm;
        // 3. Check window.ethereum (strictly ensure it is genuinely MetaMask and NOT OKX masquerading)
        if (
          eth?.isMetaMask &&
          !eth?.isOkxWallet &&
          !eth?.isRabby &&
          !eth?.isPhantom &&
          !eth?.isCoinbaseWallet &&
          !eth?.isBraveWallet &&
          !eth?.isBitKeep
        ) {
          return eth;
        }
        return null;
      }

      case 'rabby': {
        // 1. Check EIP-6963
        for (const [rdns, detail] of this.eip6963Providers.entries()) {
          if (rdns.startsWith('io.rabby')) {
            return detail.provider;
          }
        }
        // 2. Check window.rabby
        if (win.rabby) return win.rabby;
        // 3. Check multi-provider array
        const rabby = providers.find((p: any) => p.isRabby);
        if (rabby) return rabby;
        // 4. Check window.ethereum
        if (eth?.isRabby) return eth;
        return null;
      }

      case 'coinbase': {
        // 1. Check EIP-6963
        for (const [rdns, detail] of this.eip6963Providers.entries()) {
          if (rdns.startsWith('com.coinbase.wallet')) {
            return detail.provider;
          }
        }
        // 2. Check window.coinbaseWalletExtension
        if (win.coinbaseWalletExtension) return win.coinbaseWalletExtension;
        // 3. Check multi-provider array
        const cb = providers.find((p: any) => p.isCoinbaseWallet);
        if (cb) return cb;
        // 4. Check window.ethereum
        if (eth?.isCoinbaseWallet) return eth;
        return null;
      }

      case 'phantom': {
        // 1. Check EIP-6963
        for (const [rdns, detail] of this.eip6963Providers.entries()) {
          if (rdns.startsWith('app.phantom')) {
            return detail.provider;
          }
        }
        // 2. Check window.phantom
        if (win.phantom?.ethereum) return win.phantom.ethereum;
        // 3. Check multi-provider array
        const ph = providers.find((p: any) => p.isPhantom);
        if (ph) return ph;
        // 4. Check window.ethereum
        if (eth?.isPhantom) return eth;
        return null;
      }

      case 'trust': {
        // 1. Check EIP-6963
        for (const [rdns, detail] of this.eip6963Providers.entries()) {
          if (rdns.startsWith('com.trustwallet')) {
            return detail.provider;
          }
        }
        if (win.trustwallet?.ethereum) return win.trustwallet.ethereum;
        const tw = providers.find((p: any) => p.isTrust || p.isTrustWallet);
        if (tw) return tw;
        if (eth?.isTrust || eth?.isTrustWallet) return eth;
        return null;
      }

      case 'bitget': {
        for (const [rdns, detail] of this.eip6963Providers.entries()) {
          if (rdns.startsWith('com.bitget')) {
            return detail.provider;
          }
        }
        if (win.bitkeep?.ethereum) return win.bitkeep.ethereum;
        const bk = providers.find((p: any) => p.isBitKeep || p.isBitget);
        if (bk) return bk;
        return null;
      }

      case 'injected': {
        if (eth) return eth;
        return null;
      }

      default:
        return null;
    }
  }

  public isInstalled(walletId: SupportedWalletId): boolean {
    return !!this.resolveProvider(walletId);
  }

  public getDetectionMap(): Record<SupportedWalletId, boolean> {
    return {
      metamask: this.isInstalled('metamask'),
      okx: this.isInstalled('okx'),
      rabby: this.isInstalled('rabby'),
      coinbase: this.isInstalled('coinbase'),
      phantom: this.isInstalled('phantom'),
      trust: this.isInstalled('trust'),
      bitget: this.isInstalled('bitget'),
      injected: typeof window !== 'undefined' && !!(window as any).ethereum,
    };
  }
}

export const ProviderDetector = new ProviderDetectorService();
