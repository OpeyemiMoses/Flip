import { createConfig } from '@privy-io/wagmi';
import { http } from 'wagmi';
import { somniaShannonTestnet } from './privy';

export { somniaShannonTestnet };

export const wagmiConfig = createConfig({
  chains: [somniaShannonTestnet],
  transports: {
    [somniaShannonTestnet.id]: http('https://dream-rpc.somnia.network'),
  },
  ssr: false,
});
