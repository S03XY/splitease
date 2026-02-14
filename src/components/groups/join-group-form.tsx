'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthFetch } from '@/hooks/useCurrentUser'
import { toast } from 'sonner'

export function JoinGroupForm() {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { authFetch } = useAuthFetch()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return

    setLoading(true)
    try {
      const res = await authFetch('/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to join group')
      }

      const { group } = await res.json()
      toast.success(`Joined "${group.name}"!`)
      router.push(`/dashboard/groups/${group.id}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to join group'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="inviteCode">Invite Code</Label>
        <Input
          id="inviteCode"
          placeholder="Paste invite code here"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          required
          className="rounded-xl"
        />
      </div>
      <Button type="submit" disabled={loading || !inviteCode.trim()} className="rounded-xl">
        {loading ? 'Joining...' : 'Join Group'}
      </Button>
    </form>
  )
}
