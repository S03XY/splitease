'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GroupCard } from '@/components/groups/group-card'
import { JoinGroupForm } from '@/components/groups/join-group-form'
import { useAuthFetch } from '@/hooks/useCurrentUser'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface GroupData {
  id: string
  name: string
  description: string | null
  members: { user: { name: string | null; email: string | null } }[]
  _count: { expenses: number }
  balance: number
  totalExpenses: number
}

const ITEMS_PER_PAGE = 9

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const { authFetch } = useAuthFetch()

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await authFetch('/api/groups')
        if (res.ok) {
          const data = await res.json()
          setGroups(data.groups)
        }
      } catch (error) {
        console.error('Failed to fetch groups:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchGroups()
  }, [authFetch])

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 spinner-gradient" />
      </div>
    )
  }

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-3xl font-bold gradient-text inline-block">Groups</h1>
        <div className="flex gap-2 sm:gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl text-sm">Join Group</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Group</DialogTitle>
              </DialogHeader>
              <JoinGroupForm />
            </DialogContent>
          </Dialog>
          <Link href="/dashboard/groups/new">
            <Button className="rounded-xl text-sm">Create Group</Button>
          </Link>
        </div>
      </div>

      {groups.length > 0 && (
        <Input
          placeholder="Search groups by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-xl"
          autoComplete="off"
        />
      )}

      {groups.length === 0 ? (
        <div className="glass rounded-2xl float-shadow p-12 text-center">
          <p className="text-muted-foreground">
            No groups yet. Create one or join with an invite code.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl float-shadow p-12 text-center">
          <p className="text-muted-foreground">No groups match your search.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {filtered.length} group{filtered.length !== 1 ? 's' : ''}
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
        </>
      )}
    </div>
  )
}
