'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  ensureCanManageContribution,
  requireGeneralAdmin,
  requireYearAdminForAgendaId,
  requireYearAdminForApunteId,
  requireYearAdminForCommissionId,
  requireYearAdminForEventoId,
  requireYearAdminForSubjectId,
  requireYearAdminForSubjectSlug,
  requireYearAdminForYearId,
} from '@/lib/auth'
import { sanitizeRichHtml } from '@/lib/sanitize'
import { ensureUniqueSlug, slugify, uniqueSlug, yearSlugFromNumber } from '@/lib/slug'
import {
  uploadQuizBank,
  uploadApunteHtml,
  deleteApunteHtml,
  MAX_APUNTE_HTML_BYTES,
  APUNTE_HTML_MIME,
  deleteQuizBank,
  getQuizBankMeta,
  listQuizBankContributionRevocations,
  readQuizBank,
  deleteSubjectStorage,
  deleteYearStorage,
  quizBanksCacheTag,
} from '@/lib/storage'
import { queryTags } from '@/lib/queries'
import { detectarRecurso, isValidHttpsUrl } from '@/lib/recursos'
import {
  getSubjectDeleteImpact,
  getYearDeleteImpact,
  type SubjectDeleteImpact,
  type YearDeleteImpact,
} from '@/lib/queries'
import { parseQuizBank } from '@/lib/domain/quiz-bank'
import {
  compileReactArtifact,
  MAX_APUNTE_REACT_SOURCE_BYTES,
  type ReactArtifactExtension,
} from '@/lib/domain/apunte-artifact'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import {
  awardApunteCreated,
  adjustContributionScore,
  awardEventoCreated,
  awardQuizBankCreated,
  revokeApunteCreated,
  revokeEventoCreated,
  revokeQuizBankCreated,
  revokeContributionBatch,
} from '@/lib/contributions'
import { isReservedYearSlug, reservedYearSlugSet } from '@/lib/year-slugs'
import { SUBJECT_LINK_TYPES } from '@/lib/subjectLinks'
import {
  revalidateTag,
  requireAuth,
  ActionInputError,
  revalidateSubjectContent,
  fechaToDbDate,
} from './actions/shared'

export {
  createEvento,
  createEventoAction,
  updateEventoFechaAction,
  updateEventoAction,
  deleteEvento,
} from './actions/eventos'
export type { EventoActionState } from './actions/eventos'

export {
  createPeriodoAction,
  updatePeriodoAction,
  deletePeriodo,
} from './actions/periodos'
export type { PeriodoActionState } from './actions/periodos'

// Wrapper para useActionState en modal cliente
export interface ApunteActionState {
  ok: boolean
  message: string
  apunte?: {
    id: string
    titulo: string
    slug: string
    subject: {
      slug: string
      year: {
        slug: string
      }
    }
  }
}

const baseRecursoSchema = z.object({
  orden: z.number().int().min(0).max(255),
  nombre: z
    .string()
    .trim()
    .max(120, 'El nombre del recurso no puede superar los 120 caracteres.')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
})

const linkRecursoSchema = baseRecursoSchema
  .extend({
    url: z.url(),
    tipo: z.enum(['YOUTUBE', 'DRIVE', 'REPOSITORY', 'OTHER']),
  })
  .refine(
    (r) => {
      if (r.tipo === 'OTHER') {
        return isValidHttpsUrl(r.url)
      }
      const detected = detectarRecurso(r.url)
      return detected !== null && detected.tipo === r.tipo
    },
    { message: 'URL no permitida o tipo inconsistente' },
  )

const htmlRecursoSchema = baseRecursoSchema.extend({
  tipo: z.literal('HTML'),
  url: z.string().optional().default(''),
  localId: z.string().min(1).max(120).optional(),
  storageKey: z.string().min(1).max(500).optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().min(1).optional(),
})

const recursoSchema = z.union([linkRecursoSchema, htmlRecursoSchema])

type ParsedRecurso = z.infer<typeof recursoSchema>

type RecursoCreateData = {
  apunteId: string
  tipo: ParsedRecurso['tipo']
  url: string
  orden: number
  nombre: string | null
  storageKey?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
}

type ExistingApunteResourceMeta = {
  mimeType: string | null
  sizeBytes: number | null
}

function isHtmlFileName(name: string): boolean {
  return /\.html?$/i.test(name.trim())
}

function getReactArtifactExtension(name: string): ReactArtifactExtension | null {
  const normalized = name.trim().toLowerCase()
  if (normalized.endsWith('.tsx')) return 'tsx'
  if (normalized.endsWith('.jsx')) return 'jsx'
  return null
}

function looksLikeHtml(text: string): boolean {
  const sample = text.slice(0, 500).toLowerCase()
  return sample.includes('<!doctype html') || sample.includes('<html')
}

async function readInteractiveUpload(formData: FormData, localId: string, title: string): Promise<{
  html: string
  sizeBytes: number
} | { error: string }> {
  const raw = formData.get(`htmlFile:${localId}`)
  if (!(raw instanceof File) || raw.size === 0) {
    return { error: 'Seleccioná un archivo de apunte interactivo.' }
  }

  if (isHtmlFileName(raw.name)) {
    if (raw.type && raw.type !== 'text/html') {
      return { error: 'El archivo debe ser HTML.' }
    }

    if (raw.size > MAX_APUNTE_HTML_BYTES) {
      return { error: 'El HTML no puede superar los 2 MB.' }
    }

    const html = await raw.text()
    if (!looksLikeHtml(html)) {
      return { error: 'El archivo no parece ser un HTML completo.' }
    }

    return { html, sizeBytes: Buffer.byteLength(html, 'utf8') }
  }

  const extension = getReactArtifactExtension(raw.name)
  if (!extension) {
    return { error: 'El archivo debe ser HTML, JSX o TSX.' }
  }

  if (raw.size > MAX_APUNTE_REACT_SOURCE_BYTES) {
    return { error: 'El archivo React no puede superar los 500 KB.' }
  }

  const compiled = await compileReactArtifact({
    source: await raw.text(),
    extension,
    title,
  })
  if (!compiled.ok) return { error: compiled.error }

  return { html: compiled.html, sizeBytes: compiled.sizeBytes }
}

