import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../src/lib/prisma'
import { env } from '../src/lib/env'
import { parseQuizBank, quizBankMetaSchema } from '../src/lib/domain/quiz-bank'

type ContributionTotals = {
  eventosCreados: number
  apuntesCreados: number
  bancosPreguntasCreados: number
  puntaje: number
}

const emptyTotals = (): ContributionTotals => ({
  eventosCreados: 0,
  apuntesCreados: 0,
  bancosPreguntasCreados: 0,
  puntaje: 0,
})

function quizDir(yearSlug: string, subjectSlug: string): string {
  return `quizzes/${yearSlug}/${subjectSlug}`
}

async function main() {
  const users = await prisma.userAccount.findMany({
    select: { id: true, email: true },
  })
  const totalsByUserId = new Map(users.map((user) => [user.id, emptyTotals()] as const))
  const userIdByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user.id] as const))

  const [eventRows, apunteRows, subjects] = await Promise.all([
    prisma.evento.findMany({
      where: { createdByUserId: { not: null } },
      select: { createdByUserId: true },
    }),
    prisma.apunte.findMany({
      where: { createdByUserId: { not: null } },
      select: { createdByUserId: true, _count: { select: { recursos: true } } },
    }),
    prisma.subject.findMany({
      select: { slug: true, year: { select: { slug: true } } },
    }),
  ])

  for (const row of eventRows) {
    if (!row.createdByUserId) continue
    const totals = totalsByUserId.get(row.createdByUserId)
    if (!totals) continue
    totals.eventosCreados += 1
    totals.puntaje += 1
  }

  for (const row of apunteRows) {
    if (!row.createdByUserId) continue
    const totals = totalsByUserId.get(row.createdByUserId)
    if (!totals) continue
    totals.apuntesCreados += 1
    totals.puntaje += 1 + row._count.recursos
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const bucket = env.SUPABASE_STORAGE_BUCKET

  for (const subject of subjects) {
    const dir = quizDir(subject.year.slug, subject.slug)
    const { data: files, error } = await supabase.storage.from(bucket).list(dir, { limit: 1000 })
    if (error || !files) continue

    for (const file of files.filter((item) => item.name.endsWith('.meta.json'))) {
      const metaKey = `${dir}/${file.name}`
      const { data: metaBlob } = await supabase.storage.from(bucket).download(metaKey)
      if (!metaBlob) continue

      let meta: { id: string; subidoPor: string } | null = null
      try {
        const parsed = quizBankMetaSchema.safeParse(JSON.parse(await metaBlob.text()))
        meta = parsed.success ? parsed.data : null
      } catch {
        meta = null
      }
      if (!meta) continue

      const userId = userIdByEmail.get(meta.subidoPor.toLowerCase())
      const totals = userId ? totalsByUserId.get(userId) : null
      if (!totals) continue

      const { data: bankBlob } = await supabase.storage.from(bucket).download(`${dir}/${meta.id}.json`)
      const parsedBank = bankBlob ? parseQuizBank(await bankBlob.text()) : null
      const unitsCount = parsedBank?.ok ? parsedBank.bank.units.length : 0

      totals.bancosPreguntasCreados += 1
      totals.puntaje += 1 + unitsCount
    }
  }

  await prisma.$transaction(
    [...totalsByUserId.entries()].map(([id, totals]) =>
      prisma.userAccount.update({
        where: { id },
        data: totals,
      }),
    ),
  )

  console.log(`Contribuciones recalculadas para ${totalsByUserId.size} usuarios.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
