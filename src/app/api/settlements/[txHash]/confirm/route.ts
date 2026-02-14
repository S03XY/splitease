import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ txHash: string }> }
) {
  const { txHash } = await params

  const settlement = await prisma.settlement.update({
    where: { txHash },
    data: { status: 'CONFIRMED' },
  })

  return NextResponse.json({ settlement })
}
