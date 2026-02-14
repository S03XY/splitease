'use client'

import { useEffect, useState, use } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { useAuthFetch } from '@/hooks/useCurrentUser'

interface Member {
  id: string
  user: {
    id: string
    name: string | null
    email: string | null
  }
}

export default function NewExpensePage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = use(params)
  const { user: privyUser } = usePrivy()
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const { authFetch } = useAuthFetch()

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await authFetch(`/api/groups/${groupId}`)
        if (res.ok) {
          const data = await res.json()
          setMembers(data.group.members)
          const syncRes = await authFetch('/api/users/sync', {
            method: 'POST',
            body: JSON.stringify({
              privyId: privyUser?.id,
              email: privyUser?.email?.address,
            }),
          })
          if (syncRes.ok) {
            const syncData = await syncRes.json()
            setCurrentUserId(syncData.user.id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch group:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchGroup()
  }, [groupId, authFetch, privyUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 spinner-gradient" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="text-3xl font-bold gradient-text inline-block">Add Expense</h1>
      {currentUserId && (
        <ExpenseForm
          groupId={groupId}
          members={members}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}
