import { createConfig } from '@privy-io/wagmi';
import { http } from 'wagmi';
import { mainnet, sepolia } from 'viem/chains';
import { somniaShannonTestnet } from './privy';

export { somniaShannonTestnet };

export const wagmiConfig = createConfig({
  chains: [somniaShannonTestnet, mainnet, sepolia],
  transports: {
    [somniaShannonTestnet.id]: http('https://api.infra.testnet.somnia.network'),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: false,
});
