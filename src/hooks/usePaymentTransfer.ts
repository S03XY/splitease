'use client'

import { useState, useCallback } from 'react'
import { useWallets, useSendTransaction } from '@privy-io/react-auth'
import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseUnits,
} from 'viem'
import { tempoTestnet, DEFAULT_STABLECOIN, ERC20_ABI } from '@/lib/tempo'

interface TransferParams {
  toAddress: string
  amount: number
}

export function usePaymentTransfer() {
  const { wallets } = useWallets()
  const { sendTransaction } = useSendTransaction()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const transfer = useCallback(
    async ({ toAddress, amount }: TransferParams) => {
      setIsPending(true)
      setError(null)

      try {
        const wallet =
          wallets.find((w) => w.walletClientType === 'privy') || wallets[0]

        if (!wallet) throw new Error('No wallet found. Please reconnect.')

        await wallet.switchChain(tempoTestnet.id)

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

        const { hash } = await sendTransaction(
          {
            to: DEFAULT_STABLECOIN,
            data,
            chainId: tempoTestnet.id,
          },
          {
            uiOptions: {
              description: `Transfer ${amount} AlphaUSD`,
              buttonText: 'Confirm & Send',
              transactionInfo: {
                title: 'Payment Details',
                action: `Send ${amount} AlphaUSD`,
                contractInfo: {
                  name: 'AlphaUSD Token',
                },
              },
            },
          }
        )

        return hash
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Transfer failed'
        setError(message)
        throw err
      } finally {
        setIsPending(false)
      }
    },
    [wallets, sendTransaction]
  )

  return { transfer, isPending, error }
}
