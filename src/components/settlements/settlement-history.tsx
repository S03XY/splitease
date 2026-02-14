'use client'

import { Badge } from '@/components/ui/badge'
import { formatCurrency, truncateAddress } from '@/lib/utils'
import { getExplorerTxUrl } from '@/lib/tempo'
import { SETTLEMENT_STATUS_LABELS } from '@/lib/constants'

interface Settlement {
  id: string
  amount: string
  txHash: string | null
  status: keyof typeof SETTLEMENT_STATUS_LABELS
  createdAt: string
  fromUser: { name: string | null; email: string | null }
  toUser: { name: string | null; email: string | null }
  group: { name: string }
}

interface SettlementHistoryProps {
  settlements: Settlement[]
  currentUserId?: string
}

export function SettlementHistory({ settlements }: SettlementHistoryProps) {
  if (settlements.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-4">No settlements yet.</p>
  }

  return (
    <div className="space-y-3">
      {settlements.map((s) => (
        <div key={s.id} className="flex items-center justify-between border-b border-border/30 pb-3 last:border-0">
          <div>
            <p className="text-sm font-medium">
              {s.fromUser.name || s.fromUser.email} paid{' '}
              {s.toUser.name || s.toUser.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {s.group.name} &middot; {new Date(s.createdAt).toLocaleDateString()}
            </p>
            {s.txHash && (
              <a
                href={getExplorerTxUrl(s.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Tx: {truncateAddress(s.txHash)}
              </a>
            )}
          </div>
          <div className="text-right">
            <p className="font-semibold">{formatCurrency(parseFloat(s.amount))}</p>
            <Badge
              variant={s.status === 'CONFIRMED' ? 'default' : s.status === 'FAILED' ? 'destructive' : 'secondary'}
              className="text-xs rounded-lg"
            >
              {SETTLEMENT_STATUS_LABELS[s.status]}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
