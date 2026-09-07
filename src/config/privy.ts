import type { PrivyClientConfig } from '@privy-io/react-auth';
import { defineChain } from 'viem';

export const somniaShannonTestnet = defineChain({
  id: 50312,
  name: 'Somnia Shannon Testnet',
  nativeCurrency: {
    name: 'STT',
    symbol: 'STT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://shannon-explorer.somnia.network',
    },
  },
  testnet: true,
});

export const PRIVY_APP_ID = ((import.meta as any).env?.VITE_PRIVY_APP_ID as string) || 'cmtpa1ea801nj0blaw6cd6wp8';

export const privyConfig: PrivyClientConfig = {
  appearance: {
    theme: 'dark',
    accentColor: '#00F2FE',
    logo: 'https://somnia.network/favicon.ico',
    showWalletLoginFirst: false,
    walletList: [
      'metamask',
      'coinbase_wallet',
      'rainbow',
      'detected_wallets',
      'wallet_connect',
    ],
  },
  loginMethods: ['email', 'wallet', 'google', 'twitter', 'discord'],
  embeddedWallets: {
    ethereum: {
      createOnLogin: 'users-without-wallets',
    },
  },
  defaultChain: somniaShannonTestnet,
  supportedChains: [somniaShannonTestnet],
};
