'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthFetch } from '@/hooks/useCurrentUser'
import { toast } from 'sonner'

export function CreateGroupForm() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { authFetch } = useAuthFetch()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const res = await authFetch('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create group')
      }

      const { group } = await res.json()
      toast.success('Group created!')
      router.push(`/dashboard/groups/${group.id}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create group'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md glass rounded-2xl p-5 sm:p-8 float-shadow">
      <div className="space-y-2">
        <Label htmlFor="name">Group Name</Label>
        <Input
          id="name"
          placeholder="e.g. Weekend Trip, Apartment, Dinner Club"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Input
          id="description"
          placeholder="What's this group for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-xl"
        />
      </div>
      <Button type="submit" disabled={loading || !name.trim()} className="rounded-xl">
        {loading ? 'Creating...' : 'Create Group'}
      </Button>
    </form>
  )
}
