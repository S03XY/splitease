'use client'

import { useEffect, useState, useRef, useCallback, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useAuthFetch } from '@/hooks/useCurrentUser'
import { formatCurrency, truncateAddress } from '@/lib/utils'
import { SPLIT_TYPE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Member {
  id: string
  role: string
  user: {
    id: string
    name: string | null
    email: string | null
    walletAddress: string | null
  }
}

interface ExpenseSplit {
  id: string
  amount: string
  userId: string
  isPaid: boolean
  user: { name: string | null; email: string | null }
}

interface Expense {
  id: string
  description: string
  amount: string
  paidById: string
  createdById: string | null
  splitType: keyof typeof SPLIT_TYPE_LABELS
  date: string
  paidBy: { name: string | null; email: string | null }
  splits: ExpenseSplit[]
}

interface GroupDetail {
  id: string
  name: string
  description: string | null
  inviteCode: string
  members: Member[]
  expenses: Expense[]
}

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = use(params)
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{
    id: string; name: string | null; email: string | null; walletAddress: string | null
    source: 'contact' | 'group_member'
  }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [contactUserIds, setContactUserIds] = useState<Set<string>>(new Set())
  const [addingContactId, setAddingContactId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER')
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const { authFetch } = useAuthFetch()

  const isAdmin = currentUserRole === 'ADMIN'

  const refreshGroup = useCallback(async () => {
    const res = await authFetch(`/api/groups/${groupId}`)
    if (res.ok) {
      const data = await res.json()
      setGroup(data.group)
      setCurrentUserId(data.currentUserId)
      setCurrentUserRole(data.currentUserRole)
    }
  }, [authFetch, groupId])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [, contactsRes] = await Promise.all([
          refreshGroup(),
          authFetch('/api/contacts'),
        ])
        if (contactsRes.ok) {
          const data = await contactsRes.json()
          const ids = new Set<string>()
          for (const c of data.contacts) {
            if (c.userId) ids.add(c.userId)
          }
          setContactUserIds(ids)
        }
      } catch (error) {
        console.error('Failed to fetch group:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [groupId, authFetch, refreshGroup])

  const doSearch = useCallback(async (query: string) => {
    setSearching(true)
    try {
      const res = await authFetch(`/api/people/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.results)
        setShowSuggestions(true)
      }
    } catch {
      // silent
    } finally {
      setSearching(false)
    }
  }, [authFetch])

  const handleInviteInputChange = (value: string) => {
    setInviteEmail(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (value.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      setSearching(false)
      return
    }
    setSearching(true)
    setShowSuggestions(true)
    searchTimeout.current = setTimeout(() => {
      doSearch(value)
    }, 300)
  }

  const selectPerson = (person: typeof suggestions[0]) => {
    const value = person.email || person.walletAddress || ''
    setInviteEmail(value)
    setShowSuggestions(false)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    try {
      const isAddress = inviteEmail.startsWith('0x')
      const res = await authFetch(`/api/groups/${groupId}/invite`, {
        method: 'POST',
        body: JSON.stringify(
          isAddress
            ? { walletAddress: inviteEmail }
            : { email: inviteEmail }
        ),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      toast.success('Member invited!')
      setInviteEmail('')
      setShowSuggestions(false)
      await refreshGroup()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to invite'
      toast.error(message)
    } finally {
      setInviting(false)
    }
  }

  const copyInviteCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.inviteCode)
      toast.success('Invite code copied!')
    }
  }

  const handleDeleteExpense = async () => {
    if (!deleteExpenseId) return

    setDeleting(true)
    try {
      const res = await authFetch(`/api/expenses/${deleteExpenseId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Expense deleted')
      setDeleteExpenseId(null)
      await refreshGroup()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete'
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  const addToContacts = async (member: Member) => {
    setAddingContactId(member.user.id)
    try {
      const res = await authFetch('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({
          userId: member.user.id,
          name: member.user.name || undefined,
          email: member.user.email || undefined,
          walletAddress: member.user.walletAddress || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success(`${member.user.name || member.user.email} added to contacts`)
      setContactUserIds((prev) => new Set(prev).add(member.user.id))
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to add contact'
      toast.error(msg)
    } finally {
      setAddingContactId(null)
    }
  }

  const handleRemoveMember = async (member: Member) => {
    setRemovingMemberId(member.id)
    try {
      const res = await authFetch(`/api/groups/${groupId}/members/${member.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success(`${member.user.name || member.user.email || 'Member'} removed`)
      await refreshGroup()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to remove member'
      toast.error(msg)
    } finally {
      setRemovingMemberId(null)
    }
  }

  // Check if a member is involved in any expense
  const isMemberInExpenses = (userId: string) => {
    if (!group) return false
    return group.expenses.some(
      (e) => e.paidById === userId || e.splits.some((s) => s.userId === userId)
    )
  }

  // Calculate settlement progress for an expense (based on non-payer splits)
  const getSettlementProgress = (expense: Expense) => {
    const nonPayerSplits = expense.splits.filter((s) => s.userId !== expense.paidById)
    if (nonPayerSplits.length === 0) return 100
    const settledCount = nonPayerSplits.filter((s) => s.isPaid).length
    return Math.round((settledCount / nonPayerSplits.length) * 100)
  }

  const isExpenseCreator = (expense: Expense) => {
    const creatorId = expense.createdById || expense.paidById
    return creatorId === currentUserId
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 spinner-gradient" />
      </div>
    )
  }

  if (!group) {
    return <p className="text-muted-foreground">Group not found.</p>
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="space-y-3">
        <Link href="/dashboard/groups" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          All Groups
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text inline-block">{group.name}</h1>
            {group.description && (
              <p className="text-muted-foreground mt-1">{group.description}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Link href={`/dashboard/groups/${groupId}/settle`}>
              <Button variant="outline" className="rounded-xl">Settle Up</Button>
            </Link>
            <Link href={`/dashboard/groups/${groupId}/expenses/new`}>
              <Button className="rounded-xl">Add Expense</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Members */}
        <Card className="glass rounded-2xl border-0 float-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Members ({group.members.length})</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-xl h-8 text-xs">
                    + Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Member</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div className="relative">
                      <div className="relative">
                        <Input
                          placeholder="Search contacts or type email / wallet (0x...)"
                          value={inviteEmail}
                          onChange={(e) => handleInviteInputChange(e.target.value)}
                          onFocus={() => inviteEmail.length >= 2 && setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                          className="rounded-xl pr-9"
                          autoComplete="off"
                        />
                        {searching && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 spinner-gradient" />
                          </div>
                        )}
                      </div>
                      {showSuggestions && !searching && suggestions.length > 0 && (
                        <div className="absolute z-50 top-full mt-1 w-full bg-background rounded-xl overflow-hidden shadow-lg border border-border max-h-64 overflow-y-auto">
                          {suggestions.map((person) => (
                            <button
                              key={person.id}
                              type="button"
                              onMouseDown={() => selectPerson(person)}
                              className="w-full text-left px-4 py-2.5 hover:bg-secondary transition-colors flex items-center gap-3 cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold shrink-0">
                                {(person.name || person.email || person.walletAddress || '?')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{person.name || person.email || person.walletAddress}</p>
                                {person.name && person.email && (
                                  <p className="text-xs text-muted-foreground truncate">{person.email}</p>
                                )}
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                                person.source === 'contact'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-blue-500/10 text-blue-500'
                              }`}>
                                {person.source === 'contact' ? 'Contact' : 'Group member'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button type="submit" disabled={inviting} className="rounded-xl">
                      {inviting ? 'Inviting...' : 'Invite'}
                    </Button>
                  </form>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Or share invite code:</p>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm font-mono">
                        {group.inviteCode}
                      </code>
                      <Button variant="outline" size="sm" onClick={copyInviteCode} className="rounded-lg">
                        Copy
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-1">
              {group.members.map((member) => {
                const displayName = member.user.name || member.user.email || 'Unknown'
                const subtitle = member.user.name
                  ? member.user.email || (member.user.walletAddress ? truncateAddress(member.user.walletAddress) : null)
                  : member.user.walletAddress ? truncateAddress(member.user.walletAddress) : null
                const isMe = member.user.id === currentUserId
                const canRemove = isAdmin && !isMe && !isMemberInExpenses(member.user.id)
                const canAddContact = !isMe && !contactUserIds.has(member.user.id)

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-foreground/3 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                      {displayName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {displayName}
                          {isMe && <span className="text-muted-foreground font-normal"> (you)</span>}
                        </p>
                        {member.role === 'ADMIN' && (
                          <Badge className="text-[10px] h-5 px-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/15 border-0">
                            Admin
                          </Badge>
                        )}
                      </div>
                      {subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                      )}
                    </div>
                    {(canAddContact || canRemove) && (
                      <div className="flex items-center gap-1 shrink-0">
                        {canAddContact && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[11px] h-7 px-2.5 rounded-lg"
                            disabled={addingContactId === member.user.id}
                            onClick={() => addToContacts(member)}
                          >
                            {addingContactId === member.user.id ? '...' : 'Add Contact'}
                          </Button>
                        )}
                        {canRemove && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[11px] h-7 px-2.5 rounded-lg text-rose-500 border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600"
                            disabled={removingMemberId === member.id}
                            onClick={() => handleRemoveMember(member)}
                          >
                            {removingMemberId === member.id ? '...' : 'Remove'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="md:col-span-2 glass rounded-2xl border-0 float-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Your Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const myExpenses = group.expenses.filter(
                (e) => e.paidById === currentUserId || e.splits.some((s) => s.userId === currentUserId)
              )
              if (myExpenses.length === 0) return (
                <p className="text-muted-foreground text-sm">No expenses involving you.</p>
              )
              return (
              <div className="space-y-3">
                {myExpenses.map((expense) => {
                  const progress = getSettlementProgress(expense)
                  const isFullySettled = progress === 100
                  const nonPayerSplits = expense.splits.filter((s) => s.userId !== expense.paidById)
                  const paidCount = nonPayerSplits.filter((s) => s.isPaid).length
                  const isCreator = isExpenseCreator(expense)
                  return (
                    <button
                      key={expense.id}
                      type="button"
                      onClick={() => setSelectedExpense(expense)}
                      className="w-full text-left glass-subtle rounded-xl p-4 hover:bg-foreground/3 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">
                            Paid by {expense.paidBy.name || expense.paidBy.email} &middot;{' '}
                            {new Date(expense.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="font-semibold">{formatCurrency(parseFloat(expense.amount))}</p>
                          <p className="text-xs text-muted-foreground">
                            {nonPayerSplits.length > 0
                              ? `${paidCount}/${nonPayerSplits.length} paid`
                              : 'Self expense'}
                          </p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      {nonPayerSplits.length > 0 && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFullySettled ? 'bg-emerald-500' : progress > 0 ? 'bg-amber-500' : 'bg-foreground/10'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium shrink-0 ${
                            isFullySettled ? 'text-emerald-500' : progress > 0 ? 'text-amber-500' : 'text-muted-foreground'
                          }`}>
                            {progress}%
                          </span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Expense Detail Dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedExpense && (() => {
            const progress = getSettlementProgress(selectedExpense)
            const isFullySettled = progress === 100
            const isCreator = isExpenseCreator(selectedExpense)
            const nonPayerSplits = selectedExpense.splits.filter((s) => s.userId !== selectedExpense.paidById)
            const paidCount = nonPayerSplits.filter((s) => s.isPaid).length
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl">{selectedExpense.description}</DialogTitle>
                  <DialogDescription>
                    {new Date(selectedExpense.date).toLocaleDateString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </DialogDescription>
                </DialogHeader>

                {/* Summary row */}
                <div className="flex items-center justify-between glass-subtle rounded-xl p-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Amount</p>
                    <p className="text-2xl font-bold mt-0.5">{formatCurrency(parseFloat(selectedExpense.amount))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Paid by</p>
                    <p className="text-sm font-semibold mt-0.5">
                      {selectedExpense.paidBy.name || selectedExpense.paidBy.email}
                    </p>
                  </div>
                </div>

                {/* Progress section */}
                {nonPayerSplits.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Settlement Progress</p>
                      <span className={`text-sm font-semibold ${
                        isFullySettled ? 'text-emerald-500' : progress > 0 ? 'text-amber-500' : 'text-muted-foreground'
                      }`}>
                        {paidCount}/{nonPayerSplits.length} settled ({progress}%)
                      </span>
                    </div>
                    <div className="h-2 bg-foreground/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFullySettled ? 'bg-emerald-500' : progress > 0 ? 'bg-amber-500' : 'bg-foreground/10'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Splits list */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Split Breakdown</p>
                  <div className="space-y-1">
                    {selectedExpense.splits.map((split) => {
                      const isPayer = split.userId === selectedExpense.paidById
                      const isMe = split.userId === currentUserId
                      return (
                        <div
                          key={split.id}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                            split.isPaid || isPayer ? 'bg-emerald-500/5' : 'bg-foreground/3'
                          }`}
                        >
                          {/* Status icon */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                            split.isPaid || isPayer
                              ? 'bg-emerald-500/20 text-emerald-500'
                              : 'bg-foreground/10 text-muted-foreground'
                          }`}>
                            {split.isPaid || isPayer ? '\u2713' : '\u2022'}
                          </div>
                          {/* Name */}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {split.user.name || split.user.email}
                              {isMe && <span className="text-muted-foreground font-normal"> (you)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isPayer ? 'Payer' : split.isPaid ? 'Settled' : 'Pending'}
                            </p>
                          </div>
                          {/* Amount */}
                          <p className={`text-sm font-semibold shrink-0 ${
                            split.isPaid || isPayer ? 'text-emerald-500' : ''
                          }`}>
                            {formatCurrency(parseFloat(split.amount))}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Footer info + actions */}
                <div className="flex items-center justify-between pt-2">
                  <Badge variant="outline" className="text-xs rounded-lg">
                    {SPLIT_TYPE_LABELS[selectedExpense.splitType]}
                  </Badge>
                  {isCreator && !isFullySettled && (
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/groups/${groupId}/expenses/${selectedExpense.id}/edit`}>
                        <Button variant="outline" size="sm" className="rounded-xl text-xs">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs text-rose-500 border-rose-500/20 hover:bg-rose-500/10"
                        onClick={() => {
                          setDeleteExpenseId(selectedExpense.id)
                          setSelectedExpense(null)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteExpenseId} onOpenChange={(open) => !open && setDeleteExpenseId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone
              and will affect all balances in this group.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteExpenseId(null)}
              disabled={deleting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteExpense}
              disabled={deleting}
              className="rounded-xl"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
