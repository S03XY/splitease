import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [totalSettled, settlementsCount, groupsCount, usersCount] = await Promise.all([
      prisma.settlement.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { amount: true },
      }),
      prisma.settlement.count({ where: { status: 'CONFIRMED' } }),
      prisma.group.count(),
      prisma.user.count(),
    ])

    return NextResponse.json({
      totalSettled: totalSettled._sum.amount?.toString() || '0',
      settlementsCount,
      groupsCount,
      usersCount,
    })
  } catch {
    return NextResponse.json(
      { totalSettled: '0', settlementsCount: 0, groupsCount: 0, usersCount: 0 }
    )
  }
}
