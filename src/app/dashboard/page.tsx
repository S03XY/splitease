'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { SettlementHistory } from '@/components/settlements/settlement-history'
import { useAuthFetch } from '@/hooks/useCurrentUser'
import { formatCurrency } from '@/lib/utils'

interface GroupSummary {
  groupId: string
  groupName: string
  memberCount: number
  balance: number
}

interface DashboardData {
  totalOwed: number
  totalOwing: number
  pendingRequests: number
  groupSummaries: GroupSummary[]
  recentSettlements: Array<{
    id: string
    amount: string
    txHash: string | null
    status: 'PENDING' | 'CONFIRMED' | 'FAILED'
    createdAt: string
    fromUser: { name: string | null; email: string | null }
    toUser: { name: string | null; email: string | null }
    group: { name: string }
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { authFetch } = useAuthFetch()

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await authFetch('/api/dashboard')
        if (res.ok) {
          setData(await res.json())
        }
      } catch (error) {
        console.error('Failed to fetch dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [authFetch])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 spinner-gradient" />
      </div>
    )
  }

  const netBalance = (data?.totalOwed || 0) - (data?.totalOwing || 0)

  return (
    <div className="space-y-8 animate-fade-in-up">
      <h1 className="text-3xl font-bold gradient-text inline-block">Dashboard</h1>

      {/* Overview card */}
      <div className="glass-strong rounded-2xl float-shadow-lg gradient-border p-6 sm:p-8 space-y-6">
        {/* Net balance */}
        <div className="text-center sm:text-left">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Net Balance</p>
          <p className={`text-5xl font-bold tracking-tight ${netBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-subtle rounded-xl px-4 py-3 text-center">
            <p className="text-lg font-bold text-emerald-500">{formatCurrency(data?.totalOwed || 0)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Owed to you</p>
          </div>
          <div className="glass-subtle rounded-xl px-4 py-3 text-center">
            <p className="text-lg font-bold text-rose-500">{formatCurrency(data?.totalOwing || 0)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">You owe</p>
          </div>
          <Link href="/dashboard/requests" className="glass-subtle rounded-xl px-4 py-3 text-center hover:bg-foreground/5 transition-colors">
            <p className="text-lg font-bold">
              {data?.pendingRequests || 0}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Pending requests</p>
          </Link>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <Link
            href="/dashboard/requests"
            className="flex-1 glass-subtle rounded-xl px-4 py-2.5 text-center text-sm font-medium hover:bg-foreground/5 transition-colors"
          >
            New Request
          </Link>
          <Link
            href="/dashboard/groups/new"
            className="flex-1 glass-subtle rounded-xl px-4 py-2.5 text-center text-sm font-medium hover:bg-foreground/5 transition-colors"
          >
            Create Group
          </Link>
        </div>
      </div>

      {/* Groups */}
      {data?.groupSummaries && data.groupSummaries.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Groups</h2>
            <Link href="/dashboard/groups" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.groupSummaries.map((g) => (
              <Link key={g.groupId} href={`/dashboard/groups/${g.groupId}`}>
                <div className="glass rounded-2xl float-shadow hover:float-shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{g.groupName}</p>
                      <Badge variant="secondary" className="mt-1.5 rounded-lg text-xs">
                        {g.memberCount} members
                      </Badge>
                    </div>
                    <p
                      className={`text-lg font-bold ${
                        g.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {g.balance >= 0 ? '+' : ''}
                      {formatCurrency(g.balance)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl float-shadow p-12 text-center">
          <p className="text-muted-foreground">
            No groups yet.{' '}
            <Link href="/dashboard/groups/new" className="text-foreground font-medium hover:underline">
              Create one
            </Link>{' '}
            to get started.
          </p>
        </div>
      )}

      {/* Recent settlements */}
      {data?.recentSettlements && data.recentSettlements.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Settlements</h2>
            <Link href="/dashboard/history" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              View all
            </Link>
          </div>
          <div className="glass rounded-2xl float-shadow p-5 sm:p-6">
            <SettlementHistory settlements={data.recentSettlements} />
          </div>
        </div>
      )}
    </div>
  )
}
