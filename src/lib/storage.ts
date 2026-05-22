import 'server-only'
import { unstable_cache } from 'next/cache'
import { createSupabaseAdminClient } from './supabase/admin'
import { env } from '@/lib/env'
import {
  parseQuizBank,
  quizBankMetaSchema,
  type QuizBankFile,
  type QuizBankMeta,
} from '@/lib/domain/quiz-bank'

export function quizBanksCacheTag(yearSlug: string, subjectSlug: string): string {
  return `quiz-banks:${yearSlug}:${subjectSlug}`
}

const BUCKET = env.SUPABASE_STORAGE_BUCKET
const MAX_BANK_BYTES = 1 * 1024 * 1024 // 1 MB de JSON es de sobra

// ---------------------------------------------------------------------------
// Bancos de preguntas (quiz). JSON privado en Storage, recuperado por
// año + materia. El bucket es privado: el JSON con respuestas NUNCA se sirve
// al cliente vía URL firmada; solo lo lee el server para corregir.
//
// SIN manifest central. El directorio ES la fuente de verdad: cada banco son
// dos archivos con su propio uuid —{uuid}.json (banco con respuestas) y
// {uuid}.meta.json (metadata sin preguntas). Como cada operación escribe SOLO
// sus propias keys, dos admins subiendo a la vez no pueden pisarse: no hay
// estado mutable compartido => no hay race condition de "lost update".
//
// El .meta.json es el "commit": se escribe DESPUÉS del banco. Un {uuid}.json
// sin su meta es un huérfano y el listado lo ignora. Al borrar, se elimina
// primero el meta (desaparece del listado al instante) y luego el banco.
// ---------------------------------------------------------------------------

const META_SUFFIX = '.meta.json'

function bankDir(yearSlug: string, subjectSlug: string): string {
  return `quizzes/${yearSlug}/${subjectSlug}`
}

function bankKey(yearSlug: string, subjectSlug: string, bankId: string): string {
  return `${bankDir(yearSlug, subjectSlug)}/${bankId}.json`
}

function metaKey(yearSlug: string, subjectSlug: string, bankId: string): string {
  return `${bankDir(yearSlug, subjectSlug)}/${bankId}${META_SUFFIX}`
}

// Lista los bancos derivándolos del directorio: un list() para los nombres y
// la descarga en paralelo de los .meta.json (diminutos). Huérfanos o metas
// corruptos se saltean; nunca rompe la página.
//
// Cacheado por (yearSlug, subjectSlug): la home del quiz consulta esto en cada
// visita y los bancos cambian sólo cuando el admin sube o borra uno. Las
// server actions de uploadQuizBank/deleteQuizBank invalidan el tag.
async function listQuizBanksUncached(
  yearSlug: string,
  subjectSlug: string,
): Promise<QuizBankMeta[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(bankDir(yearSlug, subjectSlug), { limit: 1000 })
  if (error || !data) return []

  const metaFiles = data.filter((o) => o.name.endsWith(META_SUFFIX))
  const metas = await Promise.all(
    metaFiles.map(async (file) => {
      const { data: blob, error: dlErr } = await supabase.storage
        .from(BUCKET)
        .download(`${bankDir(yearSlug, subjectSlug)}/${file.name}`)
      if (dlErr || !blob) return null
      try {
        const parsed = quizBankMetaSchema.safeParse(JSON.parse(await blob.text()))
        return parsed.success ? parsed.data : null
      } catch {
        return null
      }
    }),
  )

  return metas
    .filter((m): m is QuizBankMeta => m !== null)
    .sort((a, b) => a.subidoEl.localeCompare(b.subidoEl))
}

export function listQuizBanks(
  yearSlug: string,
  subjectSlug: string,
): Promise<QuizBankMeta[]> {
  return unstable_cache(
    () => listQuizBanksUncached(yearSlug, subjectSlug),
    ['quiz-banks', yearSlug, subjectSlug],
    { tags: [quizBanksCacheTag(yearSlug, subjectSlug)], revalidate: 3600 },
  )()
}

// Sube un banco ya validado. Escribe el banco primero y el .meta.json al
// final (el meta = commit). Si el meta falla, se borra el banco recién subido
// (Storage no participa en transacciones SQL). No toca ningún recurso
// compartido: solo las dos keys de ESTE uuid.
export async function uploadQuizBank(params: {
  yearSlug: string
  subjectSlug: string
  nombre: string
  rawJson: string
  totalPreguntas: number
  subidoPor: string
}): Promise<QuizBankMeta> {
  const { yearSlug, subjectSlug, nombre, rawJson, totalPreguntas, subidoPor } =
    params

  if (Buffer.byteLength(rawJson, 'utf8') > MAX_BANK_BYTES) {
    throw new Error('BAD_REQUEST: el banco supera el límite de 1 MB')
  }

  const supabase = createSupabaseAdminClient()
  const bankId = crypto.randomUUID()
  const key = bankKey(yearSlug, subjectSlug, bankId)

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(key, new Blob([rawJson], { type: 'application/json' }), {
      contentType: 'application/json',
      upsert: false,
    })
  if (upErr) {
    throw new Error(`STORAGE: no se pudo subir el banco (${upErr.message})`)
  }

  const meta: QuizBankMeta = {
    id: bankId,
    nombre,
    totalPreguntas,
    subidoEl: new Date().toISOString(),
    subidoPor,
  }

  const { error: metaErr } = await supabase.storage
    .from(BUCKET)
    .upload(
      metaKey(yearSlug, subjectSlug, bankId),
      new Blob([JSON.stringify(meta)], { type: 'application/json' }),
      { contentType: 'application/json', upsert: false },
    )
  if (metaErr) {
    await supabase.storage.from(BUCKET).remove([key])
    throw new Error(
      `STORAGE: no se pudo registrar el banco (${metaErr.message})`,
    )
  }

  return meta
}

