import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { calculateNetBalances, simplifyDebts } from '@/lib/balance'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId } = await params

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [expenses, settlements, members] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId },
      include: { splits: true },
    }),
    prisma.settlement.findMany({
      where: { groupId },
    }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: true },
    }),
  ])

  const usersMap = new Map(
    members.map((m) => [
      m.userId,
      { id: m.userId, name: m.user.name, walletAddress: m.user.walletAddress },
    ])
  )

  const expenseData = expenses.map((e) => ({
    paidById: e.paidById,
    amount: Number(e.amount),
    splits: e.splits.map((s) => ({
      userId: s.userId,
      amount: Number(s.amount),
    })),
  }))

  const settlementData = settlements.map((s) => ({
    fromUserId: s.fromUserId,
    toUserId: s.toUserId,
    amount: Number(s.amount),
    status: s.status,
  }))

  const netBalances = calculateNetBalances(expenseData, settlementData)
  const simplifiedDebts = simplifyDebts(netBalances, usersMap)

  const balances = [...usersMap.entries()].map(([userId, info]) => ({
    userId,
    userName: info.name,
    walletAddress: info.walletAddress,
    amount: Math.round((netBalances.get(userId) || 0) * 100) / 100,
  }))

  return NextResponse.json({
    balances,
    simplifiedDebts,
    currentUserId: user.id,
  })
}
