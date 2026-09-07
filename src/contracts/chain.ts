import { defineChain } from 'viem';

export const somniaShannon = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Somnia Testnet Token',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: [
        'https://dream-rpc.somnia.network',
        'https://api.infra.testnet.somnia.network',
      ],
      webSocket: ['wss://dream-rpc.somnia.network'],
    },
    public: {
      http: [
        'https://dream-rpc.somnia.network',
        'https://api.infra.testnet.somnia.network',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Shannon Explorer',
      url: 'https://shannon-explorer.somnia.network',
    },
  },
  testnet: true,
});

export const SOMNIA_CONFIG = {
  chainId: 50312,
  chainIdHex: '0xc488',
  rpcUrl: 'https://dream-rpc.somnia.network',
  fallbackRpcUrl: 'https://api.infra.testnet.somnia.network',
  explorerUrl: 'https://shannon-explorer.somnia.network',
  faucetTelegram: 'https://t.me/+XHq0F0JXMyhmMzM0',
  collateralAddress: '0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E' as `0x${string}`, // tUSDC
  collateralSymbol: 'tUSDC',
  collateralDecimals: 6,
  binaryMarketsModule: '0x3ecC694Cef705358864a646142ac17A90E29e388' as `0x${string}`,
  marketsCore: '0x2802504314685D89bF6C992CA5a8e7cC78bc0294' as `0x${string}`,
  binarySettlement: '0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23' as `0x${string}`,
  outcomeToken6909: '0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9' as `0x${string}`,
  collateralRouter: '0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C' as `0x${string}`,
};

export const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

