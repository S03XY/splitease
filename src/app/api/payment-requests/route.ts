import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { toUserId, amount, message } = await req.json()

    if (!toUserId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    if (toUserId === user.id) {
      return NextResponse.json({ error: 'Cannot send a request to yourself' }, { status: 400 })
    }

    // Verify the target user exists
    const targetUser = await prisma.user.findUnique({ where: { id: toUserId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const request = await prisma.paymentRequest.create({
      data: {
        fromUser: { connect: { id: user.id } },
        toUser: { connect: { id: toUserId } },
        amount,
        message: message || null,
        status: 'PENDING',
      },
      include: { fromUser: true, toUser: true },
    })

    return NextResponse.json({ request }, { status: 201 })
  } catch (error) {
    console.error('Failed to create payment request:', error)
    const message = error instanceof Error ? error.message : 'Failed to create payment request'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [incoming, outgoing] = await Promise.all([
      prisma.paymentRequest.findMany({
        where: { toUserId: user.id },
        include: { fromUser: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.paymentRequest.findMany({
        where: { fromUserId: user.id },
        include: { toUser: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const incomingPendingTotal = incoming
      .filter((r) => r.status === 'PENDING')
      .reduce((sum, r) => sum + Number(r.amount), 0)
    const outgoingPendingTotal = outgoing
      .filter((r) => r.status === 'PENDING')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    return NextResponse.json({
      incoming,
      outgoing,
      summary: {
        incomingPendingTotal: Math.round(incomingPendingTotal * 100) / 100,
        outgoingPendingTotal: Math.round(outgoingPendingTotal * 100) / 100,
      },
    })
  } catch (error) {
    console.error('Failed to fetch payment requests:', error)
    return NextResponse.json({ error: 'Failed to fetch payment requests' }, { status: 500 })
  }
}
