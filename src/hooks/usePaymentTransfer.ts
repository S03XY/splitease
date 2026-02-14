'use client'

import { useState, useCallback } from 'react'
import { useWallets } from '@privy-io/react-auth'
import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseUnits,
} from 'viem'
import { tempoTestnet, DEFAULT_STABLECOIN, ERC20_ABI } from '@/lib/tempo'

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return 'Transfer failed'
}

interface TransferParams {
  toAddress: string
  amount: number
}

export function usePaymentTransfer() {
  const { wallets } = useWallets()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const transfer = useCallback(
    async ({ toAddress, amount }: TransferParams) => {
      setIsPending(true)
      setError(null)

      try {
        // Prefer external wallet (MetaMask etc), fall back to embedded
        const wallet =
          wallets.find((w) => w.walletClientType !== 'privy') ||
          wallets.find((w) => w.walletClientType === 'privy')

        if (!wallet) throw new Error('No wallet found. Please reconnect.')

        // Switch chain
        try {
          await wallet.switchChain(tempoTestnet.id)
        } catch (switchErr) {
          console.error('[PaymentTransfer] switchChain failed:', switchErr)
          throw new Error('Please switch your wallet to Tempo Testnet and try again.')
        }

        const provider = await wallet.getEthereumProvider()

        const publicClient = createPublicClient({
          chain: tempoTestnet,
          transport: http(),
        })

        const decimals = await publicClient.readContract({
          address: DEFAULT_STABLECOIN,
          abi: ERC20_ABI,
          functionName: 'decimals',
        })

        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [toAddress as `0x${string}`, parseUnits(amount.toString(), decimals)],
        })

        // Send via EIP-1193 provider directly (works for both external & embedded wallets)
        const txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: wallet.address as `0x${string}`,
            to: DEFAULT_STABLECOIN,
            data,
          }],
        })

        return txHash as `0x${string}`
      } catch (err: unknown) {
        console.error('[PaymentTransfer] error:', err)
        const message = extractErrorMessage(err)
        setError(message)
        throw new Error(message)
      } finally {
        setIsPending(false)
      }
    },
    [wallets]
  )

  return { transfer, isPending, error }
}