// Lee y RE-VALIDA un banco desde Storage (defensa en profundidad: el objeto
// pudo ser manipulado fuera de la app). Devuelve null si falta o es inválido.
export async function readQuizBank(
  yearSlug: string,
  subjectSlug: string,
  bankId: string,
): Promise<QuizBankFile | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(bankKey(yearSlug, subjectSlug, bankId))
  if (error || !data) return null
  const parsed = parseQuizBank(await data.text())
  return parsed.ok ? parsed.bank : null
}

export async function readQuizBanks(
  yearSlug: string,
  subjectSlug: string,
  bankIds: string[],
): Promise<Map<string, QuizBankFile>> {
  const out = new Map<string, QuizBankFile>()
  await Promise.all(
    bankIds.map(async (id) => {
      const bank = await readQuizBank(yearSlug, subjectSlug, id)
      if (bank) out.set(id, bank)
    }),
  )
  return out
}

// Borra: primero el meta (el banco desaparece del listado al instante),
// luego el banco. Solo toca las keys de ESTE uuid: sin conflicto con otras
// operaciones concurrentes.
export async function deleteQuizBank(
  yearSlug: string,
  subjectSlug: string,
  bankId: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  await supabase.storage
    .from(BUCKET)
    .remove([metaKey(yearSlug, subjectSlug, bankId)])
  await supabase.storage
    .from(BUCKET)
    .remove([bankKey(yearSlug, subjectSlug, bankId)])
}

/**
 * Cuenta los bancos de preguntas de una materia listando los .meta.json
 * en quizzes/{yearSlug}/{subjectSlug}/. Reutiliza el mismo list() que
 * deleteSubjectStorage para mantener consistencia con lo que se borra.
 */
export async function countSubjectQuizBanks(
  yearSlug: string,
  subjectSlug: string,
): Promise<number> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(bankDir(yearSlug, subjectSlug), { limit: 1000 })
  if (error || !data) return 0
  return data.filter((o) => o.name.endsWith(META_SUFFIX)).length
}

// ---------------------------------------------------------------------------
// Limpieza masiva por materia / año (para ABM admin).
// Borra TODOS los archivos de una materia: PDFs de apuntes y bancos de quiz.
// No lanza si ya no existen los archivos (operación idempotente).
// ---------------------------------------------------------------------------

/**
 * Elimina todos los archivos en Storage asociados a una materia:
 * - PDFs de apuntes: `{subjectSlug}/*.pdf` (y cualquier otro archivo en esa ruta)
 * - Bancos de quiz:  `quizzes/{yearSlug}/{subjectSlug}/*`
 */
export async function deleteSubjectStorage(
  yearSlug: string,
  subjectSlug: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  // 1. PDFs de apuntes
  const { data: pdfFiles } = await supabase.storage
    .from(BUCKET)
    .list(subjectSlug, { limit: 1000 })
  if (pdfFiles && pdfFiles.length > 0) {
    const pdfKeys = pdfFiles.map((f) => `${subjectSlug}/${f.name}`)
    await supabase.storage.from(BUCKET).remove(pdfKeys)
  }

  // 2. Bancos de quiz
  const quizDir = bankDir(yearSlug, subjectSlug)
  const { data: quizFiles } = await supabase.storage
    .from(BUCKET)
    .list(quizDir, { limit: 1000 })
  if (quizFiles && quizFiles.length > 0) {
    const quizKeys = quizFiles.map((f) => `${quizDir}/${f.name}`)
    await supabase.storage.from(BUCKET).remove(quizKeys)
  }
}

/**
 * Elimina todos los archivos en Storage de todas las materias de un año.
 * Recibe un array de { yearSlug, subjectSlug } para operar sobre las
 * combinaciones ya conocidas ANTES del delete en BD (que los borra en cascada).
 */
export async function deleteYearStorage(
  subjects: ReadonlyArray<{ yearSlug: string; subjectSlug: string }>,
): Promise<void> {
  await Promise.all(
    subjects.map(({ yearSlug, subjectSlug }) =>
      deleteSubjectStorage(yearSlug, subjectSlug),
    ),
  )
}
