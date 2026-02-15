import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export interface PersonResult {
  id: string
  userId: string | null
  name: string | null
  email: string | null
  walletAddress: string | null
  isContact: boolean
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    // Get all contact userIds for this user
    const contacts = await prisma.contact.findMany({
      where: { ownerId: user.id },
      select: { userId: true },
    })
    const contactUserIds = new Set(contacts.map((c) => c.userId).filter((id): id is string => !!id))

    // Search ALL users (except current user)
    const users = await prisma.user.findMany({
      where: {
        id: { not: user.id },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { walletAddress: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        walletAddress: true,
      },
      take: 20,
    })

    const results: PersonResult[] = users.map((u) => ({
      id: u.id,
      userId: u.id,
      name: u.name,
      email: u.email,
      walletAddress: u.walletAddress,
      isContact: contactUserIds.has(u.id),
    }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('People search error:', error)
    return NextResponse.json({ results: [] })
  }
}
