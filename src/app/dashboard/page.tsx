'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SettlementHistory } from '@/components/settlements/settlement-history'
import { useAuthFetch } from '@/hooks/useCurrentUser'
import { formatCurrency } from '@/lib/utils'

interface GroupSummary {
  groupId: string
  groupName: string
  memberCount: number
  balance: number
  totalExpenses: number
}

interface RequestSummary {
  incomingCount: number
  incomingTotal: number
  outgoingCount: number
  outgoingTotal: number
}

interface DashboardData {
  totalOwed: number
  totalOwing: number
  pendingRequests: number
  requestSummary: RequestSummary
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
  const rs = data?.requestSummary

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-3xl font-bold gradient-text inline-block">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/requests">
            <Button variant="outline" className="rounded-xl text-sm">New Request</Button>
          </Link>
          <Link href="/dashboard/groups/new">
            <Button className="rounded-xl text-sm">Create Group</Button>
          </Link>
        </div>
      </div>

      {/* ── Section 1: Expense Tracking ── */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Expense Tracking</h2>

        {/* Balance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass rounded-2xl float-shadow p-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Balance</p>
            <p className={`text-3xl font-bold mt-2 ${netBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
            </p>
          </div>
          <div className="glass rounded-2xl float-shadow p-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Owed to You</p>
            <p className="text-3xl font-bold mt-2 text-primary">
              {formatCurrency(data?.totalOwed || 0)}
            </p>
          </div>
          <div className="glass rounded-2xl float-shadow p-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">You Owe</p>
            <p className="text-3xl font-bold mt-2 text-destructive">
              {formatCurrency(data?.totalOwing || 0)}
            </p>
          </div>
        </div>

        {/* Groups */}
        {data?.groupSummaries && data.groupSummaries.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Your Groups</h3>
              <Link href="/dashboard/groups" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                View all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.groupSummaries.map((g) => (
                <Link key={g.groupId} href={`/dashboard/groups/${g.groupId}`}>
                  <div className="glass rounded-2xl float-shadow p-5 hover:float-shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-0.5 h-full flex flex-col">
                    <p className="font-semibold truncate">{g.groupName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{g.memberCount} members</p>
                    <div className="mt-auto pt-4">
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                        <div>
                          <p className="text-[11px] text-muted-foreground">Total Expenses</p>
                          <p className="text-sm font-semibold mt-0.5">
                            {formatCurrency(g.totalExpenses)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-muted-foreground">Your Balance</p>
                          <p className={`text-sm font-semibold mt-0.5 ${g.balance > 0 ? 'text-primary' : g.balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {g.balance > 0 ? '+' : ''}{formatCurrency(g.balance)}
                          </p>
                        </div>
                      </div>
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
              <h3 className="text-sm font-medium text-muted-foreground">Recent Settlements</h3>
              <Link href="/dashboard/history" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                View all &rarr;
              </Link>
            </div>
            <div className="glass rounded-2xl float-shadow p-5 sm:p-6">
              <SettlementHistory settlements={data.recentSettlements} />
            </div>
          </div>
        )}
      </div>

      <Separator className="opacity-50" />

      {/* ── Section 2: Payment Requests ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Payment Requests</h2>
          <Link href="/dashboard/requests" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            View all &rarr;
          </Link>
        </div>

        {/* Request summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/dashboard/requests" className="block">
            <div className="glass rounded-2xl float-shadow p-6 hover:float-shadow-lg transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Incoming Requests</p>
                {(rs?.incomingCount || 0) > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {rs?.incomingCount} pending
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold mt-2 text-foreground">
                {formatCurrency(rs?.incomingTotal || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Amount others are requesting from you</p>
            </div>
          </Link>
          <Link href="/dashboard/requests" className="block">
            <div className="glass rounded-2xl float-shadow p-6 hover:float-shadow-lg transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outgoing Requests</p>
                {(rs?.outgoingCount || 0) > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {rs?.outgoingCount} pending
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold mt-2 text-foreground">
                {formatCurrency(rs?.outgoingTotal || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Amount you are requesting from others</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