async function buildApunteRecursos(params: {
  apunteId: string
  apunteTitulo: string
  yearSlug: string
  subjectSlug: string
  formData: FormData
  recursos: ParsedRecurso[]
  existingResourceMetaByStorageKey: Map<string, ExistingApunteResourceMeta>
}): Promise<{
  data: RecursoCreateData[]
  uploadedStorageKeys: string[]
} | { error: string; uploadedStorageKeys: string[] }> {
  const uploadedStorageKeys: string[] = []

  const results: Array<RecursoCreateData | { error: string }> = await Promise.all(
    params.recursos.map(async (recurso, index) => {
      if (recurso.tipo !== 'HTML') {
        return {
          apunteId: params.apunteId,
          tipo: recurso.tipo,
          url: recurso.url,
          orden: index,
          nombre: recurso.nombre,
        } satisfies RecursoCreateData
      }

      if (recurso.storageKey) {
        const existingMeta = params.existingResourceMetaByStorageKey.get(recurso.storageKey)
        if (!existingMeta) {
          return { error: 'No encontramos el apunte interactivo que querés conservar.' }
        }

        return {
          apunteId: params.apunteId,
          tipo: 'HTML',
          url: '',
          orden: index,
          nombre: recurso.nombre,
          storageKey: recurso.storageKey,
          mimeType: existingMeta.mimeType ?? APUNTE_HTML_MIME,
          sizeBytes: existingMeta.sizeBytes,
        } satisfies RecursoCreateData
      }

      if (!recurso.localId) {
        return { error: 'No se pudo identificar el archivo de apunte interactivo.' }
      }

      const upload = await readInteractiveUpload(params.formData, recurso.localId, recurso.nombre ?? params.apunteTitulo)
      if ('error' in upload) {
        return upload
      }

      const storageKey = await uploadApunteHtml({
        yearSlug: params.yearSlug,
        subjectSlug: params.subjectSlug,
        apunteId: params.apunteId,
        html: upload.html,
      })
      uploadedStorageKeys.push(storageKey)
      return {
        apunteId: params.apunteId,
        tipo: 'HTML',
        url: '',
        orden: index,
        nombre: recurso.nombre,
        storageKey,
        mimeType: APUNTE_HTML_MIME,
        sizeBytes: upload.sizeBytes,
      } satisfies RecursoCreateData
    }),
  )

  const failed = results.find(
    (result): result is { error: string } => 'error' in result,
  )
  if (failed) {
    return { error: failed.error, uploadedStorageKeys }
  }

  const data = results.filter(
    (result): result is RecursoCreateData => !('error' in result),
  )
  return { data, uploadedStorageKeys }
}

const apunteContentSchema = z.object({
  titulo: z.string().trim().min(1).max(200),
  descripcionHtml: z.string().max(20000).default(''),
  slug: z.preprocess(
    (v) => {
      if (typeof v !== 'string') return undefined
      const trimmed = v.trim().toLowerCase()
      return trimmed.length === 0 ? undefined : trimmed
    },
    z
      .string()
      .min(1)
      .max(80, 'El link compartible no puede superar los 80 caracteres.')
      .regex(
        /^[a-z0-9-]+$/,
        'El link solo puede contener letras, números y guiones.',
      )
      .optional(),
  ),
  recursos: z
    .array(recursoSchema)
    .max(50)
    .default([])
    .refine(
      (recursos) => {
        const ordenes = recursos.map((r) => r.orden)
        return new Set(ordenes).size === ordenes.length
      },
      { message: 'Órdenes duplicados' },
    ),
  categoriaIds: z.array(z.string().trim().min(1)).min(1, 'Elegí al menos una categoría.'),
})

function parseRecursosJson(raw: unknown): ParsedRecurso[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return []
  try {
    return JSON.parse(raw) as z.infer<typeof recursoSchema>[]
  } catch {
    return null
  }
}

function parseCategoriaIdsJson(raw: unknown): string[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  } catch {
    return null
  }
}

async function validateCategoriaIds(categoriaIds: string[]): Promise<string[] | null> {
  const unique = [...new Set(categoriaIds)]
  if (unique.length === 0) return null

  const found = await prisma.categoria.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  })

  if (found.length !== unique.length) return null
  return unique
}

