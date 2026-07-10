'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  ensureCanManageContribution,
  requireYearAdminForApunteId,
  requireYearAdminForSubjectId,
} from '@/lib/auth'
import { sanitizeRichHtml } from '@/lib/sanitize'
import { ensureUniqueSlug, slugify } from '@/lib/slug'
import {
  uploadApunteHtml,
  deleteApunteHtml,
  MAX_APUNTE_HTML_BYTES,
  APUNTE_HTML_MIME,
} from '@/lib/storage'
import { detectarRecurso, isValidHttpsUrl } from '@/lib/recursos'
import {
  compileReactArtifact,
  MAX_APUNTE_REACT_SOURCE_BYTES,
  type ReactArtifactExtension,
} from '@/lib/domain/apunte-artifact'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import {
  awardApunteCreated,
  adjustContributionScore,
  revokeApunteCreated,
} from '@/lib/contributions'
import { revalidateSubjectApuntes } from './shared'

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

  revalidateSubjectApuntes(scope)
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

  revalidateSubjectApuntes(scope)
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

  revalidateSubjectApuntes(scope)
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
