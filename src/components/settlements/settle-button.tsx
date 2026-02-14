'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useSettlement } from '@/hooks/useSettlement'
import { formatCurrency, truncateAddress } from '@/lib/utils'
import { getExplorerTxUrl } from '@/lib/tempo'
import { toast } from 'sonner'

interface SettleButtonProps {
  toAddress: string
  toName: string | null
  amount: number
  groupId: string
  toUserId: string
  onSettled?: () => void
}

export function SettleButton({
  toAddress,
  toName,
  amount,
  groupId,
  toUserId,
  onSettled,
}: SettleButtonProps) {
  const [open, setOpen] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const { settle, isPending } = useSettlement()

  const handleSettle = async () => {
    try {
      const result = await settle({ toAddress, amount, groupId, toUserId })
      setTxHash(result.txHash)
      toast.success('Payment sent!')
      onSettled?.()
    } catch {
      toast.error('Settlement failed. Please try again.')
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="rounded-xl">
        Pay {formatCurrency(amount)}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>

          {txHash ? (
            <div className="space-y-4">
              <p className="text-primary font-medium">Payment confirmed!</p>
              <div className="bg-secondary rounded-xl p-4 space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Amount:</span>{' '}
                  {formatCurrency(amount)} AlphaUSD
                </p>
                <p>
                  <span className="text-muted-foreground">To:</span>{' '}
                  {toName || truncateAddress(toAddress)}
                </p>
                <p>
                  <span className="text-muted-foreground">Tx:</span>{' '}
                  <a
                    href={getExplorerTxUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {truncateAddress(txHash)}
                  </a>
                </p>
              </div>
              <Button onClick={() => setOpen(false)} className="w-full rounded-xl">
                Done
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3 text-sm">
                <p>
                  You are about to send{' '}
                  <strong>{formatCurrency(amount)} AlphaUSD</strong> to{' '}
                  <strong>{toName || truncateAddress(toAddress)}</strong> on the
                  Tempo testnet.
                </p>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-muted-foreground">Recipient address</p>
                  <p className="font-mono text-xs break-all">{toAddress}</p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button onClick={handleSettle} disabled={isPending} className="rounded-xl">
                  {isPending ? 'Sending...' : 'Confirm & Send'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
