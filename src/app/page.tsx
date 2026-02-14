'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function RootPage() {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (!ready) return
    router.replace(authenticated ? '/dashboard' : '/login')
  }, [ready, authenticated, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 spinner-gradient" />
    </div>
  )
}
