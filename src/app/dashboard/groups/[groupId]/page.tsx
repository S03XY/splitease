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
  user: { name: string | null; email: string | null }
}

interface Expense {
  id: string
  description: string
  amount: string
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
  const [searchedOnce, setSearchedOnce] = useState(false)
  const [searching, setSearching] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { authFetch } = useAuthFetch()

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await authFetch(`/api/groups/${groupId}`)
        if (res.ok) {
          const data = await res.json()
          setGroup(data.group)
        }
      } catch (error) {
        console.error('Failed to fetch group:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchGroup()
  }, [groupId, authFetch])

  const doSearch = useCallback(async (query: string) => {
    setSearching(true)
    try {
      const res = await authFetch(`/api/people/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.results)
        setShowSuggestions(true)
        setSearchedOnce(true)
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
      setSearchedOnce(false)
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
      setSearchedOnce(false)
      // Refresh group data
      const refreshRes = await authFetch(`/api/groups/${groupId}`)
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        setGroup(data.group)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to invite'
      toast.error(message)
    } finally {
      setInviting(false)
    }
  }

  const addToContactsInline = async () => {
    if (!inviteEmail.trim()) return
    setSavingContact(true)
    const isAddress = inviteEmail.startsWith('0x')
    try {
      await authFetch('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(
          isAddress
            ? { walletAddress: inviteEmail }
            : { email: inviteEmail }
        ),
      })
      toast.success('Saved to contacts')
      // Re-search to show the new contact in suggestions
      doSearch(inviteEmail)
    } catch {
      toast.error('Failed to save contact')
    } finally {
      setSavingContact(false)
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
      const refreshRes = await authFetch(`/api/groups/${groupId}`)
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        setGroup(data.group)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete'
      toast.error(message)
    } finally {
      setDeleting(false)
    }
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Members */}
        <Card className="glass rounded-2xl border-0 float-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Members</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-primary">
                    + Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Member</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div className="relative">
                      <Input
                        placeholder="Search contacts or type email / wallet (0x...)"
                        value={inviteEmail}
                        onChange={(e) => handleInviteInputChange(e.target.value)}
                        onFocus={() => inviteEmail.length >= 2 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        className="rounded-xl"
                        autoComplete="off"
                      />
                      {showSuggestions && inviteEmail.length >= 2 && (
                        <div className="absolute z-50 top-full mt-1 w-full glass-strong rounded-xl overflow-hidden shadow-lg border border-border/30 max-h-64 overflow-y-auto">
                          {searching ? (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin rounded-full h-5 w-5 spinner-gradient" />
                            </div>
                          ) : suggestions.length > 0 ? (
                            suggestions.map((person) => (
                              <button
                                key={person.id}
                                type="button"
                                onMouseDown={() => selectPerson(person)}
                                className="w-full text-left px-4 py-2.5 hover:bg-foreground/5 transition-colors flex items-center gap-3 cursor-pointer"
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
                            ))
                          ) : searchedOnce ? (
                            <div className="px-4 py-3 space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">
                                  {inviteEmail[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">New user</p>
                                  <p className="text-xs text-muted-foreground truncate">{inviteEmail}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onMouseDown={addToContactsInline}
                                  disabled={savingContact}
                                  className="flex-1 text-center text-sm font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {savingContact ? 'Saving...' : 'Save to Contacts'}
                                </button>
                                <button
                                  type="button"
                                  onMouseDown={() => setShowSuggestions(false)}
                                  className="flex-1 text-center text-sm font-medium px-3 py-1.5 rounded-lg bg-foreground/5 text-muted-foreground hover:bg-foreground/10 transition-colors cursor-pointer"
                                >
                                  Skip
                                </button>
                              </div>
                            </div>
                          ) : null}
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
          <CardContent>
            <div className="space-y-3">
              {group.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {member.user.name || member.user.email || 'Unknown'}
                    </p>
                    {member.user.walletAddress && (
                      <p className="text-xs text-muted-foreground">
                        {truncateAddress(member.user.walletAddress)}
                      </p>
                    )}
                  </div>
                  {member.role === 'ADMIN' && (
                    <Badge variant="secondary" className="text-xs rounded-lg">Admin</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="md:col-span-2 glass rounded-2xl border-0 float-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {group.expenses.length === 0 ? (
              <p className="text-muted-foreground text-sm">No expenses yet.</p>
            ) : (
              <div className="space-y-4">
                {group.expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between border-b border-border/30 pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        Paid by {expense.paidBy.name || expense.paidBy.email} &middot;{' '}
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1 rounded-lg">
                        {SPLIT_TYPE_LABELS[expense.splitType]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">
                        {formatCurrency(parseFloat(expense.amount))}
                      </p>
                      <Link href={`/dashboard/groups/${groupId}/expenses/${expense.id}/edit`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-rose-500 hover:text-rose-700"
                        onClick={() => setDeleteExpenseId(expense.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
