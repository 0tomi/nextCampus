import 'server-only'
import { prisma } from '@/lib/prisma'

async function awardContribution(userId: string, data: {
  eventosCreados?: number
  apuntesCreados?: number
  bancosPreguntasCreados?: number
  puntaje: number
}): Promise<void> {
  await prisma.userAccount.update({
    where: { id: userId },
    data: {
      eventosCreados: data.eventosCreados ? { increment: data.eventosCreados } : undefined,
      apuntesCreados: data.apuntesCreados ? { increment: data.apuntesCreados } : undefined,
      bancosPreguntasCreados: data.bancosPreguntasCreados
        ? { increment: data.bancosPreguntasCreados }
        : undefined,
      puntaje: { increment: data.puntaje },
    },
  })
}

export function awardEventoCreated(userId: string): Promise<void> {
  return awardContribution(userId, { eventosCreados: 1, puntaje: 1 })
}

export function awardApunteCreated(userId: string, recursosCount: number): Promise<void> {
  return awardContribution(userId, {
    apuntesCreados: 1,
    puntaje: 1 + Math.max(0, recursosCount),
  })
}

export function awardQuizBankCreated(userId: string, unitsCount: number): Promise<void> {
  return awardContribution(userId, {
    bancosPreguntasCreados: 1,
    puntaje: 1 + Math.max(0, unitsCount),
  })
}
