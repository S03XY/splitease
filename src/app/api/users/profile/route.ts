import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [groupsJoined, expensesCreated, settlementsCount, totalSettledAgg] = await Promise.all([
    prisma.groupMember.count({ where: { userId: user.id } }),
    prisma.expense.count({ where: { paidById: user.id } }),
    prisma.settlement.count({
      where: { OR: [{ fromUserId: user.id }, { toUserId: user.id }] },
    }),
    prisma.settlement.aggregate({
      where: { fromUserId: user.id, status: 'CONFIRMED' },
      _sum: { amount: true },
    }),
  ])

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      walletAddress: user.walletAddress,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
    stats: {
      groupsJoined,
      expensesCreated,
      settlementsCount,
      totalSettled: Number(totalSettledAgg._sum.amount || 0),
    },
  })
}
