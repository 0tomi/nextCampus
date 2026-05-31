import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const users = await prisma.userAccount.findMany({
    where: {
      status: 'ACTIVE',
      puntaje: { gt: 0 },
    },
    orderBy: [{ puntaje: 'desc' }, { nombreUsuario: 'asc' }],
    take: 5,
    select: {
      nombreUsuario: true,
      eventosCreados: true,
      apuntesCreados: true,
      bancosPreguntasCreados: true,
    },
  })

  return NextResponse.json({
    items: users.map((user, index) => ({
      position: index + 1,
      nombreUsuario: user.nombreUsuario,
      eventosCreados: user.eventosCreados,
      apuntesCreados: user.apuntesCreados,
      bancosPreguntasCreados: user.bancosPreguntasCreados,
    })),
  })
}
