import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export interface PersonResult {
  id: string
  name: string | null
  email: string | null
  walletAddress: string | null
  source: 'contact' | 'group_member'
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results: PersonResult[] = []
    const contactEmails = new Set<string>()
    const contactWallets = new Set<string>()
    const contactUserIds = new Set<string>()

    // 1. Search contacts
    try {
      const contacts = await prisma.contact.findMany({
        where: {
          ownerId: user.id,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { walletAddress: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          user: { select: { id: true, name: true, email: true, walletAddress: true } },
        },
        take: 10,
      })

      for (const c of contacts) {
        if (c.email) contactEmails.add(c.email.toLowerCase())
        if (c.walletAddress) contactWallets.add(c.walletAddress.toLowerCase())
        if (c.userId) contactUserIds.add(c.userId)
        results.push({
          id: c.id,
          name: c.user?.name || c.name,
          email: c.user?.email || c.email,
          walletAddress: c.user?.walletAddress || c.walletAddress,
          source: 'contact' as const,
        })
      }
    } catch (e) {
      console.error('Contact search failed:', e instanceof Error ? e.message : e)
    }

    // 2. Search past group members (people in groups the current user is in)
    const groupMembers = await prisma.groupMember.findMany({
      where: {
        group: {
          members: { some: { userId: user.id } },
        },
        userId: { not: user.id },
        user: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { walletAddress: { contains: q, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true, walletAddress: true } },
      },
    })

    // Deduplicate: skip group members already in contacts, and only show each user once
    const seenUserIds = new Set<string>()
    for (const gm of groupMembers) {
      if (contactUserIds.has(gm.userId)) continue
      if (gm.user.email && contactEmails.has(gm.user.email.toLowerCase())) continue
      if (gm.user.walletAddress && contactWallets.has(gm.user.walletAddress.toLowerCase())) continue
      if (seenUserIds.has(gm.userId)) continue
      seenUserIds.add(gm.userId)

      results.push({
        id: `gm-${gm.userId}`,
        name: gm.user.name,
        email: gm.user.email,
        walletAddress: gm.user.walletAddress,
        source: 'group_member',
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('People search error:', error)
    return NextResponse.json({ results: [] })
  }
}