export async function createApunteAction(
  _prev: ApunteActionState,
  formData: FormData,
): Promise<ApunteActionState> {
  await requireAuth()
  const subjectId = z.string().min(1).safeParse(formData.get('subjectId'))
  if (!subjectId.success) {
    return { ok: false, message: 'Materia no especificada.' }
  }

  const scope = await requireYearAdminForSubjectId(subjectId.data)
  if (!scope) return { ok: false, message: 'Materia no encontrada.' }

  const recursosRaw = parseRecursosJson(formData.get('recursosJson'))
  if (recursosRaw === null) {
    return { ok: false, message: 'El formato de los recursos no es válido.' }
  }

  const categoriaIdsRaw = parseCategoriaIdsJson(formData.get('categoriaIdsJson'))
  if (categoriaIdsRaw === null) {
    return { ok: false, message: 'Elegí al menos una categoría.' }
  }

  const parsed = apunteContentSchema.safeParse({
    titulo: formData.get('titulo'),
    descripcionHtml: formData.get('descripcionHtml') ?? '',
    slug: formData.get('slug') ?? undefined,
    recursos: recursosRaw,
    categoriaIds: categoriaIdsRaw,
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }

  const { titulo, descripcionHtml, slug: slugInput, recursos, categoriaIds } = parsed.data

  // Resolver slug final.
  let finalSlug: string
  if (slugInput) {
    const collision = await prisma.apunte.findFirst({
      where: { subjectId: subjectId.data, slug: slugInput },
      select: { id: true },
    })
    if (collision) {
      return { ok: false, message: 'Ese link ya está usado en esta materia.' }
    }
    finalSlug = slugInput
  } else {
    const existing = await prisma.apunte.findMany({
      where: { subjectId: subjectId.data },
      select: { slug: true },
    })
    const taken = new Set(existing.map((a) => a.slug))
    finalSlug = ensureUniqueSlug(slugify(titulo), taken)
  }

  const validCategoriaIds = await validateCategoriaIds(categoriaIds)
  if (!validCategoriaIds) {
    return { ok: false, message: 'Elegí categorías válidas.' }
  }

  let apunteId: string
  try {
    const apunte = await prisma.$transaction(async (tx) => {
      const created = await tx.apunte.create({
        data: {
          subjectId: subjectId.data,
          titulo,
          slug: finalSlug,
          descripcionHtml: sanitizeRichHtml(descripcionHtml),
          createdByUserId: scope.admin.id,
          categorias: {
            create: validCategoriaIds.map((categoriaId) => ({ categoriaId })),
          },
        },
        select: { id: true },
      })
      return created
    })
    apunteId = apunte.id
  } catch (err) {
    console.error('createApunteAction: failed to create note with categories', err)
    return { ok: false, message: 'No se pudo crear el apunte. Intentá de nuevo.' }
  }

  const built = await buildApunteRecursos({
    apunteId,
    apunteTitulo: titulo,
    yearSlug: scope.yearSlug,
    subjectSlug: scope.subjectSlug,
    formData,
    recursos,
    existingResourceMetaByStorageKey: new Map(),
  })

  if ('error' in built) {
    await deleteApunteHtml(built.uploadedStorageKeys)
    await prisma.apunte.delete({ where: { id: apunteId } }).catch(() => undefined)
    return { ok: false, message: built.error }
  }

  try {
    if (built.data.length > 0) {
      await prisma.apunteRecurso.createMany({ data: built.data })
    }
    await awardApunteCreated(scope.admin.id, built.data.length)
  } catch (err) {
    console.error('createApunteAction: failed to create note resources', err)
    await deleteApunteHtml(built.uploadedStorageKeys)
    await prisma.apunte.delete({ where: { id: apunteId } }).catch(() => undefined)
    return { ok: false, message: 'No se pudo crear el apunte. Intentá de nuevo.' }
  }

  await revalidateSubjectContent(scope.subjectSlug)
  await recordAudit({
    userId: scope.admin.id,
    action: AUDIT_ACTIONS.APUNTE_CREATED,
    entityType: 'apunte',
    entityId: apunteId,
    yearId: scope.yearId,
    yearSlug: scope.yearSlug,
    detail: {
      titulo,
      slug: finalSlug,
      subjectSlug: scope.subjectSlug,
      yearSlug: scope.yearSlug,
      recursosCount: built.data.length,
      categoriasCount: validCategoriaIds.length,
    },
  })
  return {
    ok: true,
    message: 'Apunte creado correctamente.',
    apunte: {
      id: apunteId,
      titulo,
      slug: finalSlug,
      subject: {
        slug: scope.subjectSlug,
        year: { slug: scope.yearSlug },
      },
    },
  }
}

export async function updateApunteAction(
  _prev: ApunteActionState,
  formData: FormData,
): Promise<ApunteActionState> {
  await requireAuth()
  const apunteId = z.string().min(1).safeParse(formData.get('apunteId'))
  if (!apunteId.success) {
    return { ok: false, message: 'Apunte no especificado.' }
  }

  const scope = await requireYearAdminForApunteId(apunteId.data)
  if (!scope) return { ok: false, message: 'Apunte no encontrado.' }

  const recursosRaw = parseRecursosJson(formData.get('recursosJson'))
  if (recursosRaw === null) {
    return { ok: false, message: 'El formato de los recursos no es válido.' }
  }

  const categoriaIdsRaw = parseCategoriaIdsJson(formData.get('categoriaIdsJson'))
  if (categoriaIdsRaw === null) {
    return { ok: false, message: 'Elegí al menos una categoría.' }
  }

  const parsed = apunteContentSchema.safeParse({
    titulo: formData.get('titulo'),
    descripcionHtml: formData.get('descripcionHtml') ?? '',
    slug: formData.get('slug') ?? undefined,
    recursos: recursosRaw,
    categoriaIds: categoriaIdsRaw,
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }

  const { titulo, descripcionHtml, slug: slugInput, recursos, categoriaIds } = parsed.data

  // Resolver slug final: si llega y cambia, validar unicidad excluyendo el propio id.
  const apunteActual = await prisma.apunte.findUnique({
    where: { id: apunteId.data },
    select: {
      slug: true,
      subjectId: true,
      createdByUserId: true,
      _count: { select: { recursos: true } },
      recursos: {
        where: { tipo: 'HTML', storageKey: { not: null } },
        select: { storageKey: true, mimeType: true, sizeBytes: true },
      },
    },
  })
  if (!apunteActual) {
    return { ok: false, message: 'Apunte no encontrado.' }
  }
  ensureCanManageContribution(scope.admin, apunteActual.createdByUserId)

  let finalSlug = apunteActual.slug
  if (slugInput && slugInput !== apunteActual.slug) {
    const collision = await prisma.apunte.findFirst({
      where: {
        subjectId: apunteActual.subjectId,
        slug: slugInput,
        NOT: { id: apunteId.data },
      },
      select: { id: true },
    })
    if (collision) {
      return { ok: false, message: 'Ese link ya está usado en esta materia.' }
    }
    finalSlug = slugInput
  }

  const validCategoriaIds = await validateCategoriaIds(categoriaIds)
  if (!validCategoriaIds) {
    return { ok: false, message: 'Elegí categorías válidas.' }
  }

  const built = await buildApunteRecursos({
    apunteId: apunteId.data,
    apunteTitulo: titulo,
    yearSlug: scope.yearSlug,
    subjectSlug: scope.subjectSlug,
    formData,
    recursos,
    existingResourceMetaByStorageKey: new Map(
      apunteActual.recursos
        .filter((r): r is { storageKey: string; mimeType: string | null; sizeBytes: number | null } => Boolean(r.storageKey))
        .map((r) => [r.storageKey, { mimeType: r.mimeType, sizeBytes: r.sizeBytes }]),
    ),
  })

  if ('error' in built) {
    await deleteApunteHtml(built.uploadedStorageKeys)
    return { ok: false, message: built.error }
  }

  const keptStorageKeys = new Set(
    built.data.map((r) => r.storageKey).filter((key): key is string => Boolean(key)),
  )
  const storageKeysToDelete = apunteActual.recursos
    .map((r) => r.storageKey)
    .filter((key): key is string => key !== null && !keptStorageKeys.has(key))

  try {
    await prisma.$transaction(async (tx) => {
      await tx.apunte.update({
        where: { id: apunteId.data },
        data: {
          titulo,
          slug: finalSlug,
          descripcionHtml: sanitizeRichHtml(descripcionHtml),
        },
      })
      await tx.apunteRecurso.deleteMany({ where: { apunteId: apunteId.data } })
      await tx.apunteCategoria.deleteMany({ where: { apunteId: apunteId.data } })
      await tx.apunteCategoria.createMany({
        data: validCategoriaIds.map((categoriaId) => ({
          apunteId: apunteId.data,
          categoriaId,
        })),
      })
      if (built.data.length > 0) {
        await tx.apunteRecurso.createMany({ data: built.data })
      }
    })
  } catch (err) {
    console.error('updateApunteAction: failed to update note', err)
    await deleteApunteHtml(built.uploadedStorageKeys)
    return { ok: false, message: 'No se pudo actualizar el apunte. Intentá de nuevo.' }
  }

  const scoreDelta = built.data.length - apunteActual._count.recursos
  if (apunteActual.createdByUserId && scoreDelta !== 0) {
    await adjustContributionScore(apunteActual.createdByUserId, scoreDelta)
  }

  await deleteApunteHtml(storageKeysToDelete)

  await revalidateSubjectContent(scope.subjectSlug)
  await recordAudit({
    userId: scope.admin.id,
    action: AUDIT_ACTIONS.APUNTE_UPDATED,
    entityType: 'apunte',
    entityId: apunteId.data,
    yearId: scope.yearId,
    yearSlug: scope.yearSlug,
    detail: {
      titulo,
      slug: finalSlug,
      subjectSlug: scope.subjectSlug,
      yearSlug: scope.yearSlug,
      recursosCount: built.data.length,
      categoriasCount: validCategoriaIds.length,
    },
  })
  return { ok: true, message: 'Apunte actualizado correctamente.' }
}

export async function deleteApunteAction(formData: FormData): Promise<void> {
  await requireAuth()
  const id = z.string().min(1).parse(formData.get('id'))
  const scope = await requireYearAdminForApunteId(id)
  if (!scope) return

  const apunte = await prisma.apunte.findUnique({
    where: { id },
    select: {
      titulo: true,
      createdByUserId: true,
      _count: { select: { recursos: true } },
      recursos: {
        where: { tipo: 'HTML', storageKey: { not: null } },
        select: { storageKey: true },
      },
    },
  })
  ensureCanManageContribution(scope.admin, apunte?.createdByUserId)

  // La FK con onDelete: Cascade borra los ApunteRecurso automáticamente.
  await prisma.apunte.delete({ where: { id } })
  await deleteApunteHtml(
    (apunte?.recursos ?? [])
      .map((r) => r.storageKey)
      .filter((key): key is string => Boolean(key)) ?? [],
  )

  if (apunte?.createdByUserId) {
    await revokeApunteCreated(apunte.createdByUserId, apunte._count.recursos)
  }

  await revalidateSubjectContent(scope.subjectSlug)
  if (apunte) {
    await recordAudit({
      userId: scope.admin.id,
      action: AUDIT_ACTIONS.APUNTE_DELETED,
      entityType: 'apunte',
      entityId: id,
      yearId: scope.yearId,
      yearSlug: scope.yearSlug,
      detail: {
        titulo: apunte.titulo,
        subjectSlug: scope.subjectSlug,
        yearSlug: scope.yearSlug,
      },
    })
  }
}

// --- Banco de preguntas (quiz JSON-en-bucket) ------------------------------

export interface QuizBankActionState {
  ok: boolean
  message: string
}

const uploadBankSchema = z.object({
  subjectSlug: z.string().min(1),
  json: z.string().min(1).max(2 * 1024 * 1024),
})

// Sube un banco de preguntas. Valida el JSON ANTES de tocar Storage (forma +
// semántica, sin eval). El nombre del banco se deriva del title del JSON.
// Devuelve estado para feedback en el modal.
export async function uploadQuizBankAction(
  _prev: QuizBankActionState,
  formData: FormData,
): Promise<QuizBankActionState> {
  await requireAuth()
  const parsedForm = uploadBankSchema.safeParse({
    subjectSlug: formData.get('subjectSlug'),
    json: formData.get('json'),
  })
  if (!parsedForm.success) {
    return { ok: false, message: 'Seleccioná un archivo de preguntas válido.' }
  }
  const { subjectSlug, json } = parsedForm.data

  const scope = await requireYearAdminForSubjectSlug(subjectSlug)
  if (!scope) {
    return { ok: false, message: 'Materia no encontrada.' }
  }

  const bank = parseQuizBank(json)
  if (!bank.ok) {
    return { ok: false, message: bank.error }
  }

  // El nombre del banco se toma del title del JSON (sin depender del cliente).
  const nombre = bank.bank.title

  try {
    await uploadQuizBank({
      yearSlug: scope.yearSlug,
      subjectSlug: scope.subjectSlug,
      nombre,
      // Re-serializa la versión validada/normalizada (descarta basura extra).
      rawJson: JSON.stringify(bank.bank),
      totalPreguntas: bank.totalPreguntas,
      subidoPor: scope.admin.email,
      subidoPorId: scope.admin.id,
    })
  } catch {
    return {
      ok: false,
      message: 'No se pudo guardar el banco. Probá de nuevo.',
    }
  }
  await awardQuizBankCreated(scope.admin.id, bank.bank.units.length)

  revalidateTag(quizBanksCacheTag(scope.yearSlug, scope.subjectSlug))
  await revalidateSubjectContent(scope.subjectSlug)
  await recordAudit({
    userId: scope.admin.id,
    action: AUDIT_ACTIONS.QUIZ_BANK_UPLOADED,
    entityType: 'quizBank',
    yearId: scope.yearId,
    yearSlug: scope.yearSlug,
    detail: {
      nombre,
      totalPreguntas: bank.totalPreguntas,
      subjectSlug: scope.subjectSlug,
      yearSlug: scope.yearSlug,
    },
  })
  return {
    ok: true,
    message: `Banco "${nombre}" cargado (${bank.totalPreguntas} preguntas).`,
  }
}

export async function deleteQuizBankAction(formData: FormData): Promise<void> {
  await requireAuth()
  const subjectSlug = z.string().min(1).parse(formData.get('subjectSlug'))
  const bankId = z.uuid().parse(formData.get('bankId'))
  const scope = await requireYearAdminForSubjectSlug(subjectSlug)
  if (!scope) return
  const meta = await getQuizBankMeta(scope.yearSlug, scope.subjectSlug, bankId)
  // Ownership por id (criterio del resto del sistema). Para metas viejas sin
  // subidoPorId se cae al email como fallback de compatibilidad.
  const ownsBank = meta?.subidoPorId
    ? meta.subidoPorId === scope.admin.id
    : meta?.subidoPor === scope.admin.email
  if (!scope.admin.canManageAnyContribution && !ownsBank) {
    return
  }

  // Leer el banco completo antes de borrar para obtener el count de units
  const bank = await readQuizBank(scope.yearSlug, scope.subjectSlug, bankId)
  const unitsCount = bank?.units.length ?? 0
  const ownerId = meta?.subidoPorId

  await deleteQuizBank(scope.yearSlug, scope.subjectSlug, bankId)

  if (ownerId) {
    await revokeQuizBankCreated(ownerId, unitsCount)
  }

  revalidateTag(quizBanksCacheTag(scope.yearSlug, scope.subjectSlug))
  await revalidateSubjectContent(scope.subjectSlug)
  await recordAudit({
    userId: scope.admin.id,
    action: AUDIT_ACTIONS.QUIZ_BANK_DELETED,
    entityType: 'quizBank',
    entityId: bankId,
    yearId: scope.yearId,
    yearSlug: scope.yearSlug,
    detail: {
      bankId,
      subjectSlug: scope.subjectSlug,
      yearSlug: scope.yearSlug,
    },
  })
}

// --- ABM Años académicos ---------------------------------------------------

export interface YearActionState {
  ok: boolean
  message: string
}

const yearSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  descripcion: z.string().trim().max(500).default(''),
  driveUrl: z
    .string()
    .trim()
    .url('El enlace de Drive debe ser una URL válida')
    .or(z.literal(''))
    .nullable()
    .optional(),
  playlistUrl: z.string().trim().url().or(z.literal('')).nullable().optional(),
  playlistEnabled: z.coerce.boolean().default(false),
  discordUrl: z
    .string()
    .trim()
    .url('El enlace de Discord debe ser una URL válida')
    .or(z.literal(''))
    .nullable()
    .optional(),
  discordDescripcion: z.string().trim().max(500).or(z.literal('')).nullable().optional(),
  discordAltUrl: z
    .string()
    .trim()
    .url('El enlace de Discord alternativo debe ser una URL válida')
    .or(z.literal(''))
    .nullable()
    .optional(),
  discordAltDescripcion: z.string().trim().max(500).or(z.literal('')).nullable().optional(),
  orden: z.coerce
    .number()
    .int('El orden debe ser un número entero')
    .min(1, 'El orden debe ser mayor a 0'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-f]{6}$/i, 'El color debe ser un hexadecimal válido (#rrggbb)')
    .or(z.literal(''))
    .nullable()
    .optional(),
})

