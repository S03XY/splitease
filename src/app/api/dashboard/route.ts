import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { calculateNetBalances } from '@/lib/balance'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: {
      group: {
        include: {
          expenses: { include: { splits: true } },
          settlements: true,
          members: { include: { user: true } },
        },
      },
    },
  })

  let totalOwed = 0
  let totalOwing = 0

  const groupSummaries = memberships.map((m) => {
    const expenseData = m.group.expenses.map((e) => ({
      paidById: e.paidById,
      amount: Number(e.amount),
      splits: e.splits.map((s) => ({ userId: s.userId, amount: Number(s.amount) })),
    }))
    const settlementData = m.group.settlements.map((s) => ({
      fromUserId: s.fromUserId,
      toUserId: s.toUserId,
      amount: Number(s.amount),
      status: s.status,
    }))

    const netBalances = calculateNetBalances(expenseData, settlementData)
    const userBalance = netBalances.get(user.id) || 0
    const rounded = Math.round(userBalance * 100) / 100

    if (rounded > 0) totalOwed += rounded
    else totalOwing += Math.abs(rounded)

    return {
      groupId: m.group.id,
      groupName: m.group.name,
      memberCount: m.group.members.length,
      balance: rounded,
    }
  })

  const [pendingRequests, recentSettlements] = await Promise.all([
    prisma.paymentRequest.count({
      where: { toUserId: user.id, status: 'PENDING' },
    }),
    prisma.settlement.findMany({
      where: { OR: [{ fromUserId: user.id }, { toUserId: user.id }] },
      include: { fromUser: true, toUser: true, group: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return NextResponse.json({
    totalOwed: Math.round(totalOwed * 100) / 100,
    totalOwing: Math.round(totalOwing * 100) / 100,
    pendingRequests,
    groupSummaries,
    recentSettlements,
  })
}
