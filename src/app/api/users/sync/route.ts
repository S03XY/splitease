import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { privyId, walletAddress, email, name } = body

    if (!privyId) {
      return NextResponse.json({ error: 'privyId is required' }, { status: 400 })
    }

    const user = await prisma.user.upsert({
      where: { privyId },
      update: {
        walletAddress: walletAddress || undefined,
        email: email || undefined,
        name: name || undefined,
      },
      create: {
        privyId,
        walletAddress,
        email,
        name,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
  }
}