export async function createYearAction(
  _prev: YearActionState,
  formData: FormData,
): Promise<YearActionState> {
  const admin = await requireAuth('general')

  const parsed = yearSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
    driveUrl: formData.get('driveUrl') ?? '',
    playlistUrl: formData.get('playlistUrl') ?? '',
    playlistEnabled: formData.get('playlistEnabled'),
    discordUrl: formData.get('discordUrl') ?? '',
    discordDescripcion: formData.get('discordDescripcion') ?? '',
    discordAltUrl: formData.get('discordAltUrl') ?? '',
    discordAltDescripcion: formData.get('discordAltDescripcion') ?? '',
    orden: formData.get('orden'),
    color: formData.get('color') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const {
    nombre,
    descripcion,
    driveUrl,
    playlistUrl,
    playlistEnabled,
    discordUrl,
    discordDescripcion,
    discordAltUrl,
    discordAltDescripcion,
    orden,
    color,
  } = parsed.data

  const normalizedPlaylistUrl = playlistUrl || null
  if (normalizedPlaylistUrl) {
    const detected = detectarRecurso(normalizedPlaylistUrl)
    if (!detected || detected.tipo !== 'YOUTUBE') {
      return { ok: false, message: 'La playlist debe ser un enlace de YouTube válido.' }
    }
  }

  const career = await prisma.career.findFirst({ select: { id: true } })
  if (!career) {
    return { ok: false, message: 'No existe una carrera configurada.' }
  }

  const base = yearSlugFromNumber(orden)
  if (isReservedYearSlug(base)) {
    return {
      ok: false,
      message: 'Ese nombre coincide con una sección del sitio. Probá con otro.',
    }
  }

  const existingSlugs = await prisma.academicYear.findMany({
    select: { slug: true },
  })
  const takenSlugs = new Set([
    ...existingSlugs.map((y) => y.slug),
    ...reservedYearSlugSet(),
  ])
  const slug = uniqueSlug(base, takenSlugs)

  const year = await prisma.academicYear.create({
    data: {
      nombre,
      slug,
      descripcion,
      driveUrl: driveUrl || null,
      playlistUrl: normalizedPlaylistUrl,
      playlistEnabled,
      discordUrl: discordUrl || null,
      discordDescripcion: discordDescripcion || null,
      discordAltUrl: discordAltUrl || null,
      discordAltDescripcion: discordAltDescripcion || null,
      orden,
      color: color || null,
      careerId: career.id,
    },
    select: { id: true },
  })

  revalidateTag(queryTags.career)
  revalidatePath('/')
  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.YEAR_CREATED,
    entityType: 'year',
    entityId: year.id,
    yearId: year.id,
    yearSlug: slug,
    detail: { nombre, slug, orden },
  })
  return { ok: true, message: 'Año creado correctamente.' }
}

