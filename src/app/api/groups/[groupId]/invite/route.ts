import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const currentUser = await getCurrentUser(req)
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId } = await params
  const { walletAddress, email } = await req.json()

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: currentUser.id, groupId } },
  })
  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 })
  }

  let targetUser = null
  if (walletAddress) {
    targetUser = await prisma.user.findUnique({ where: { walletAddress } })
  } else if (email) {
    targetUser = await prisma.user.findFirst({ where: { email } })
  }

  if (!targetUser) {
    return NextResponse.json(
      { error: 'User not found. They must sign up first.' },
      { status: 404 }
    )
  }

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: targetUser.id, groupId } },
  })
  if (existing) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
  }

  await prisma.groupMember.create({
    data: { userId: targetUser.id, groupId, role: 'MEMBER' },
  })

  return NextResponse.json({ success: true }, { status: 201 })
}
