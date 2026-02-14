import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const groups = await prisma.group.findMany({
    where: {
      members: { some: { userId: user.id } },
    },
    include: {
      members: { include: { user: true } },
      _count: { select: { expenses: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ groups })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      createdById: user.id,
      members: {
        create: { userId: user.id, role: 'ADMIN' },
      },
    },
    include: {
      members: { include: { user: true } },
    },
  })

  return NextResponse.json({ group }, { status: 201 })
}
