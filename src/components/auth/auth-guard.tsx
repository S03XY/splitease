'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthSync } from '@/hooks/useAuthSync'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()

  useAuthSync()

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login')
    }
  }, [ready, authenticated, router])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient">
        <div className="animate-spin rounded-full h-8 w-8 spinner-gradient" />
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return <>{children}</>
}
