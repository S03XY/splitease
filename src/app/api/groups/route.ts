import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { calculateNetBalances } from '@/lib/balance'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const groups = await prisma.group.findMany({
    where: {
      members: { some: { userId: user.id } },
    },
    include: {
      members: { include: { user: true } },
      expenses: { include: { splits: true } },
      settlements: true,
      _count: { select: { expenses: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const enrichedGroups = groups.map((g) => {
    const expenseData = g.expenses.map((e) => ({
      paidById: e.paidById,
      amount: Number(e.amount),
      splits: e.splits.map((s) => ({ userId: s.userId, amount: Number(s.amount) })),
    }))
    const settlementData = g.settlements.map((s) => ({
      fromUserId: s.fromUserId,
      toUserId: s.toUserId,
      amount: Number(s.amount),
      status: s.status,
    }))
    const netBalances = calculateNetBalances(expenseData, settlementData)
    const userBalance = netBalances.get(user.id) || 0
    const totalExpenses = expenseData.reduce((sum, e) => sum + e.amount, 0)

    // Strip expenses/settlements from response to keep payload small
    const { expenses: _e, settlements: _s, ...rest } = g
    return {
      ...rest,
      balance: Math.round(userBalance * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
    }
  })

  return NextResponse.json({ groups: enrichedGroups })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      createdById: user.id,
      members: {
        create: { userId: user.id, role: 'ADMIN' },
      },
    },
    include: {
      members: { include: { user: true } },
    },
  })

  return NextResponse.json({ group }, { status: 201 })
}
