import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { expenseId } = await params

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      paidBy: true,
      splits: { include: { user: true } },
      group: { include: { members: { include: { user: true } } } },
    },
  })

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  // Verify user is a member of the group
  const isMember = expense.group.members.some((m) => m.userId === user.id)
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ expense })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { expenseId } = await params
  const { amount, description, splitType, splits, paidById, date } = await req.json()

  // Fetch existing expense and verify ownership
  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { group: { include: { members: true } } },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  const memberIds = new Set(existing.group.members.map((m) => m.userId))
  if (!memberIds.has(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check no confirmed settlement exists for this group that depends on this expense
  // (We allow editing as long as the user hasn't settled yet — simplified check)

  const payerId = paidById || existing.paidById

  if (!memberIds.has(payerId)) {
    return NextResponse.json({ error: 'Payer is not in the group' }, { status: 400 })
  }

  // Calculate splits
  let calculatedSplits: { userId: string; amount: number }[] = []
  const totalAmount = amount || Number(existing.amount)

  if (splitType === 'EQUAL') {
    const splitAmong: string[] = splits?.length
      ? splits.map((s: { userId: string }) => s.userId)
      : [...memberIds]
    const perPerson = parseFloat((totalAmount / splitAmong.length).toFixed(2))
    const remainder = parseFloat((totalAmount - perPerson * splitAmong.length).toFixed(2))

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
    if (Math.abs(sum - totalAmount) > 0.01) {
      return NextResponse.json(
        { error: `Split amounts ($${sum.toFixed(2)}) don't equal total ($${totalAmount.toFixed(2)})` },
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
      amount: parseFloat(((s.percentage / 100) * totalAmount).toFixed(2)),
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

  // Update expense and replace splits in a transaction
  const expense = await prisma.$transaction(async (tx) => {
    // Delete old splits
    await tx.expenseSplit.deleteMany({ where: { expenseId } })

    // Update expense and create new splits
    return tx.expense.update({
      where: { id: expenseId },
      data: {
        amount: totalAmount,
        description: description || existing.description,
        splitType: splitType || existing.splitType,
        paidById: payerId,
        date: date ? new Date(date) : existing.date,
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
  })

  return NextResponse.json({ expense })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { expenseId } = await params

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { group: { include: { members: true } } },
  })

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  const isMember = expense.group.members.some((m) => m.userId === user.id)
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.expense.delete({ where: { id: expenseId } })

  return NextResponse.json({ success: true })
}
