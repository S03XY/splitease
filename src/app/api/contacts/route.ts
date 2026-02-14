import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
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
  } catch (error) {
    console.error('Failed to fetch contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, email, walletAddress, userId: targetUserId } = body as {
      name?: string
      email?: string
      walletAddress?: string
      userId?: string
    }

    let linkedUser: { id: string; email: string | null; walletAddress: string | null; name: string | null } | null = null

    // If userId is provided directly, look up the user by ID
    if (targetUserId) {
      linkedUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, walletAddress: true, name: true },
      })
    } else if (email || walletAddress) {
      linkedUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(walletAddress ? [{ walletAddress }] : []),
          ],
        },
        select: { id: true, email: true, walletAddress: true, name: true },
      })
    } else {
      return NextResponse.json(
        { error: 'Email, wallet address, or user ID is required' },
        { status: 400 }
      )
    }

    if (!linkedUser) {
      return NextResponse.json(
        { error: 'This person is not on the platform yet' },
        { status: 404 }
      )
    }

    if (linkedUser.id === user.id) {
      return NextResponse.json(
        { error: 'You cannot add yourself as a contact' },
        { status: 400 }
      )
    }

    // Use the linked user's actual data for the contact record
    const contactEmail = email || linkedUser.email
    const contactWallet = walletAddress || linkedUser.walletAddress
    const contactName = name || linkedUser.name

    let contact
    if (contactEmail) {
      contact = await prisma.contact.upsert({
        where: { ownerId_email: { ownerId: user.id, email: contactEmail } },
        update: {
          name: contactName || undefined,
          walletAddress: contactWallet || undefined,
          userId: linkedUser.id,
        },
        create: {
          ownerId: user.id,
          name: contactName,
          email: contactEmail,
          walletAddress: contactWallet,
          userId: linkedUser.id,
        },
      })
    } else if (contactWallet) {
      contact = await prisma.contact.upsert({
        where: { ownerId_walletAddress: { ownerId: user.id, walletAddress: contactWallet } },
        update: {
          name: contactName || undefined,
          userId: linkedUser.id,
        },
        create: {
          ownerId: user.id,
          name: contactName,
          walletAddress: contactWallet,
          userId: linkedUser.id,
        },
      })
    } else {
      // User has neither email nor wallet — check if contact already exists by userId
      const existing = await prisma.contact.findFirst({
        where: { ownerId: user.id, userId: linkedUser.id },
      })
      if (existing) {
        contact = existing
      } else {
        contact = await prisma.contact.create({
          data: {
            ownerId: user.id,
            name: contactName,
            userId: linkedUser.id,
          },
        })
      }
    }

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error('Failed to create contact:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}
