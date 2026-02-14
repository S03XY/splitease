import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ txHash: string }> }
) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { txHash } = await params

  try {
    const settlement = await prisma.settlement.findUnique({ where: { txHash } })

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    // Only the sender or receiver can confirm
    if (settlement.fromUserId !== user.id && settlement.toUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.settlement.update({
      where: { txHash },
      data: { status: 'CONFIRMED' },
    })

    // Mark relevant expense splits as paid:
    // fromUser's unpaid splits in expenses paid by toUser in this group
    const expenses = await prisma.expense.findMany({
      where: { groupId: settlement.groupId, paidById: settlement.toUserId },
      select: { id: true },
    })

    if (expenses.length > 0) {
      await prisma.expenseSplit.updateMany({
        where: {
          expenseId: { in: expenses.map((e) => e.id) },
          userId: settlement.fromUserId,
          isPaid: false,
        },
        data: { isPaid: true },
      })
    }

    return NextResponse.json({ settlement: updated })
  } catch (error) {
    console.error('Failed to confirm settlement:', error)
    return NextResponse.json({ error: 'Failed to confirm settlement' }, { status: 500 })
  }
}
