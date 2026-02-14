import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId } = await params

  try {
    const { status, rejectionReason, txHash } = await req.json()

    if (!['PAID', 'DECLINED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const request = await prisma.paymentRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json({ error: 'This request has already been resolved' }, { status: 400 })
    }

    if (status === 'DECLINED' && request.toUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (status === 'DECLINED' && !rejectionReason?.trim()) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
    }
    if (status === 'CANCELLED' && request.fromUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (status === 'PAID' && request.toUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.paymentRequest.update({
      where: { id: requestId },
      data: {
        status,
        rejectionReason: status === 'DECLINED' ? rejectionReason.trim() : undefined,
        txHash: status === 'PAID' && txHash ? txHash : undefined,
      },
    })

    return NextResponse.json({ request: updated })
  } catch (error) {
    console.error('Failed to update payment request:', error)
    return NextResponse.json({ error: 'Failed to update payment request' }, { status: 500 })
  }
}
