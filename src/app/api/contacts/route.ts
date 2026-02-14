import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()

  const contacts = await prisma.contact.findMany({
    where: {
      ownerId: user.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { walletAddress: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, walletAddress: true } },
    },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  })

  return NextResponse.json({ contacts })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, email, walletAddress } = body as {
    name?: string
    email?: string
    walletAddress?: string
  }

  if (!email && !walletAddress) {
    return NextResponse.json(
      { error: 'Email or wallet address is required' },
      { status: 400 }
    )
  }

  // Look up existing user by email or wallet
  let linkedUserId: string | undefined
  if (email || walletAddress) {
    const found = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(walletAddress ? [{ walletAddress }] : []),
        ],
      },
    })
    if (found) linkedUserId = found.id
  }

  // Upsert by email or walletAddress
  let contact
  if (email) {
    contact = await prisma.contact.upsert({
      where: { ownerId_email: { ownerId: user.id, email } },
      update: {
        name: name || undefined,
        walletAddress: walletAddress || undefined,
        userId: linkedUserId || undefined,
      },
      create: {
        ownerId: user.id,
        name,
        email,
        walletAddress,
        userId: linkedUserId,
      },
    })
  } else if (walletAddress) {
    contact = await prisma.contact.upsert({
      where: { ownerId_walletAddress: { ownerId: user.id, walletAddress } },
      update: {
        name: name || undefined,
        email: email || undefined,
        userId: linkedUserId || undefined,
      },
      create: {
        ownerId: user.id,
        name,
        email,
        walletAddress,
        userId: linkedUserId,
      },
    })
  }

  return NextResponse.json({ contact }, { status: 201 })
}
