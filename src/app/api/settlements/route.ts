import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId, toUserId, amount, txHash } = await req.json()

  const settlement = await prisma.settlement.create({
    data: {
      fromUserId: user.id,
      toUserId,
      amount,
      txHash,
      groupId,
      status: 'PENDING',
    },
  })

  return NextResponse.json({ settlement }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const groupId = req.nextUrl.searchParams.get('groupId')

  const where: Record<string, unknown> = {
    OR: [{ fromUserId: user.id }, { toUserId: user.id }],
  }
  if (groupId) where.groupId = groupId

  const settlements = await prisma.settlement.findMany({
    where,
    include: {
      fromUser: true,
      toUser: true,
      group: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ settlements })
}
