import { defineChain } from 'viem'

export const tempoTestnet = defineChain({
  id: 42431,
  name: 'Tempo Testnet (Moderato)',
  nativeCurrency: {
    decimals: 18,
    name: 'USD',
    symbol: 'USD',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.moderato.tempo.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Tempo Explorer',
      url: 'https://explore.tempo.xyz',
    },
  },
  testnet: true,
})

export const STABLECOINS = {
  PathUSD: '0x20c0000000000000000000000000000000000000' as `0x${string}`,
  AlphaUSD: '0x20c0000000000000000000000000000000000001' as `0x${string}`,
  BetaUSD: '0x20c0000000000000000000000000000000000002' as `0x${string}`,
  ThetaUSD: '0x20c0000000000000000000000000000000000003' as `0x${string}`,
} as const

export const DEFAULT_STABLECOIN = STABLECOINS.AlphaUSD

export const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    name: 'symbol',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const

export function getExplorerTxUrl(txHash: string): string {
  return `${tempoTestnet.blockExplorers.default.url}/tx/${txHash}`
}

export function getExplorerAddressUrl(address: string): string {
  return `${tempoTestnet.blockExplorers.default.url}/address/${address}`
}
