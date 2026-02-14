'use client'

import { useState, useCallback } from 'react'
import { useWallets } from '@privy-io/react-auth'
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  encodeFunctionData,
  parseUnits,
} from 'viem'
import { tempoTestnet, DEFAULT_STABLECOIN, ERC20_ABI } from '@/lib/tempo'
import { useAuthFetch } from '@/hooks/useCurrentUser'

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
        const wallet =
          wallets.find((w) => w.walletClientType === 'privy') || wallets[0]

        if (!wallet) throw new Error('No wallet found. Please reconnect.')

        await wallet.switchChain(tempoTestnet.id)

        const provider = await wallet.getEthereumProvider()

        const walletClient = createWalletClient({
          chain: tempoTestnet,
          transport: custom(provider),
        })

        const [senderAddress] = await walletClient.getAddresses()

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

        const txHash = await walletClient.sendTransaction({
          to: DEFAULT_STABLECOIN,
          data,
          account: senderAddress,
          chain: tempoTestnet,
        })

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
        const message = err instanceof Error ? err.message : 'Settlement failed'
        setError(message)
        throw err
      } finally {
        setIsPending(false)
      }
    },
    [wallets, authFetch]
  )

  return { settle, isPending, error }
}
