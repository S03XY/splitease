import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { groupId, toUserId, amount, txHash } = await req.json()

    if (!groupId || !toUserId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    if (toUserId === user.id) {
      return NextResponse.json({ error: 'Cannot settle with yourself' }, { status: 400 })
    }

    // Verify both users are in the group
    const members = await prisma.groupMember.findMany({
      where: { groupId, userId: { in: [user.id, toUserId] } },
    })
    if (members.length < 2) {
      return NextResponse.json(
        { error: 'Both users must be in the group' },
        { status: 400 }
      )
    }

    const settlement = await prisma.settlement.create({
      data: {
        fromUserId: user.id,
        toUserId,
        amount,
        txHash: txHash || null,
        groupId,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ settlement }, { status: 201 })
  } catch (error) {
    console.error('Failed to create settlement:', error)
    return NextResponse.json({ error: 'Failed to create settlement' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
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
  } catch (error) {
    console.error('Failed to fetch settlements:', error)
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 })
  }
}
