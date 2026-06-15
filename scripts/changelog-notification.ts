import 'dotenv/config'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../prisma/generated/client/client'

const AUDIENCES = ['PUBLIC', 'AYUDANTE', 'SUPERVISOR', 'ADMIN'] as const
type Audience = (typeof AUDIENCES)[number]

function required(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label} es obligatorio.`)
  return trimmed
}

function parseAudience(value: string): Audience {
  const normalized = value.trim().toUpperCase()
  if (AUDIENCES.includes(normalized as Audience)) return normalized as Audience
  throw new Error(`Rol objetivo inválido. Usá uno de estos: ${AUDIENCES.join(', ')}.`)
}

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('Falta DIRECT_URL o DATABASE_URL para conectar con la base de datos.')
  }

  const rl = createInterface({ input, output })
  try {
    const title = required(await rl.question('Nombre de la notificación: '), 'El nombre')
    const summary = required(await rl.question('Descripción corta: '), 'La descripción')
    const changelogId = required(await rl.question('ID del changelog: '), 'El ID del changelog')
    const audience = parseAudience(await rl.question(`Rol objetivo (${AUDIENCES.join('/')}): `))

    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
    try {
      const entry = await prisma.changelogEntry.upsert({
        where: { changelogId },
        create: { changelogId, title, summary, audience, visibleAt: new Date() },
        update: { title, summary, audience, visibleAt: new Date() },
        select: { changelogId: true, title: true, audience: true },
      })

      console.log(`Novedad guardada: ${entry.title} (${entry.changelogId}, ${entry.audience}).`)
    } finally {
      await prisma.$disconnect()
    }
  } finally {
    rl.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