export async function updateYearAction(
  _prev: YearActionState,
  formData: FormData,
): Promise<YearActionState> {
  const admin = await requireAuth('general')

  const id = z.string().min(1).parse(formData.get('id'))

  const parsed = yearSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
    driveUrl: formData.get('driveUrl') ?? '',
    playlistUrl: formData.get('playlistUrl') ?? '',
    playlistEnabled: formData.get('playlistEnabled'),
    discordUrl: formData.get('discordUrl') ?? '',
    discordDescripcion: formData.get('discordDescripcion') ?? '',
    discordAltUrl: formData.get('discordAltUrl') ?? '',
    discordAltDescripcion: formData.get('discordAltDescripcion') ?? '',
    orden: formData.get('orden'),
    color: formData.get('color') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const {
    nombre,
    descripcion,
    driveUrl,
    playlistUrl,
    playlistEnabled,
    discordUrl,
    discordDescripcion,
    discordAltUrl,
    discordAltDescripcion,
    orden,
    color,
  } = parsed.data

  const normalizedPlaylistUrl = playlistUrl || null
  if (normalizedPlaylistUrl) {
    const detected = detectarRecurso(normalizedPlaylistUrl)
    if (!detected || detected.tipo !== 'YOUTUBE') {
      return { ok: false, message: 'La playlist debe ser un enlace de YouTube válido.' }
    }
  }

  const year = await prisma.academicYear.findUnique({
    where: { id },
    select: { slug: true },
  })
  if (!year) return { ok: false, message: 'Año no encontrado.' }

  const oldSlug = year.slug

  const base = yearSlugFromNumber(orden)
  if (isReservedYearSlug(base)) {
    return {
      ok: false,
      message: 'Ese nombre coincide con una sección del sitio. Probá con otro.',
    }
  }

  const existingSlugs = await prisma.academicYear.findMany({
    where: { id: { not: id } },
    select: { slug: true },
  })
  const takenSlugs = new Set([
    ...existingSlugs.map((y) => y.slug),
    ...reservedYearSlugSet(),
  ])
  const newSlug = uniqueSlug(base, takenSlugs)

  await prisma.academicYear.update({
    where: { id },
    data: {
      nombre,
      slug: newSlug,
      descripcion,
      driveUrl: driveUrl || null,
      playlistUrl: normalizedPlaylistUrl,
      playlistEnabled,
      discordUrl: discordUrl || null,
      discordDescripcion: discordDescripcion || null,
      discordAltUrl: discordAltUrl || null,
      discordAltDescripcion: discordAltDescripcion || null,
      orden,
      color: color || null,
    },
  })

  revalidateTag(queryTags.career)
  revalidateTag(queryTags.year(oldSlug))
  if (newSlug !== oldSlug) revalidateTag(queryTags.year(newSlug))
  revalidatePath('/')
  revalidatePath(`/${oldSlug}`)
  revalidatePath(`/${oldSlug}/calendario`)
  if (newSlug !== oldSlug) {
    revalidatePath(`/${newSlug}`)
    revalidatePath(`/${newSlug}/calendario`)
  }
  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.YEAR_UPDATED,
    entityType: 'year',
    entityId: id,
    yearId: id,
    yearSlug: newSlug,
    detail: { nombre, oldSlug, newSlug, orden },
  })
  return { ok: true, message: 'Año actualizado correctamente.' }
}

