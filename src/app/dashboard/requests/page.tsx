'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthFetch } from '@/hooks/useCurrentUser'
import { formatCurrency } from '@/lib/utils'
import { PAYMENT_REQUEST_STATUS_LABELS } from '@/lib/constants'
import { toast } from 'sonner'

interface PaymentRequestData {
  id: string
  amount: string
  status: keyof typeof PAYMENT_REQUEST_STATUS_LABELS
  message: string | null
  createdAt: string
  fromUser?: { name: string | null; email: string | null; walletAddress: string | null }
  toUser?: { name: string | null; email: string | null }
  group: { name: string }
}

interface GroupMember {
  userId: string
  user: {
    id: string
    name: string | null
    email: string | null
    walletAddress: string | null
  }
}

interface GroupData {
  id: string
  name: string
  members: GroupMember[]
}

export default function RequestsPage() {
  const [incoming, setIncoming] = useState<PaymentRequestData[]>([])
  const [outgoing, setOutgoing] = useState<PaymentRequestData[]>([])
  const [loading, setLoading] = useState(true)
  const { authFetch } = useAuthFetch()

  // Create request state
  const [showCreate, setShowCreate] = useState(false)
  const [groups, setGroups] = useState<GroupData[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null)
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')

  const fetchRequests = async () => {
    try {
      const res = await authFetch('/api/payment-requests')
      if (res.ok) {
        const data = await res.json()
        setIncoming(data.incoming)
        setOutgoing(data.outgoing)
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [authFetch])

  const updateStatus = async (requestId: string, status: string) => {
    try {
      const res = await authFetch(`/api/payment-requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        toast.success(`Request ${status.toLowerCase()}`)
        fetchRequests()
      }
    } catch {
      toast.error('Failed to update request')
    }
  }

  const openCreateDialog = async () => {
    setShowCreate(true)
    setStep(1)
    setSelectedGroup(null)
    setSelectedMember(null)
    setAmount('')
    setMessage('')
    setMemberSearch('')
    setGroupsLoading(true)
    try {
      const res = await authFetch('/api/groups')
      if (res.ok) {
        const data = await res.json()
        setGroups(data.groups)
      }
    } catch {
      toast.error('Failed to load groups')
    } finally {
      setGroupsLoading(false)
    }
  }

  const handleSubmitRequest = async () => {
    if (!selectedGroup || !selectedMember || !amount) return
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setSubmitting(true)
    try {
      const res = await authFetch('/api/payment-requests', {
        method: 'POST',
        body: JSON.stringify({
          toUserId: selectedMember.userId,
          amount: parsedAmount,
          groupId: selectedGroup.id,
          message: message || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success(`Request sent to ${selectedMember.user.name || selectedMember.user.email}`)
      setShowCreate(false)
      fetchRequests()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to send request'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

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
        <h1 className="text-3xl font-bold gradient-text inline-block">Payment Requests</h1>
        <Button onClick={openCreateDialog} className="rounded-xl">
          New Request
        </Button>
      </div>

      <Tabs defaultValue="incoming">
        <TabsList className="rounded-xl">
          <TabsTrigger value="incoming" className="rounded-lg">
            Incoming {incoming.length > 0 && `(${incoming.length})`}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="rounded-lg">Outgoing</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-4">
          {incoming.length === 0 ? (
            <div className="glass rounded-2xl float-shadow p-8 text-center">
              <p className="text-muted-foreground">No incoming requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incoming.map((req) => (
                <Card key={req.id} className="glass rounded-2xl border-0 float-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {req.fromUser?.name || req.fromUser?.email} requests{' '}
                          {formatCurrency(parseFloat(req.amount))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {req.group.name}
                          {req.message && ` — "${req.message}"`}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(req.id, 'DECLINED')}
                          className="rounded-xl"
                        >
                          Decline
                        </Button>
                        <Button size="sm" onClick={() => updateStatus(req.id, 'PAID')} className="rounded-xl">
                          Mark Paid
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="mt-4">
          {outgoing.length === 0 ? (
            <div className="glass rounded-2xl float-shadow p-8 text-center">
              <p className="text-muted-foreground">No outgoing requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {outgoing.map((req) => (
                <Card key={req.id} className="glass rounded-2xl border-0 float-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          Requested {formatCurrency(parseFloat(req.amount))} from{' '}
                          {req.toUser?.name || req.toUser?.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {req.group.name}
                          {req.message && ` — "${req.message}"`}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            req.status === 'PAID'
                              ? 'default'
                              : req.status === 'DECLINED'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="rounded-lg"
                        >
                          {PAYMENT_REQUEST_STATUS_LABELS[req.status]}
                        </Badge>
                        {req.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatus(req.id, 'CANCELLED')}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Request Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && setShowCreate(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 1 && 'Select Group'}
              {step === 2 && 'Select Member'}
              {step === 3 && 'Request Details'}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Select group */}
          {step === 1 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {groupsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 spinner-gradient" />
                </div>
              ) : groups.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No groups found.</p>
              ) : (
                groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedGroup(group)
                      setSelectedMember(null)
                      setStep(2)
                    }}
                    className="w-full text-left glass-subtle rounded-xl px-4 py-3 hover:bg-foreground/5 transition-colors cursor-pointer"
                  >
                    <p className="font-medium">{group.name}</p>
                    <p className="text-xs text-muted-foreground">{group.members.length} members</p>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 2: Select member */}
          {step === 2 && selectedGroup && (() => {
            const q = memberSearch.toLowerCase()
            const filtered = q
              ? selectedGroup.members.filter(
                  (m) =>
                    m.user.name?.toLowerCase().includes(q) ||
                    m.user.email?.toLowerCase().includes(q) ||
                    m.user.walletAddress?.toLowerCase().includes(q)
                )
              : selectedGroup.members
            return (
              <div className="space-y-2">
                <button
                  onClick={() => { setStep(1); setMemberSearch('') }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-2 cursor-pointer"
                >
                  &larr; {selectedGroup.name}
                </button>
                <Input
                  placeholder="Search members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="rounded-xl"
                  autoComplete="off"
                />
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filtered.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No members found.</p>
                  ) : (
                    filtered.map((member) => (
                      <button
                        key={member.userId}
                        onClick={() => {
                          setSelectedMember(member)
                          setStep(3)
                        }}
                        className="w-full text-left glass-subtle rounded-xl px-4 py-3 hover:bg-foreground/5 transition-colors cursor-pointer flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold">
                          {(member.user.name || member.user.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.user.name || member.user.email || 'Unknown'}</p>
                          {member.user.name && member.user.email && (
                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )
          })()}

          {/* Step 3: Amount + message */}
          {step === 3 && selectedMember && (
            <div className="space-y-4">
              <button
                onClick={() => setStep(2)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                &larr; Back
              </button>
              <div className="glass-subtle rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">Requesting from</p>
                <p className="font-semibold text-lg mt-1">
                  {selectedMember.user.name || selectedMember.user.email}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedGroup?.name}</p>
              </div>
              <Input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl text-lg font-semibold"
                min="0"
                step="0.01"
              />
              <Input
                placeholder="Message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="rounded-xl"
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setShowCreate(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onClick={handleSubmitRequest}
                  disabled={submitting || !amount}
                >
                  {submitting ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
