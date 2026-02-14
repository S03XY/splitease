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
import { useAuthFetch } from '@/hooks/useCurrentUser'

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return 'Settlement failed'
}

interface SettleParams {
  toAddress: string
  amount: number
  groupId: string
  toUserId: string
}

export function useSettlement() {
  const { wallets } = useWallets()
  const { authFetch } = useAuthFetch()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const settle = useCallback(
    async ({ toAddress, amount, groupId, toUserId }: SettleParams) => {
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
          console.error('[Settlement] switchChain failed:', switchErr)
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
        }) as `0x${string}`

        // Record in DB
        await authFetch('/api/settlements', {
          method: 'POST',
          body: JSON.stringify({ groupId, toUserId, amount, txHash }),
        })

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

        // Mark confirmed
        await authFetch(`/api/settlements/${txHash}/confirm`, {
          method: 'PATCH',
        })

        return { txHash, receipt }
      } catch (err: unknown) {
        console.error('[Settlement] error:', err)
        const message = extractErrorMessage(err)
        setError(message)
        throw new Error(message)
      } finally {
        setIsPending(false)
      }
    },
    [wallets, authFetch]
  )

  return { settle, isPending, error }
}
