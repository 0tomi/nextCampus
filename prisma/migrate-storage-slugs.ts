/**
 * migrate-storage-slugs.ts
 *
 * Migra los archivos en Supabase Storage de los paths con slug viejo (anio-N)
 * a los nuevos slugs ordinales (primero, segundo, etc.).
 *
 * Afecta dos prefijos:
 *   - quizzes/{yearSlug}/{subjectSlug}/
 *   - apuntes/{yearSlug}/{subjectSlug}/
 *
 * Uso:
 *   pnpm tsx prisma/migrate-storage-slugs.ts
 *   pnpm tsx prisma/migrate-storage-slugs.ts --dry-run   (solo lista, no mueve)
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { env } from '../src/lib/env'

const SLUG_MAP: Record<string, string> = {
  'anio-1': 'primero',
  'anio-2': 'segundo',
  'anio-3': 'tercero',
  'anio-4': 'cuarto',
  'anio-5': 'quinto',
}

const PREFIXES = ['quizzes', 'apuntes']

const dryRun = process.argv.includes('--dry-run')

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const bucket = env.SUPABASE_STORAGE_BUCKET

async function listKeysRecursive(prefix: string, depth = 0): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error || !data) return []

  const keys: string[] = []
  for (const item of data) {
    const key = `${prefix}/${item.name}`
    // item.id is truthy for files, falsy for directories
    if (item.id || depth >= 5) {
      keys.push(key)
    } else {
      const nested = await listKeysRecursive(key, depth + 1)
      keys.push(...nested)
    }
  }
  return keys
}

async function main() {
  let totalMoved = 0
  let totalErrors = 0

  for (const prefix of PREFIXES) {
    for (const [oldSlug, newSlug] of Object.entries(SLUG_MAP)) {
      const oldDir = `${prefix}/${oldSlug}`
      const keys = await listKeysRecursive(oldDir)

      if (keys.length === 0) continue

      console.log(`\n📁 ${oldDir} → ${prefix}/${newSlug} (${keys.length} archivos)`)

      for (const oldKey of keys) {
        const newKey = oldKey.replace(`${prefix}/${oldSlug}/`, `${prefix}/${newSlug}/`)

        if (dryRun) {
          console.log(`  [DRY-RUN] ${oldKey} → ${newKey}`)
          totalMoved++
          continue
        }

        const { error: moveErr } = await supabase.storage
          .from(bucket)
          .move(oldKey, newKey)

        if (moveErr) {
          console.error(`  ❌ Error moviendo ${oldKey}: ${moveErr.message}`)
          totalErrors++
        } else {
          console.log(`  ✅ ${oldKey} → ${newKey}`)
          totalMoved++
        }
      }
    }
  }

  console.log(`\n${dryRun ? '🔍 DRY RUN' : '✅ COMPLETADO'}: ${totalMoved} archivos ${dryRun ? 'encontrados' : 'movidos'}, ${totalErrors} errores`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

