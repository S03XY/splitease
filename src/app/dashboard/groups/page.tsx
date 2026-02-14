'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupData[]>([])
  const [loading, setLoading] = useState(true)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 spinner-gradient" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold gradient-text inline-block">Groups</h1>
        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl">Join Group</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Group</DialogTitle>
              </DialogHeader>
              <JoinGroupForm />
            </DialogContent>
          </Dialog>
          <Link href="/dashboard/groups/new">
            <Button className="rounded-xl">Create Group</Button>
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="glass rounded-2xl float-shadow p-12 text-center">
          <p className="text-muted-foreground">
            No groups yet. Create one or join with an invite code.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}
