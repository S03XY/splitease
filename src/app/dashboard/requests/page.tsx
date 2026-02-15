'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthFetch } from '@/hooks/useCurrentUser'
import { usePaymentTransfer } from '@/hooks/usePaymentTransfer'
import { formatCurrency, truncateAddress, formatAmountWithCommas, sanitizeAmountInput } from '@/lib/utils'
import { PAYMENT_REQUEST_STATUS_LABELS } from '@/lib/constants'
import { getExplorerTxUrl } from '@/lib/tempo'
import { toast } from 'sonner'

interface PaymentRequestData {
  id: string
  amount: string
  status: keyof typeof PAYMENT_REQUEST_STATUS_LABELS
  message: string | null
  rejectionReason: string | null
  txHash: string | null
  createdAt: string
  fromUser?: { name: string | null; email: string | null; walletAddress: string | null }
  toUser?: { name: string | null; email: string | null; walletAddress: string | null }
}

interface PersonSuggestion {
  id: string
  userId: string | null
  name: string | null
  email: string | null
  walletAddress: string | null
  isContact: boolean
}

interface RequestSummary {
  incomingPendingTotal: number
  outgoingPendingTotal: number
}

const ITEMS_PER_PAGE = 10

export default function RequestsPage() {
  const [incoming, setIncoming] = useState<PaymentRequestData[]>([])
  const [outgoing, setOutgoing] = useState<PaymentRequestData[]>([])
  const [summary, setSummary] = useState<RequestSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const { authFetch } = useAuthFetch()
  const { transfer, isPending: transferPending } = usePaymentTransfer()

  // List search + pagination state
  const [listSearchQuery, setListSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming')
  const [page, setPage] = useState(1)

  // Create request state
  const [showCreate, setShowCreate] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedPerson, setSelectedPerson] = useState<PersonSuggestion | null>(null)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Search state (for create dialog)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PersonSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reject dialog state
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  // Settle dialog state
  const [settleRequest, setSettleRequest] = useState<PaymentRequestData | null>(null)
  const [settlingTxHash, setSettlingTxHash] = useState<string | null>(null)

  const fetchRequests = async () => {
    try {
      const res = await authFetch('/api/payment-requests')
      if (res.ok) {
        const data = await res.json()
        setIncoming(data.incoming)
        setOutgoing(data.outgoing)
        setSummary(data.summary)
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

  useEffect(() => {
    setPage(1)
  }, [listSearchQuery, activeTab])

  const updateStatus = async (requestId: string, status: string) => {
    try {
      const res = await authFetch(`/api/payment-requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        toast.success(`Request ${status.toLowerCase()}`)
        fetchRequests()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update request')
      }
    } catch {
      toast.error('Failed to update request')
    }
  }

  const handleSettle = async () => {
    if (!settleRequest) return
    const walletAddress = settleRequest.fromUser?.walletAddress
    if (!walletAddress) {
      toast.error('Recipient has no wallet address')
      return
    }
    try {
      const txHash = await transfer({
        toAddress: walletAddress,
        amount: parseFloat(settleRequest.amount),
      })
      setSettlingTxHash(txHash)
      // Update status in DB with txHash
      await authFetch(`/api/payment-requests/${settleRequest.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PAID', txHash }),
      })
      toast.success('Payment sent!')
      fetchRequests()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment failed'
      toast.error(msg)
    }
  }

  const openSettleDialog = (req: PaymentRequestData) => {
    if (!req.fromUser?.walletAddress) {
      toast.error('Recipient has no wallet address')
      return
    }
    setSettleRequest(req)
    setSettlingTxHash(null)
  }

  const handleReject = async () => {
    if (!rejectRequestId || !rejectionReason.trim()) return
    setRejecting(true)
    try {
      const res = await authFetch(`/api/payment-requests/${rejectRequestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'DECLINED', rejectionReason: rejectionReason.trim() }),
      })
      if (res.ok) {
        toast.success('Request declined')
        setRejectRequestId(null)
        setRejectionReason('')
        fetchRequests()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to decline request')
      }
    } catch {
      toast.error('Failed to decline request')
    } finally {
      setRejecting(false)
    }
  }

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

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
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

  const openCreateDialog = () => {
    setShowCreate(true)
    setStep(1)
    setSelectedPerson(null)
    setAmount('')
    setMessage('')
    setSearchQuery('')
    setSuggestions([])
  }

  const selectPerson = (person: PersonSuggestion) => {
    if (!person.userId) {
      toast.error('This person hasn\'t joined yet')
      return
    }
    setSelectedPerson(person)
    setSearchQuery(person.name || person.email || person.walletAddress || '')
    setShowSuggestions(false)
    setStep(2)
  }

  const handleSubmitRequest = async () => {
    if (!selectedPerson?.userId || !amount) return
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
          toUserId: selectedPerson.userId,
          amount: parsedAmount,
          message: message || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success(`Request sent to ${selectedPerson.name || selectedPerson.email}`)
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

  // List filtering + pagination
  const activeList = activeTab === 'incoming' ? incoming : outgoing
  const filtered = activeList.filter((req) => {
    if (!listSearchQuery) return true
    const q = listSearchQuery.toLowerCase()
    const user = activeTab === 'incoming' ? req.fromUser : req.toUser
    const name = user?.name?.toLowerCase() || ''
    const email = user?.email?.toLowerCase() || ''
    return name.includes(q) || email.includes(q)
  })
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const incomingPendingCount = incoming.filter((r) => r.status === 'PENDING').length
  const outgoingPendingCount = outgoing.filter((r) => r.status === 'PENDING').length

  const getStatusBadge = (req: PaymentRequestData) => {
    const styles = {
      PAID: 'bg-primary/10 text-primary border-primary/20',
      DECLINED: 'bg-destructive/10 text-destructive border-destructive/20',
      CANCELLED: 'bg-muted text-muted-foreground border-border/30',
      PENDING: 'bg-primary/10 text-primary border-primary/20',
    }
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${styles[req.status] || styles.PENDING}`}>
        {req.status === 'PAID' && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        )}
        {req.status === 'DECLINED' && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        )}
        {PAYMENT_REQUEST_STATUS_LABELS[req.status]}
      </span>
    )
  }

  const renderRequestCard = (req: PaymentRequestData, type: 'incoming' | 'outgoing') => {
    const user = type === 'incoming' ? req.fromUser : req.toUser
    const displayName = user?.name || user?.email || 'Unknown'
    const initial = displayName[0].toUpperCase()
    const isPending = req.status === 'PENDING'
    const dateStr = new Date(req.createdAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    })

    return (
      <div
        key={req.id}
        className={`group glass-subtle rounded-2xl overflow-hidden transition-all duration-200 hover:bg-foreground/2 ${
          isPending ? 'ring-1 ring-border/30' : ''
        }`}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-primary/10 text-primary">
              {initial}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-semibold truncate">{displayName}</p>
                  {!isPending && getStatusBadge(req)}
                </div>
                <p className="text-lg font-bold tabular-nums shrink-0 text-foreground">
                  {formatCurrency(parseFloat(req.amount))}
                </p>
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs text-muted-foreground">
                  {type === 'incoming' ? 'Requested from you' : 'You requested'}
                </p>
                <span className="text-muted-foreground/40">·</span>
                <p className="text-xs text-muted-foreground">{dateStr}</p>
              </div>

              {req.message && (
                <p className="text-xs text-muted-foreground/80 mt-1.5 italic">
                  &ldquo;{req.message}&rdquo;
                </p>
              )}

              {req.status === 'PAID' && req.txHash && (
                <a
                  href={getExplorerTxUrl(req.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 mt-1.5 font-mono transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  {truncateAddress(req.txHash)}
                </a>
              )}

              {req.status === 'DECLINED' && req.rejectionReason && (
                <p className="text-xs text-destructive mt-1.5 flex items-start gap-1">
                  <svg className="w-3 h-3 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {req.rejectionReason}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons for pending requests */}
        {isPending && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
            <div className="flex items-center gap-2.5">
              {type === 'incoming' ? (
                <>
                  <button
                    className="flex-1 h-9 rounded-xl text-xs font-medium border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/60 hover:bg-foreground/5 transition-all cursor-pointer"
                    onClick={() => { setRejectRequestId(req.id); setRejectionReason('') }}
                  >
                    Decline
                  </button>
                  <button
                    className="flex-2 h-9 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => openSettleDialog(req)}
                  >
                    Pay {formatCurrency(parseFloat(req.amount))}
                  </button>
                </>
              ) : (
                <button
                  className="h-9 px-4 rounded-xl text-xs font-medium text-destructive border border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30 transition-all cursor-pointer"
                  onClick={() => updateStatus(req.id, 'CANCELLED')}
                >
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        )}
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl float-shadow p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Incoming</p>
            {incomingPendingCount > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {incomingPendingCount} pending
              </span>
            )}
          </div>
          <p className="text-3xl font-bold mt-2 text-foreground">
            {formatCurrency(summary?.incomingPendingTotal || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Pending amount requested from you</p>
        </div>
        <div className="glass rounded-2xl float-shadow p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outgoing</p>
            {outgoingPendingCount > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {outgoingPendingCount} pending
              </span>
            )}
          </div>
          <p className="text-3xl font-bold mt-2 text-foreground">
            {formatCurrency(summary?.outgoingPendingTotal || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Pending amount you requested from others</p>
        </div>
      </div>

      {(incoming.length > 0 || outgoing.length > 0) && (
        <Input
          placeholder="Search by name or email..."
          value={listSearchQuery}
          onChange={(e) => setListSearchQuery(e.target.value)}
          className="rounded-xl"
          autoComplete="off"
        />
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'incoming' | 'outgoing')}>
        <TabsList className="rounded-xl">
          <TabsTrigger value="incoming" className="rounded-lg">
            Incoming {incoming.length > 0 && `(${incoming.length})`}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="rounded-lg">
            Outgoing {outgoing.length > 0 && `(${outgoing.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-4">
          {filtered.length === 0 ? (
            <div className="glass rounded-2xl float-shadow p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
              </div>
              <p className="text-sm text-muted-foreground">
                {listSearchQuery ? 'No matching requests found.' : 'No incoming requests yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {paginated.map((req) => renderRequestCard(req, 'incoming'))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="mt-4">
          {filtered.length === 0 ? (
            <div className="glass rounded-2xl float-shadow p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
              </div>
              <p className="text-sm text-muted-foreground">
                {listSearchQuery ? 'No matching requests found.' : 'No outgoing requests yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {paginated.map((req) => renderRequestCard(req, 'outgoing'))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {filtered.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} request{filtered.length !== 1 ? 's' : ''}
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

      {/* Settle Payment Dialog */}
      <Dialog open={!!settleRequest} onOpenChange={(open) => { if (!open) { setSettleRequest(null); setSettlingTxHash(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{settlingTxHash ? 'Payment Sent' : 'Confirm Payment'}</DialogTitle>
            {!settlingTxHash && (
              <DialogDescription>
                Send AlphaUSD on the Tempo testnet to settle this request.
              </DialogDescription>
            )}
          </DialogHeader>

          {settlingTxHash ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                  <span className="text-3xl text-primary">{'\u2713'}</span>
                </div>
              </div>
              <div className="glass-subtle rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-sm font-semibold">{formatCurrency(parseFloat(settleRequest?.amount || '0'))} AlphaUSD</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="text-sm font-semibold">{settleRequest?.fromUser?.name || settleRequest?.fromUser?.email}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Transaction</p>
                  <a
                    href={getExplorerTxUrl(settlingTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline font-mono"
                  >
                    {truncateAddress(settlingTxHash)}
                  </a>
                </div>
              </div>
              <Button
                onClick={() => { setSettleRequest(null); setSettlingTxHash(null) }}
                className="w-full rounded-xl"
              >
                Done
              </Button>
            </div>
          ) : settleRequest && (
            <div className="space-y-4">
              <div className="glass-subtle rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(parseFloat(settleRequest.amount))} AlphaUSD</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Recipient</p>
                  <p className="text-sm font-semibold">{settleRequest.fromUser?.name || settleRequest.fromUser?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                  <p className="text-xs font-mono bg-foreground/5 rounded-lg px-3 py-2 break-all">
                    {settleRequest.fromUser?.walletAddress}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setSettleRequest(null); setSettlingTxHash(null) }}
                  disabled={transferPending}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button onClick={handleSettle} disabled={transferPending} className="rounded-xl">
                  {transferPending ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent" />
                      Sending...
                    </span>
                  ) : (
                    'Confirm & Send'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Request Dialog */}
      <Dialog open={!!rejectRequestId} onOpenChange={(open) => { if (!open) { setRejectRequestId(null); setRejectionReason('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this payment request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for declining..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="rounded-xl min-h-24"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setRejectRequestId(null); setRejectionReason('') }}
              disabled={rejecting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejecting || !rejectionReason.trim()}
              className="rounded-xl"
            >
              {rejecting ? 'Declining...' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Request Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && setShowCreate(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 1 && 'Search Person'}
              {step === 2 && 'Request Details'}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Search person */}
          {step === 1 && (
            <div className="space-y-2">
              <div className="relative">
                <div className="relative">
                  <Input
                    placeholder="Search contacts or group members..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
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
                  <div className="absolute z-50 top-full mt-1.5 w-full rounded-xl overflow-hidden shadow-xl border border-border max-h-64 overflow-y-auto bg-background" style={{ backgroundColor: 'var(--background)' }}>
                    {suggestions.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onMouseDown={() => selectPerson(person)}
                        className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center gap-3 cursor-pointer border-b border-border/10 last:border-b-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {(person.name || person.email || person.walletAddress || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{person.name || person.email || person.walletAddress}</p>
                          {person.name && person.email && (
                            <p className="text-xs text-muted-foreground truncate">{person.email}</p>
                          )}
                        </div>
                        {person.isContact && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 bg-primary/10 text-primary border border-primary/20">
                            Contact
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Amount + message */}
          {step === 2 && selectedPerson && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setStep(1)
                  setSelectedPerson(null)
                  setSearchQuery('')
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                &larr; Back
              </button>
              <div className="glass-subtle rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">Requesting from</p>
                <p className="font-semibold text-lg mt-1">
                  {selectedPerson.name || selectedPerson.email}
                </p>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg pointer-events-none">$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={formatAmountWithCommas(amount)}
                  onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                  className="rounded-xl text-lg font-semibold pl-8"
                />
              </div>
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
