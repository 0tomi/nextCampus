import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../src/lib/prisma'
import { env } from '../src/lib/env'
import { quizBankMetaSchema } from '../src/lib/domain/quiz-bank'

// Backfill de `subidoPorId` en los .meta.json de bancos de preguntas.
//
// Por qué: los bancos guardan `subidoPor` (email, siempre) y `subidoPorId` (id
// de cuenta, agregado después → ausente en bancos viejos). Para resolver el
// autor por id —clave inmutable, no se rompe si alguien cambia su email—
// completamos el id faltante buscando la cuenta por su email.
//
// Seguro de correr varias veces: si el meta ya tiene `subidoPorId`, se saltea.
// Solo reescribe el meta (su propia key); nunca toca el banco .json.
//
// Uso:
//   pnpm backfill:banco-author          # dry-run: solo informa qué cambiaría
//   pnpm backfill:banco-author --apply  # escribe los metas en Storage

const APPLY = process.argv.includes('--apply')

function quizDir(yearSlug: string, subjectSlug: string): string {
  return `quizzes/${yearSlug}/${subjectSlug}`
}

async function main() {
  const users = await prisma.userAccount.findMany({ select: { id: true, email: true } })
  const userIdByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id] as const))

  const subjects = await prisma.subject.findMany({
    select: { slug: true, year: { select: { slug: true } } },
  })

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const bucket = env.SUPABASE_STORAGE_BUCKET

  let scanned = 0
  let alreadySet = 0
  let updated = 0
  let unresolved = 0
  let failed = 0

  for (const subject of subjects) {
    const dir = quizDir(subject.year.slug, subject.slug)
    const { data: files, error } = await supabase.storage.from(bucket).list(dir, { limit: 1000 })
    if (error || !files) continue

    for (const file of files.filter((item) => item.name.endsWith('.meta.json'))) {
      const key = `${dir}/${file.name}`
      const { data: blob } = await supabase.storage.from(bucket).download(key)
      if (!blob) continue

      let raw: Record<string, unknown> | null = null
      try {
        const json = JSON.parse(await blob.text())
        // Validamos forma con el schema, pero reescribimos sobre el objeto crudo
        // para no perder ningún campo que el schema pudiera descartar.
        raw = quizBankMetaSchema.safeParse(json).success ? (json as Record<string, unknown>) : null
      } catch {
        raw = null
      }
      if (!raw) continue
      scanned += 1

      if (typeof raw.subidoPorId === 'string' && raw.subidoPorId.length > 0) {
        alreadySet += 1
        continue
      }

      const email = typeof raw.subidoPor === 'string' ? raw.subidoPor.toLowerCase() : ''
      const userId = email ? userIdByEmail.get(email) : undefined
      if (!userId) {
        unresolved += 1
        console.warn(`  · sin cuenta para "${raw.subidoPor}" → ${key} (se saltea)`)
        continue
      }

      console.log(`  ✓ ${key} → subidoPorId=${userId} (${raw.subidoPor})`)

      if (!APPLY) {
        updated += 1
        continue
      }

      const next = { ...raw, subidoPorId: userId }
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(key, new Blob([JSON.stringify(next)], { type: 'application/json' }), {
          contentType: 'application/json',
          upsert: true,
        })
      if (upErr) {
        failed += 1
        console.error(`  ✗ no se pudo reescribir ${key}: ${upErr.message}`)
        continue
      }
      updated += 1
    }
  }

  console.log('\n--- Resumen ---')
  console.log(`Modo:        ${APPLY ? 'APPLY (escribió)' : 'DRY-RUN (no escribió nada)'}`)
  console.log(`Metas vistas:           ${scanned}`)
  console.log(`Ya tenían id:           ${alreadySet}`)
  console.log(`${APPLY ? 'Actualizadas' : 'A actualizar'}:           ${updated}`)
  console.log(`Sin cuenta (salteadas): ${unresolved}`)
  if (failed > 0) console.log(`Fallidas:               ${failed}`)
  if (!APPLY && updated > 0) {
    console.log('\nVolvé a correr con --apply para escribir los cambios.')
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
