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

interface ExpenseData {
  id: string
  description: string
  amount: string
  splitType: 'EQUAL' | 'EXACT' | 'PERCENTAGE'
  paidById: string
  splits: { userId: string; amount: string }[]
  group: { members: Member[] }
}

export default function EditExpensePage({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>
}) {
  const { groupId, expenseId } = use(params)
  const { user: privyUser } = usePrivy()
  const [expense, setExpense] = useState<ExpenseData | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const { authFetch } = useAuthFetch()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expenseRes, syncRes] = await Promise.all([
          authFetch(`/api/expenses/${expenseId}`),
          authFetch('/api/users/sync', {
            method: 'POST',
            body: JSON.stringify({
              privyId: privyUser?.id,
              email: privyUser?.email?.address,
            }),
          }),
        ])

        if (expenseRes.ok) {
          const data = await expenseRes.json()
          setExpense(data.expense)
        }
        if (syncRes.ok) {
          const syncData = await syncRes.json()
          setCurrentUserId(syncData.user.id)
        }
      } catch (error) {
        console.error('Failed to fetch expense:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [expenseId, authFetch, privyUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 spinner-gradient" />
      </div>
    )
  }

  if (!expense) {
    return <p className="text-muted-foreground">Expense not found.</p>
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="text-3xl font-bold gradient-text inline-block">Edit Expense</h1>
      {currentUserId && (
        <ExpenseForm
          groupId={groupId}
          members={expense.group.members}
          currentUserId={currentUserId}
          expense={expense}
        />
      )}
    </div>
  )
}
