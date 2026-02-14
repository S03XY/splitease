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

    const totalExpenses = expenseData.reduce((sum, e) => sum + e.amount, 0)

    return {
      groupId: m.group.id,
      groupName: m.group.name,
      memberCount: m.group.members.length,
      balance: rounded,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
    }
  })

  const [incomingRequests, outgoingRequests, recentSettlements] = await Promise.all([
    prisma.paymentRequest.findMany({
      where: { toUserId: user.id, status: 'PENDING' },
      select: { amount: true },
    }),
    prisma.paymentRequest.findMany({
      where: { fromUserId: user.id, status: 'PENDING' },
      select: { amount: true },
    }),
    prisma.settlement.findMany({
      where: { OR: [{ fromUserId: user.id }, { toUserId: user.id }] },
      include: { fromUser: true, toUser: true, group: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const incomingRequestTotal = incomingRequests.reduce((sum, r) => sum + Number(r.amount), 0)
  const outgoingRequestTotal = outgoingRequests.reduce((sum, r) => sum + Number(r.amount), 0)

  return NextResponse.json({
    totalOwed: Math.round(totalOwed * 100) / 100,
    totalOwing: Math.round(totalOwing * 100) / 100,
    pendingRequests: incomingRequests.length,
    requestSummary: {
      incomingCount: incomingRequests.length,
      incomingTotal: Math.round(incomingRequestTotal * 100) / 100,
      outgoingCount: outgoingRequests.length,
      outgoingTotal: Math.round(outgoingRequestTotal * 100) / 100,
    },
    groupSummaries,
    recentSettlements,
  })
}
