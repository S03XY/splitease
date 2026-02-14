'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useCallback } from 'react'

export function useAuthFetch() {
  const { user } = usePrivy()

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-privy-id': user?.id || '',
          ...options.headers,
        },
      })
    },
    [user?.id]
  )

  return { authFetch }
}