export async function deleteYearAction(formData: FormData): Promise<void> {
  const admin = await requireAuth('general')
  const id = z.string().min(1).parse(formData.get('id'))

  // Capturar toda la info ANTES de borrar (la cascada elimina los registros)
  const year = await prisma.academicYear.findUnique({
    where: { id },
    select: {
      slug: true,
      nombre: true,
      subjects: {
        select: {
          slug: true,
          apuntes: {
            where: { createdByUserId: { not: null } },
            select: {
              createdByUserId: true,
              _count: { select: { recursos: true } },
            },
          },
          agendas: {
            select: {
              eventos: {
                where: { createdByUserId: { not: null } },
                select: { createdByUserId: true },
              },
            },
          },
        },
      },
    },
  })
  if (!year) return

  // Agrupar contribuciones por usuario antes de borrar
  const userRevokeMap = new Map<
    string,
    { apuntes: number; eventos: number; bancos: number; puntaje: number }
  >()
  for (const subject of year.subjects) {
    for (const apunte of subject.apuntes) {
      if (!apunte.createdByUserId) continue
      const prev = userRevokeMap.get(apunte.createdByUserId) ?? {
        apuntes: 0,
        eventos: 0,
        bancos: 0,
        puntaje: 0,
      }
      const recursosCount = apunte._count.recursos
      prev.apuntes += 1
      prev.puntaje += 1 + Math.max(0, recursosCount)
      userRevokeMap.set(apunte.createdByUserId, prev)
    }
    for (const agenda of subject.agendas) {
      for (const evento of agenda.eventos) {
        if (!evento.createdByUserId) continue
        const prev = userRevokeMap.get(evento.createdByUserId) ?? {
          apuntes: 0,
          eventos: 0,
          bancos: 0,
          puntaje: 0,
        }
        prev.eventos += 1
        prev.puntaje += 1
        userRevokeMap.set(evento.createdByUserId, prev)
      }
    }
  }

  const quizBankRevocationsBySubject = await Promise.all(
    year.subjects.map((subject) =>
      listQuizBankContributionRevocations(year.slug, subject.slug),
    ),
  )
  for (const revocations of quizBankRevocationsBySubject) {
    for (const revocation of revocations) {
      const prev = userRevokeMap.get(revocation.ownerId) ?? {
        apuntes: 0,
        eventos: 0,
        bancos: 0,
        puntaje: 0,
      }
      prev.bancos += 1
      prev.puntaje += 1 + Math.max(0, revocation.unitsCount)
      userRevokeMap.set(revocation.ownerId, prev)
    }
  }

  const storageTargets = year.subjects.map((s) => ({
    yearSlug: year.slug,
    subjectSlug: s.slug,
  }))

  // Limpiar Storage ANTES de borrar en BD
  try {
    await deleteYearStorage(storageTargets)
  } catch {
    console.error(`Storage cleanup parcial para año ${year.slug}`)
  }

  await prisma.academicYear.delete({ where: { id } })

  // Revocar contribuciones de usuarios afectados
  for (const [userId, counts] of userRevokeMap) {
    await revokeContributionBatch(userId, {
      apuntesCreados: counts.apuntes,
      eventosCreados: counts.eventos,
      bancosPreguntasCreados: counts.bancos,
      puntaje: counts.puntaje,
    })
  }

  revalidateTag(queryTags.career)
  revalidateTag(queryTags.year(year.slug))
  for (const s of year.subjects) {
    revalidateTag(queryTags.subject(s.slug))
  }
  revalidatePath('/')
  revalidatePath(`/${year.slug}`)
  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.YEAR_DELETED,
    entityType: 'year',
    entityId: id,
    yearId: id,
    yearSlug: year.slug,
    detail: {
      nombre: year.nombre,
      slug: year.slug,
      subjectsCount: year.subjects.length,
    },
  })
}

// Acción para obtener el impacto de eliminar un año (usada por el modal)
export async function getYearDeleteImpactAction(
  formData: FormData,
): Promise<YearDeleteImpact | null> {
  await requireAuth('general')
  const id = z.string().min(1).parse(formData.get('id'))
  return getYearDeleteImpact(id)
}

// --- ABM Materias ----------------------------------------------------------

