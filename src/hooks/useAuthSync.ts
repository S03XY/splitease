'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useEffect, useRef } from 'react'
import { tempoTestnet } from '@/lib/tempo'

const TEMPO_CAIP2 = `eip155:${tempoTestnet.id}`

export function useAuthSync() {
  const { user, ready, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const hasSynced = useRef(false)
  const syncedWithWallet = useRef(false)

  // Switch any wallet not on Tempo testnet
  useEffect(() => {
    if (!ready || !authenticated || wallets.length === 0) return

    wallets.forEach((wallet) => {
      if (wallet.chainId !== TEMPO_CAIP2) {
        wallet.switchChain(tempoTestnet.id).catch(() => {
          // User may reject — transaction hooks will retry before sending
        })
      }
    })
  }, [ready, authenticated, wallets])

  useEffect(() => {
    if (!ready || !authenticated || !user) return

    const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')
    const externalWallet = wallets.find((w) => w.walletClientType !== 'privy')
    const walletAddress = embeddedWallet?.address || externalWallet?.address

    // Skip if already synced with a wallet, or already synced and still no wallet
    if (syncedWithWallet.current) return
    if (hasSynced.current && !walletAddress) return

    const syncUser = async () => {
      try {
        await fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            privyId: user.id,
            walletAddress,
            email: user.email?.address,
            name: user.google?.name || user.email?.address?.split('@')[0],
          }),
        })
        hasSynced.current = true
        if (walletAddress) syncedWithWallet.current = true
      } catch (error) {
        console.error('Failed to sync user:', error)
      }
    }

    syncUser()
  }, [ready, authenticated, user, wallets])
}
