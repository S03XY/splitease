import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { toUserId, amount, groupId, message } = await req.json()

  const members = await prisma.groupMember.findMany({
    where: { groupId, userId: { in: [user.id, toUserId] } },
  })
  if (members.length < 2) {
    return NextResponse.json(
      { error: 'Both users must be in the group' },
      { status: 400 }
    )
  }

  const request = await prisma.paymentRequest.create({
    data: {
      fromUserId: user.id,
      toUserId,
      amount,
      groupId,
      message: message || null,
      status: 'PENDING',
    },
    include: { fromUser: true, toUser: true, group: true },
  })

  return NextResponse.json({ request }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [incoming, outgoing] = await Promise.all([
    prisma.paymentRequest.findMany({
      where: { toUserId: user.id, status: 'PENDING' },
      include: { fromUser: true, group: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.paymentRequest.findMany({
      where: { fromUserId: user.id },
      include: { toUser: true, group: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({ incoming, outgoing })
}
