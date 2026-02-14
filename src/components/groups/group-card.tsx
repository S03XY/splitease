'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface GroupCardProps {
  group: {
    id: string
    name: string
    description: string | null
    members: { user: { name: string | null; email: string | null } }[]
    _count: { expenses: number }
  }
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link href={`/dashboard/groups/${group.id}`}>
      <Card className="glass rounded-2xl border-0 float-shadow hover:float-shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5">
        <CardHeader>
          <CardTitle>{group.name}</CardTitle>
          {group.description && (
            <CardDescription>{group.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Badge variant="secondary" className="rounded-lg">{group.members.length} members</Badge>
            <Badge variant="outline" className="rounded-lg">{group._count.expenses} expenses</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
