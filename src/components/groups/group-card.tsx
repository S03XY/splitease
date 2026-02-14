'use client'

import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface GroupCardProps {
  group: {
    id: string
    name: string
    description: string | null
    members: { user: { name: string | null; email: string | null } }[]
    _count: { expenses: number }
    balance: number
    totalExpenses: number
  }
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link href={`/dashboard/groups/${group.id}`}>
      <div className="glass rounded-2xl float-shadow p-5 hover:float-shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-0.5 h-full flex flex-col">
        <p className="font-semibold truncate">{group.name}</p>
        <p className="text-xs text-muted-foreground mt-1">{group.description || '-'}</p>
        <p className="text-xs text-muted-foreground mt-1">{group.members.length} members</p>
        <div className="mt-auto pt-4">
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
            <div>
              <p className="text-[11px] text-muted-foreground">Total Expenses</p>
              <p className="text-sm font-semibold mt-0.5">
                {formatCurrency(group.totalExpenses)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Your Balance</p>
              <p className={`text-sm font-semibold mt-0.5 ${group.balance > 0 ? 'text-primary' : group.balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {group.balance > 0 ? '+' : ''}{formatCurrency(group.balance)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
