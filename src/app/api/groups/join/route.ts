import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inviteCode } = await req.json()

  if (!inviteCode?.trim()) {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
  }

  const group = await prisma.group.findUnique({
    where: { inviteCode: inviteCode.trim() },
  })

  if (!group) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: user.id, groupId: group.id } },
  })

  if (existing) {
    return NextResponse.json({ message: 'Already a member', group })
  }

  await prisma.groupMember.create({
    data: { userId: user.id, groupId: group.id, role: 'MEMBER' },
  })

  return NextResponse.json({ group }, { status: 201 })
}
