import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function getCurrentUser(req: NextRequest) {
  const privyId = req.headers.get('x-privy-id')

  if (!privyId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { privyId },
  })

  return user
}
