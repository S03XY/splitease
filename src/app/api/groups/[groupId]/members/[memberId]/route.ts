import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId, memberId } = await params

  try {
  // Verify current user is an admin of this group
  const currentMember = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  })

  if (!currentMember || currentMember.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 })
  }

  // Find the member to remove
  const targetMember = await prisma.groupMember.findUnique({
    where: { id: memberId },
  })

  if (!targetMember || targetMember.groupId !== groupId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // Can't remove yourself
  if (targetMember.userId === user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })
  }

  // Check if member is involved in any expense (as payer or in splits)
  const [paidExpenses, splitExpenses] = await Promise.all([
    prisma.expense.count({
      where: { groupId, paidById: targetMember.userId },
    }),
    prisma.expenseSplit.count({
      where: {
        userId: targetMember.userId,
        expense: { groupId },
      },
    }),
  ])

  if (paidExpenses > 0 || splitExpenses > 0) {
    return NextResponse.json(
      { error: 'Cannot remove this member — they are associated with expenses in this group' },
      { status: 400 }
    )
  }

  await prisma.groupMember.delete({ where: { id: memberId } })

  return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove member:', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