export type SubjectActionState =
  | { ok: false; message: string }
  | {
      ok: true
      message: string
      /** Slug recalculado tras un update; permite al cliente navegar a la URL nueva. */
      newSlug?: string
      /** Slug del año al que pertenece la materia tras el update. */
      yearSlug?: string
    }

export interface CommissionActionState {
  ok: boolean
  message: string
}

const subjectLinkItemSchema = z.object({
  tipo: z.string().trim().min(1),
  label: z.string().trim(),
  url: z
    .string()
    .trim()
    .url()
    .refine(
      (u) => {
        try {
          const protocol = new URL(u).protocol
          return protocol === 'https:' || protocol === 'http:'
        } catch {
          return false
        }
      },
      { message: 'El enlace debe empezar con http:// o https://' },
    ),
})

const subjectSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(200),
  descripcion: z.string().trim().max(500).default(''),
})

const commissionSchema = z.object({
  subjectId: z.string().trim().min(1, 'La materia es obligatoria.'),
  nombre: z.string().trim().min(1, 'El nombre de la comisión es obligatorio.').max(120),
})

const DEFAULT_SUBJECT_COMMISSION = {
  slug: 'comision-1',
  nombre: 'Comisión 1',
} as const

export async function createSubjectAction(
  _prev: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  const admin = await requireAuth('academic')
  const yearId = z.string().min(1).parse(formData.get('yearId'))
  await requireYearAdminForYearId(yearId)

  const parsed = subjectSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const { nombre, descripcion } = parsed.data

  // Parse links defensively
  let rawLinks: z.infer<typeof subjectLinkItemSchema>[] = []
  try {
    const linksJson = formData.get('links')
    if (linksJson && typeof linksJson === 'string' && linksJson.trim() !== '') {
      const parsed = z.array(subjectLinkItemSchema).safeParse(JSON.parse(linksJson))
      if (parsed.success) rawLinks = parsed.data
    }
  } catch {
    rawLinks = []
  }
  const links = rawLinks.map((l, i) => ({
    tipo: l.tipo,
    label: l.label || SUBJECT_LINK_TYPES.find((t) => t.value === l.tipo)?.label || l.tipo,
    url: l.url,
    orden: i,
  }))

  const year = await prisma.academicYear.findUnique({
    where: { id: yearId },
    select: { slug: true },
  })
  if (!year) return { ok: false, message: 'Año no encontrado.' }

  const existingSlugs = await prisma.subject.findMany({
    select: { slug: true },
  })
  const takenSlugs = new Set(existingSlugs.map((s) => s.slug))
  const base = slugify(nombre)
  const slug = uniqueSlug(base, takenSlugs)

  // Crear materia + agenda general + comisión inicial + agenda específica en una transacción
  const subject = await prisma.$transaction(async (tx) => {
    const created = await tx.subject.create({
      data: { nombre, slug, descripcion, yearId },
      select: { id: true },
    })

    if (links.length > 0) {
      await tx.subjectLink.createMany({
        data: links.map((l) => ({ subjectId: created.id, ...l })),
      })
    }

    await tx.agenda.create({ data: { subjectId: created.id } })

    const commission = await tx.commission.create({
      data: {
        subjectId: created.id,
        slug: DEFAULT_SUBJECT_COMMISSION.slug,
        nombre: DEFAULT_SUBJECT_COMMISSION.nombre,
      },
      select: { id: true },
    })

    await tx.agenda.create({
      data: {
        subjectId: created.id,
        commissionId: commission.id,
      },
    })

    return created
  })

  revalidateTag(queryTags.career)
  revalidateTag(queryTags.year(year.slug))
  revalidatePath('/')
  revalidatePath(`/${year.slug}`)
  revalidatePath(`/${year.slug}/calendario`)
  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.SUBJECT_CREATED,
    entityType: 'subject',
    entityId: subject.id,
    yearId,
    yearSlug: year.slug,
    detail: { nombre, slug, yearSlug: year.slug },
  })
  return { ok: true, message: 'Materia creada correctamente.' }
}

