'use client'

import { useState, useEffect } from 'react'
import { useWallets } from '@privy-io/react-auth'
import { createPublicClient, http, formatUnits } from 'viem'
import { tempoTestnet, DEFAULT_STABLECOIN, ERC20_ABI } from '@/lib/tempo'

export function useTokenBalance() {
  const { wallets } = useWallets()
  const [balance, setBalance] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        // Get the first available wallet (external or embedded)
        const wallet = wallets.find((w) => w.walletClientType !== 'privy') || wallets[0]
        if (!wallet?.address) {
          setBalance(null)
          setLoading(false)
          return
        }

        const publicClient = createPublicClient({
          chain: tempoTestnet,
          transport: http(),
        })

        const [balanceWei, decimals] = await Promise.all([
          publicClient.readContract({
            address: DEFAULT_STABLECOIN,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [wallet.address as `0x${string}`],
          }),
          publicClient.readContract({
            address: DEFAULT_STABLECOIN,
            abi: ERC20_ABI,
            functionName: 'decimals',
          }),
        ])

        const formatted = formatUnits(balanceWei, decimals)
        setBalance(formatted)
      } catch (error) {
        console.error('Failed to fetch token balance:', error)
        setBalance(null)
      } finally {
        setLoading(false)
      }
    }

    if (wallets.length > 0) {
      fetchBalance()
      // Refresh balance every 10 seconds
      const interval = setInterval(fetchBalance, 10000)
      return () => clearInterval(interval)
    } else {
      setBalance(null)
      setLoading(false)
    }
  }, [wallets])

  return { balance, loading }
}
