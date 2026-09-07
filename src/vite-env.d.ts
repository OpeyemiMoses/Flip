/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOMNIA_RPC_URL?: string;
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_PRIVY_APP_ID?: string;
  readonly PRIVATE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@privy-io/react-auth' {
  import React from 'react';
  export const PrivyProvider: React.FC<any>;
  export const usePrivy: () => any;
  export const useWallets: () => any;
  export const useLinkAccount: (options?: any) => any;
  export type PrivyClientConfig = any;
  export const useConnectOrCreateWallet: (options?: any) => any;
}

declare module '@privy-io/wagmi' {
  import React from 'react';
  export const WagmiProvider: React.FC<any>;
  export const createConfig: (config: any) => any;
  export const usePrivyWagmi: () => any;
}