export async function createCommissionAction(
  _prev: CommissionActionState,
  formData: FormData,
): Promise<CommissionActionState> {
  await requireAuth('academic')
  const parsed = commissionSchema.safeParse({
    subjectId: formData.get('subjectId'),
    nombre: formData.get('nombre'),
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }

  const { subjectId, nombre } = parsed.data
  const scope = await requireYearAdminForSubjectId(subjectId)
  if (!scope) return { ok: false, message: 'Materia no encontrada.' }

  const commission = await prisma.$transaction(async (tx) => {
    const existingSlugs = await tx.commission.findMany({
      where: { subjectId },
      select: { slug: true },
    })
    const takenSlugs = new Set(existingSlugs.map((item) => item.slug))
    const base = slugify(nombre)
    const slug = uniqueSlug(base, takenSlugs)

    const created = await tx.commission.create({
      data: {
        subjectId,
        nombre,
        slug,
      },
      select: {
        id: true,
        slug: true,
        nombre: true,
      },
    })

    await tx.agenda.create({
      data: {
        subjectId,
        commissionId: created.id,
      },
    })

    return created
  })

  revalidateTag(queryTags.career)
  await revalidateSubjectContent(scope.subjectSlug)
  await recordAudit({
    userId: scope.admin.id,
    action: AUDIT_ACTIONS.COMMISSION_CREATED,
    entityType: 'commission',
    entityId: commission.id,
    yearId: scope.yearId,
    yearSlug: scope.yearSlug,
    detail: {
      nombre: commission.nombre,
      slug: commission.slug,
      subjectSlug: scope.subjectSlug,
      yearSlug: scope.yearSlug,
    },
  })

  return { ok: true, message: 'Comisión creada correctamente.' }
}

export async function updateSubjectAction(
  _prev: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  await requireAuth('academic')
  const id = z.string().min(1).parse(formData.get('id'))
  const scope = await requireYearAdminForSubjectId(id)
  if (!scope) return { ok: false, message: 'Materia no encontrada.' }

  const parsed = subjectSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const { nombre, descripcion } = parsed.data

  // Parse links defensively
  let rawLinks: z.infer<typeof subjectLinkItemSchema>[] = []
  try {
    const linksJson = formData.get('links')
    if (linksJson && typeof linksJson === 'string' && linksJson.trim() !== '') {
      const parsedLinks = z.array(subjectLinkItemSchema).safeParse(JSON.parse(linksJson))
      if (parsedLinks.success) rawLinks = parsedLinks.data
    }
  } catch {
    rawLinks = []
  }
  const links = rawLinks.map((l, i) => ({
    tipo: l.tipo,
    label: l.label || SUBJECT_LINK_TYPES.find((t) => t.value === l.tipo)?.label || l.tipo,
    url: l.url,
    orden: i,
  }))

  const oldSlug = scope.subjectSlug

  const existingSlugs = await prisma.subject.findMany({
    where: { id: { not: id } },
    select: { slug: true },
  })
  const takenSlugs = new Set(existingSlugs.map((s) => s.slug))
  const base = slugify(nombre)
  const newSlug = uniqueSlug(base, takenSlugs)

  await prisma.$transaction(async (tx) => {
    await tx.subject.update({
      where: { id },
      data: {
        nombre,
        slug: newSlug,
        descripcion,
      },
    })

    // Full replace: delete existing links, then recreate
    await tx.subjectLink.deleteMany({ where: { subjectId: id } })
    if (links.length > 0) {
      await tx.subjectLink.createMany({
        data: links.map((l) => ({ subjectId: id, ...l })),
      })
    }
  })

  revalidateTag(queryTags.career)
  revalidateTag(queryTags.year(scope.yearSlug))
  revalidateTag(queryTags.subject(oldSlug))
  if (newSlug !== oldSlug) revalidateTag(queryTags.subject(newSlug))
  revalidatePath('/')
  revalidatePath(`/${scope.yearSlug}`)
  revalidatePath(`/${scope.yearSlug}/calendario`)
  revalidatePath(`/${scope.yearSlug}/${oldSlug}`)
  if (newSlug !== oldSlug) revalidatePath(`/${scope.yearSlug}/${newSlug}`)
  await recordAudit({
    userId: scope.admin.id,
    action: AUDIT_ACTIONS.SUBJECT_UPDATED,
    entityType: 'subject',
    entityId: id,
    yearId: scope.yearId,
    yearSlug: scope.yearSlug,
    detail: { nombre, oldSlug, newSlug, yearSlug: scope.yearSlug },
  })
  return {
    ok: true,
    message: 'Materia actualizada correctamente.',
    newSlug,
    yearSlug: scope.yearSlug,
  }
}

export async function deleteSubjectAction(formData: FormData): Promise<void> {
  await requireAuth('academic')
  const id = z.string().min(1).parse(formData.get('id'))
  const scope = await requireYearAdminForSubjectId(id)
  if (!scope) return

  const { subjectSlug, yearSlug } = scope

  const subject = await prisma.subject.findUnique({
    where: { id },
    select: {
      nombre: true,
      apuntes: {
        where: { createdByUserId: { not: null } },
        select: {
          createdByUserId: true,
          _count: { select: { recursos: true } },
        },
      },
      agendas: {
        select: {
          eventos: {
            where: { createdByUserId: { not: null } },
            select: { createdByUserId: true },
          },
        },
      },
    },
  })

  // Agrupar contribuciones por usuario antes de borrar
  const userRevokeMap = new Map<
    string,
    { apuntes: number; eventos: number; bancos: number; puntaje: number }
  >()
  if (subject) {
    for (const apunte of subject.apuntes) {
      if (!apunte.createdByUserId) continue
      const prev = userRevokeMap.get(apunte.createdByUserId) ?? {
        apuntes: 0,
        eventos: 0,
        bancos: 0,
        puntaje: 0,
      }
      const recursosCount = apunte._count.recursos
      prev.apuntes += 1
      prev.puntaje += 1 + Math.max(0, recursosCount)
      userRevokeMap.set(apunte.createdByUserId, prev)
    }
    for (const agenda of subject.agendas) {
      for (const evento of agenda.eventos) {
        if (!evento.createdByUserId) continue
        const prev = userRevokeMap.get(evento.createdByUserId) ?? {
          apuntes: 0,
          eventos: 0,
          bancos: 0,
          puntaje: 0,
        }
        prev.eventos += 1
        prev.puntaje += 1
        userRevokeMap.set(evento.createdByUserId, prev)
      }
    }
  }

  const quizBankRevocations = await listQuizBankContributionRevocations(
    yearSlug,
    subjectSlug,
  )
  for (const revocation of quizBankRevocations) {
    const prev = userRevokeMap.get(revocation.ownerId) ?? {
      apuntes: 0,
      eventos: 0,
      bancos: 0,
      puntaje: 0,
    }
    prev.bancos += 1
    prev.puntaje += 1 + Math.max(0, revocation.unitsCount)
    userRevokeMap.set(revocation.ownerId, prev)
  }

  // Limpiar Storage ANTES de borrar en BD
  try {
    await deleteSubjectStorage(yearSlug, subjectSlug)
  } catch {
    console.error(`Storage cleanup parcial para materia ${subjectSlug}`)
  }

  await prisma.subject.delete({ where: { id } })

  // Revocar contribuciones de usuarios afectados
  for (const [userId, counts] of userRevokeMap) {
    await revokeContributionBatch(userId, {
      apuntesCreados: counts.apuntes,
      eventosCreados: counts.eventos,
      bancosPreguntasCreados: counts.bancos,
      puntaje: counts.puntaje,
    })
  }

  revalidateTag(queryTags.career)
  revalidateTag(queryTags.year(yearSlug))
  revalidateTag(queryTags.subject(subjectSlug))
  revalidateTag(quizBanksCacheTag(yearSlug, subjectSlug))
  revalidatePath('/')
  revalidatePath(`/${yearSlug}`)
  revalidatePath(`/${yearSlug}/calendario`)
  revalidatePath(`/${yearSlug}/${subjectSlug}`)
  if (subject) {
    await recordAudit({
      userId: scope.admin.id,
      action: AUDIT_ACTIONS.SUBJECT_DELETED,
      entityType: 'subject',
      entityId: id,
      yearId: scope.yearId,
      yearSlug,
      detail: { nombre: subject.nombre, slug: subjectSlug, yearSlug },
    })
  }
}

// Acción para obtener el impacto de eliminar una materia (usada por el modal)
export async function getSubjectDeleteImpactAction(
  formData: FormData,
): Promise<SubjectDeleteImpact | null> {
  await requireAuth('academic')
  const id = z.string().min(1).parse(formData.get('id'))
  const scope = await requireYearAdminForSubjectId(id)
  if (!scope) return null

  return getSubjectDeleteImpact(id)
}


// --- Sesión ----------------------------------------------------------------

export async function signOutAction(): Promise<void> {
  await requireAuth()
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}
