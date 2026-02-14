'use client'

import { use, useState } from 'react'
import { useBalances } from '@/hooks/useBalances'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SettleButton } from '@/components/settlements/settle-button'
import { formatCurrency } from '@/lib/utils'
import { useAuthFetch } from '@/hooks/useCurrentUser'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function SettlePage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = use(params)
  const { simplifiedDebts, currentUserId, loading, refetch } = useBalances(groupId)
  const { authFetch } = useAuthFetch()

  const [requestTarget, setRequestTarget] = useState<{
    userId: string
    name: string
    amount: number
  } | null>(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [requesting, setRequesting] = useState(false)

  const handleRequestPayment = async () => {
    if (!requestTarget) return
    setRequesting(true)
    try {
      const res = await authFetch('/api/payment-requests', {
        method: 'POST',
        body: JSON.stringify({
          toUserId: requestTarget.userId,
          amount: requestTarget.amount,
          groupId,
          message: requestMessage || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success(`Payment request sent to ${requestTarget.name}`)
      setRequestTarget(null)
      setRequestMessage('')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send request'
      toast.error(message)
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 spinner-gradient" />
      </div>
    )
  }

  const myDebts = simplifiedDebts?.filter((d) => d.fromUserId === currentUserId) || []
  const owedToMe = simplifiedDebts?.filter((d) => d.toUserId === currentUserId) || []

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in-up">
      <h1 className="text-3xl font-bold gradient-text inline-block">Settle Up</h1>

      {myDebts.length > 0 ? (
        <Card className="glass rounded-2xl border-0 float-shadow">
          <CardHeader>
            <CardTitle>You Owe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {myDebts.map((debt, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{debt.toUserName || 'Unknown'}</p>
                  <p className="text-sm text-rose-500">{formatCurrency(debt.amount)}</p>
                </div>
                {debt.toWalletAddress ? (
                  <SettleButton
                    toAddress={debt.toWalletAddress}
                    toName={debt.toUserName}
                    amount={debt.amount}
                    groupId={groupId}
                    toUserId={debt.toUserId}
                    onSettled={refetch}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No wallet address</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass rounded-2xl border-0 float-shadow">
          <CardContent className="py-8 text-center text-muted-foreground">
            You don&apos;t owe anyone in this group.
          </CardContent>
        </Card>
      )}

      {owedToMe.length > 0 && (
        <Card className="glass rounded-2xl border-0 float-shadow">
          <CardHeader>
            <CardTitle>Owed to You</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {owedToMe.map((debt, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{debt.fromUserName || 'Unknown'}</p>
                  <p className="text-sm text-emerald-500 font-medium">
                    {formatCurrency(debt.amount)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() =>
                    setRequestTarget({
                      userId: debt.fromUserId,
                      name: debt.fromUserName || 'Unknown',
                      amount: debt.amount,
                    })
                  }
                >
                  Request
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {myDebts.length === 0 && owedToMe.length === 0 && (
        <Card className="glass rounded-2xl border-0 float-shadow">
          <CardContent className="py-8 text-center text-muted-foreground">
            All settled up in this group!
          </CardContent>
        </Card>
      )}

      {/* Request Payment Dialog */}
      <Dialog open={!!requestTarget} onOpenChange={(open) => !open && setRequestTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payment</DialogTitle>
          </DialogHeader>
          {requestTarget && (
            <div className="space-y-4">
              <div className="glass-subtle rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">Requesting from</p>
                <p className="font-semibold text-lg mt-1">{requestTarget.name}</p>
                <p className="text-2xl font-bold text-emerald-500 mt-2">
                  {formatCurrency(requestTarget.amount)}
                </p>
              </div>
              <Input
                placeholder="Add a message (optional)"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                className="rounded-xl"
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setRequestTarget(null)}
                  disabled={requesting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onClick={handleRequestPayment}
                  disabled={requesting}
                >
                  {requesting ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
