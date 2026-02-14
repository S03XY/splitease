'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthFetch } from '@/hooks/useCurrentUser'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

interface Member {
  id: string
  user: {
    id: string
    name: string | null
    email: string | null
  }
}

interface ExistingExpense {
  id: string
  description: string
  amount: string
  splitType: SplitType
  paidById: string
  splits: {
    userId: string
    amount: string
  }[]
}

interface ExpenseFormProps {
  groupId: string
  members: Member[]
  currentUserId: string
  expense?: ExistingExpense
}

type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE'

export function ExpenseForm({ groupId, members, currentUserId, expense }: ExpenseFormProps) {
  const isEditing = !!expense

  const [description, setDescription] = useState(expense?.description || '')
  const [amount, setAmount] = useState(expense ? String(parseFloat(expense.amount)) : '')
  const [paidById, setPaidById] = useState(expense?.paidById || currentUserId)
  const [splitType, setSplitType] = useState<SplitType>(expense?.splitType || 'EQUAL')

  const initialSelected = expense
    ? new Set(expense.splits.map((s) => s.userId))
    : new Set(members.map((m) => m.user.id))
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(initialSelected)

  const initialExact: Record<string, string> = {}
  if (expense?.splitType === 'EXACT') {
    for (const s of expense.splits) {
      initialExact[s.userId] = String(parseFloat(s.amount))
    }
  }
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(initialExact)
  const [percentages, setPercentages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { authFetch } = useAuthFetch()

  const totalAmount = parseFloat(amount) || 0
  const selectedMembersList = members.filter((m) => selectedMembers.has(m.user.id))
  const perPerson = selectedMembersList.length > 0 ? totalAmount / selectedMembersList.length : 0

  const toggleMember = (userId: string) => {
    const next = new Set(selectedMembers)
    if (next.has(userId)) {
      if (next.size > 1) next.delete(userId)
    } else {
      next.add(userId)
    }
    setSelectedMembers(next)
  }

  const exactTotal = Object.entries(exactAmounts)
    .filter(([uid]) => selectedMembers.has(uid))
    .reduce((sum, [, v]) => sum + (parseFloat(v) || 0), 0)
  const pctTotal = Object.entries(percentages)
    .filter(([uid]) => selectedMembers.has(uid))
    .reduce((sum, [, v]) => sum + (parseFloat(v) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !amount || totalAmount <= 0) return

    let splits
    if (splitType === 'EQUAL') {
      splits = selectedMembersList.map((m) => ({ userId: m.user.id }))
    } else if (splitType === 'EXACT') {
      if (Math.abs(exactTotal - totalAmount) > 0.01) {
        toast.error(`Amounts must sum to ${formatCurrency(totalAmount)}`)
        return
      }
      splits = selectedMembersList.map((m) => ({
        userId: m.user.id,
        amount: parseFloat(exactAmounts[m.user.id] || '0'),
      }))
    } else {
      if (Math.abs(pctTotal - 100) > 0.01) {
        toast.error('Percentages must sum to 100%')
        return
      }
      splits = selectedMembersList.map((m) => ({
        userId: m.user.id,
        percentage: parseFloat(percentages[m.user.id] || '0'),
      }))
    }

    setLoading(true)
    try {
      const url = isEditing ? `/api/expenses/${expense.id}` : '/api/expenses'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await authFetch(url, {
        method,
        body: JSON.stringify({
          groupId,
          amount: totalAmount,
          description,
          splitType,
          splits,
          paidById,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      toast.success(isEditing ? 'Expense updated!' : 'Expense added!')
      router.push(`/dashboard/groups/${groupId}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save expense'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg glass rounded-2xl p-8 float-shadow">
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="e.g. Dinner, Uber, Groceries"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount ($)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label>Paid By</Label>
        <select
          value={paidById}
          onChange={(e) => setPaidById(e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
        >
          {members.map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name || m.user.email || 'Unknown'}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Split Type</Label>
        <Tabs value={splitType} onValueChange={(v) => setSplitType(v as SplitType)}>
          <TabsList className="grid grid-cols-3 w-full rounded-xl">
            <TabsTrigger value="EQUAL" className="rounded-lg">Equal</TabsTrigger>
            <TabsTrigger value="EXACT" className="rounded-lg">Exact</TabsTrigger>
            <TabsTrigger value="PERCENTAGE" className="rounded-lg">Percentage</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-3">
        <Label>Split Among</Label>
        {members.map((m) => (
          <div key={m.user.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedMembers.has(m.user.id)}
              onChange={() => toggleMember(m.user.id)}
              className="rounded accent-primary"
            />
            <span className="flex-1 text-sm">
              {m.user.name || m.user.email || 'Unknown'}
            </span>

            {splitType === 'EQUAL' && selectedMembers.has(m.user.id) && (
              <span className="text-sm text-muted-foreground">
                {formatCurrency(perPerson)}
              </span>
            )}

            {splitType === 'EXACT' && selectedMembers.has(m.user.id) && (
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={exactAmounts[m.user.id] || ''}
                onChange={(e) =>
                  setExactAmounts({ ...exactAmounts, [m.user.id]: e.target.value })
                }
                className="w-28 rounded-xl"
              />
            )}

            {splitType === 'PERCENTAGE' && selectedMembers.has(m.user.id) && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={percentages[m.user.id] || ''}
                  onChange={(e) =>
                    setPercentages({ ...percentages, [m.user.id]: e.target.value })
                  }
                  className="w-20 rounded-xl"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            )}
          </div>
        ))}

        {splitType === 'EXACT' && (
          <p className={`text-sm ${Math.abs(exactTotal - totalAmount) > 0.01 ? 'text-rose-500' : 'text-emerald-600'}`}>
            Total: {formatCurrency(exactTotal)} / {formatCurrency(totalAmount)}
          </p>
        )}
        {splitType === 'PERCENTAGE' && (
          <p className={`text-sm ${Math.abs(pctTotal - 100) > 0.01 ? 'text-rose-500' : 'text-emerald-600'}`}>
            Total: {pctTotal.toFixed(1)}% / 100%
          </p>
        )}
      </div>

      <Button type="submit" disabled={loading || !description.trim() || totalAmount <= 0} className="rounded-xl">
        {loading ? 'Saving...' : isEditing ? 'Update Expense' : 'Add Expense'}
      </Button>
    </form>
  )
}
