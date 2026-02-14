'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SettlementHistory } from '@/components/settlements/settlement-history'
import { useAuthFetch } from '@/hooks/useCurrentUser'

export default function HistoryPage() {
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading] = useState(true)
  const { authFetch } = useAuthFetch()

  useEffect(() => {
    const fetchSettlements = async () => {
      try {
        const res = await authFetch('/api/settlements')
        if (res.ok) {
          const data = await res.json()
          setSettlements(data.settlements)
        }
      } catch (error) {
        console.error('Failed to fetch settlements:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettlements()
  }, [authFetch])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 spinner-gradient" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="text-3xl font-bold gradient-text inline-block">Transaction History</h1>
      <Card className="glass rounded-2xl border-0 float-shadow">
        <CardHeader>
          <CardTitle>All Settlements</CardTitle>
        </CardHeader>
        <CardContent>
          <SettlementHistory settlements={settlements} />
        </CardContent>
      </Card>
    </div>
  )
}
