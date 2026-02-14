'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettlementHistory } from '@/components/settlements/settlement-history'
import { useAuthFetch } from '@/hooks/useCurrentUser'

interface Settlement {
  id: string
  amount: string
  txHash: string | null
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  createdAt: string
  fromUser: { name: string | null; email: string | null }
  toUser: { name: string | null; email: string | null }
  group: { id: string; name: string }
}

interface GroupOption {
  id: string
  name: string
}

const ITEMS_PER_PAGE = 10

export default function HistoryPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [loading, setLoading] = useState(true)
  const { authFetch } = useAuthFetch()

  // Filter + pagination state
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [groupFilter, setGroupFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settlementsRes, groupsRes] = await Promise.all([
          authFetch('/api/settlements'),
          authFetch('/api/groups'),
        ])
        if (settlementsRes.ok) {
          const data = await settlementsRes.json()
          setSettlements(data.settlements)
        }
        if (groupsRes.ok) {
          const data = await groupsRes.json()
          setGroups(data.groups.map((g: { id: string; name: string }) => ({ id: g.id, name: g.name })))
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [authFetch])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, groupFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 spinner-gradient" />
      </div>
    )
  }

  const filtered = settlements.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false
    if (groupFilter !== 'ALL' && s.group.id !== groupFilter) return false
    return true
  })
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="text-3xl font-bold gradient-text inline-block">Transaction History</h1>

      {settlements.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-35 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-45 rounded-xl">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">All Groups</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(statusFilter !== 'ALL' || groupFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-muted-foreground"
              onClick={() => { setStatusFilter('ALL'); setGroupFilter('ALL') }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      <Card className="glass rounded-2xl border-0 float-shadow">
        <CardHeader>
          <CardTitle>
            {filtered.length === settlements.length
              ? 'All Settlements'
              : `${filtered.length} of ${settlements.length} Settlements`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettlementHistory settlements={paginated} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                {filtered.length} settlement{filtered.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
