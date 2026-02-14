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
  const { status } = await req.json()

  const request = await prisma.paymentRequest.findUnique({
    where: { id: requestId },
  })

  if (!request) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (status === 'DECLINED' && request.toUserId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (status === 'CANCELLED' && request.fromUserId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.paymentRequest.update({
    where: { id: requestId },
    data: { status },
  })

  return NextResponse.json({ request: updated })
}
