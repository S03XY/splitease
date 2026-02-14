import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId, amount, description, splitType, splits, paidById, date } = await req.json()

  if (!groupId || !amount || !description || !splitType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const payerId = paidById || user.id

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  })
  const memberIds = new Set(members.map((m) => m.userId))

  if (!memberIds.has(payerId)) {
    return NextResponse.json({ error: 'Payer is not in the group' }, { status: 400 })
  }

  let calculatedSplits: { userId: string; amount: number }[] = []

  if (splitType === 'EQUAL') {
    const splitAmong: string[] = splits?.length
      ? splits.map((s: { userId: string }) => s.userId)
      : [...memberIds]
    const perPerson = parseFloat((amount / splitAmong.length).toFixed(2))
    const remainder = parseFloat((amount - perPerson * splitAmong.length).toFixed(2))

    calculatedSplits = splitAmong.map((userId: string, index: number) => ({
      userId,
      amount: index === 0 ? perPerson + remainder : perPerson,
    }))
  } else if (splitType === 'EXACT') {
    calculatedSplits = splits.map((s: { userId: string; amount: number }) => ({
      userId: s.userId,
      amount: parseFloat(Number(s.amount).toFixed(2)),
    }))
    const sum = calculatedSplits.reduce((acc, s) => acc + s.amount, 0)
    if (Math.abs(sum - amount) > 0.01) {
      return NextResponse.json(
        { error: `Split amounts ($${sum.toFixed(2)}) don't equal total ($${amount.toFixed(2)})` },
        { status: 400 }
      )
    }
  } else if (splitType === 'PERCENTAGE') {
    const totalPct = splits.reduce((acc: number, s: { percentage: number }) => acc + s.percentage, 0)
    if (Math.abs(totalPct - 100) > 0.01) {
      return NextResponse.json(
        { error: `Percentages sum to ${totalPct}, not 100` },
        { status: 400 }
      )
    }
    calculatedSplits = splits.map((s: { userId: string; percentage: number }) => ({
      userId: s.userId,
      amount: parseFloat(((s.percentage / 100) * amount).toFixed(2)),
    }))
  }

  for (const s of calculatedSplits) {
    if (!memberIds.has(s.userId)) {
      return NextResponse.json(
        { error: `User ${s.userId} is not in the group` },
        { status: 400 }
      )
    }
  }

  const expense = await prisma.expense.create({
    data: {
      groupId,
      paidById: payerId,
      amount,
      description,
      splitType,
      date: date ? new Date(date) : new Date(),
      splits: {
        create: calculatedSplits.map((s) => ({
          userId: s.userId,
          amount: s.amount,
          isPaid: s.userId === payerId,
        })),
      },
    },
    include: {
      splits: { include: { user: true } },
      paidBy: true,
    },
  })

  return NextResponse.json({ expense }, { status: 201 })
}
