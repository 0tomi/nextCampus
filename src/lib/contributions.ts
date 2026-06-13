import 'server-only'
import { prisma } from '@/lib/prisma'

export interface ContributionBatchRevoke {
  apuntesCreados?: number
  eventosCreados?: number
  bancosPreguntasCreados?: number
  puntaje: number
}

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

export async function adjustContributionScore(
  userId: string,
  scoreDelta: number,
): Promise<void> {
  if (scoreDelta === 0) return

  await prisma.userAccount.update({
    where: { id: userId },
    data: {
      puntaje:
        scoreDelta > 0
          ? { increment: scoreDelta }
          : { decrement: Math.abs(scoreDelta) },
    },
  })
}

async function revokeContribution(userId: string, data: {
  eventosCreados?: number
  apuntesCreados?: number
  bancosPreguntasCreados?: number
  puntaje: number
}): Promise<void> {
  await prisma.userAccount.update({
    where: { id: userId },
    data: {
      eventosCreados: data.eventosCreados ? { decrement: data.eventosCreados } : undefined,
      apuntesCreados: data.apuntesCreados ? { decrement: data.apuntesCreados } : undefined,
      bancosPreguntasCreados: data.bancosPreguntasCreados
        ? { decrement: data.bancosPreguntasCreados }
        : undefined,
      puntaje: { decrement: data.puntaje },
    },
  })
}

export function revokeEventoCreated(userId: string): Promise<void> {
  return revokeContribution(userId, { eventosCreados: 1, puntaje: 1 })
}

export function revokeApunteCreated(userId: string, recursosCount: number): Promise<void> {
  return revokeContribution(userId, {
    apuntesCreados: 1,
    puntaje: 1 + Math.max(0, recursosCount),
  })
}

export function revokeQuizBankCreated(userId: string, unitsCount: number): Promise<void> {
  return revokeContribution(userId, {
    bancosPreguntasCreados: 1,
    puntaje: 1 + Math.max(0, unitsCount),
  })
}

export function revokeContributionBatch(
  userId: string,
  data: ContributionBatchRevoke,
): Promise<void> {
  return revokeContribution(userId, {
    apuntesCreados: data.apuntesCreados || undefined,
    eventosCreados: data.eventosCreados || undefined,
    bancosPreguntasCreados: data.bancosPreguntasCreados || undefined,
    puntaje: data.puntaje,
  })
}
