import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId } = await params

  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      members: { some: { userId: user.id } },
    },
    include: {
      members: { include: { user: true } },
      expenses: {
        include: {
          paidBy: true,
          splits: { include: { user: true } },
        },
        orderBy: { date: 'desc' },
      },
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  return NextResponse.json({ group })
}
