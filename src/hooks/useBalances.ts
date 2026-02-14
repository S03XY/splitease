'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthFetch } from '@/hooks/useCurrentUser'
import type { Balance, SimplifiedDebt } from '@/types'

interface BalancesData {
  balances: Balance[]
  simplifiedDebts: SimplifiedDebt[]
  currentUserId: string
}

export function useBalances(groupId: string) {
  const [data, setData] = useState<BalancesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { authFetch } = useAuthFetch()

  const fetchBalances = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/groups/${groupId}/balances`)
      if (!res.ok) throw new Error('Failed to fetch balances')
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [groupId, authFetch])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  return { ...data, loading, error, refetch: fetchBalances }
}
