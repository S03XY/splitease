'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useEffect, useRef } from 'react'

export function useAuthSync() {
  const { user, ready, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const hasSynced = useRef(false)

  useEffect(() => {
    if (!ready || !authenticated || !user || hasSynced.current) return

    const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')
    const externalWallet = wallets.find((w) => w.walletClientType !== 'privy')
    const walletAddress = embeddedWallet?.address || externalWallet?.address

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
      } catch (error) {
        console.error('Failed to sync user:', error)
      }
    }

    syncUser()
  }, [ready, authenticated, user, wallets])
}
