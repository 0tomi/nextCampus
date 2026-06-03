import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  attemptId: z.string().min(1).max(100),
  reason: z.enum(['fullscreen_exit', 'tab_hidden', 'page_unload', 'manual_exit']),
})

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await readBody(request))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  await prisma.rankedQuizAttempt.updateMany({
    where: {
      id: parsed.data.attemptId,
      finishedAt: null,
      invalidatedAt: null,
    },
    data: {
      status: 'INVALID',
      invalidReason: parsed.data.reason,
      invalidatedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}
