'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  requireGeneralAdmin,
  requireYearAdminForAgendaId,
  requireYearAdminForApunteId,
  requireYearAdminForEventoId,
  requireYearAdminForSubjectId,
  requireYearAdminForSubjectSlug,
  requireYearAdminForYearId,
} from '@/lib/auth'
import { sanitizeRichHtml } from '@/lib/sanitize'
import { slugify, uniqueSlug } from '@/lib/slug'
import {
  uploadQuizBank,
  deleteQuizBank,
  deleteSubjectStorage,
  deleteYearStorage,
} from '@/lib/storage'
import { detectarRecurso } from '@/lib/recursos'
import {
  getSubjectDeleteImpact,
  getYearDeleteImpact,
  type SubjectDeleteImpact,
  type YearDeleteImpact,
} from '@/lib/queries'
import { parseQuizBank } from '@/lib/domain/quiz-bank'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Toda escritura: auth específico (general o por año) -> Zod -> sanitize.

async function revalidateSubjectContent(subjectSlug: string): Promise<void> {
  revalidatePath(`/materia/${subjectSlug}`)
  revalidatePath(`/materia/${subjectSlug}/quiz`)
  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    select: { year: { select: { slug: true } } },
  })
  if (subject?.year?.slug) {
    revalidatePath(`/year/${subject.year.slug}`)
    revalidatePath(`/year/${subject.year.slug}/calendario`)
  }
}

const eventoSchema = z.object({
  agendaId: z.string().min(1),
  tipoEventoId: z.string().min(1),
  titulo: z.string().min(1).max(200),
  descripcionHtml: z.string().max(20000).default(''),
  fecha: z.coerce.date(),
})

export async function createEvento(formData: FormData): Promise<void> {
  const data = eventoSchema.parse({
    agendaId: formData.get('agendaId'),
    tipoEventoId: formData.get('tipoEventoId'),
    titulo: formData.get('titulo'),
    descripcionHtml: formData.get('descripcionHtml') ?? '',
    fecha: formData.get('fecha'),
  })
  const scope = await requireYearAdminForAgendaId(data.agendaId)
  if (!scope) throw new Error('Agenda no encontrada')

  await prisma.evento.create({
    data: {
      agendaId: data.agendaId,
      tipoEventoId: data.tipoEventoId,
      titulo: data.titulo,
      descripcionHtml: sanitizeRichHtml(data.descripcionHtml),
      fecha: data.fecha,
    },
  })
  await revalidateSubjectContent(scope.subjectSlug)
}

// Wrapper para useActionState en modales cliente
export interface EventoActionState {
  ok: boolean
  message: string
}

export async function createEventoAction(
  _prev: EventoActionState,
  formData: FormData,
): Promise<EventoActionState> {
  try {
    await createEvento(formData)
    return { ok: true, message: 'Evento creado correctamente.' }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, message: err.issues[0].message }
    }
    return { ok: false, message: 'No se pudo crear el evento. Intentá de nuevo.' }
  }
}

export async function updateEventoFechaAction(
  id: string,
  nuevaFecha: Date,
  _subjectSlug: string,
): Promise<{ ok: boolean }> {
  void _subjectSlug
  const validId = z.string().min(1).parse(id)
  const validFecha = z.coerce.date().parse(nuevaFecha)
  const scope = await requireYearAdminForEventoId(validId)
  if (!scope) return { ok: false }

  await prisma.evento.update({ where: { id: validId }, data: { fecha: validFecha } })
  await revalidateSubjectContent(scope.subjectSlug)
  return { ok: true }
}

export async function updateEventoAction(
  _prev: EventoActionState,
  formData: FormData,
): Promise<EventoActionState> {
  try {
    const id = z.string().min(1).parse(formData.get('id'))
    const data = eventoSchema.parse({
      agendaId: formData.get('agendaId'),
      tipoEventoId: formData.get('tipoEventoId'),
      titulo: formData.get('titulo'),
      descripcionHtml: formData.get('descripcionHtml') ?? '',
      fecha: formData.get('fecha'),
    })
    const scope = await requireYearAdminForEventoId(id)
    if (!scope) return { ok: false, message: 'No tenés permisos para modificar este evento.' }

    await prisma.evento.update({
      where: { id },
      data: {
        tipoEventoId: data.tipoEventoId,
        titulo: data.titulo,
        descripcionHtml: sanitizeRichHtml(data.descripcionHtml),
        fecha: data.fecha,
      },
    })
    await revalidateSubjectContent(scope.subjectSlug)
    return { ok: true, message: 'Evento actualizado correctamente.' }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, message: err.issues[0].message }
    }
    return { ok: false, message: 'No se pudo actualizar el evento. Intentá de nuevo.' }
  }
}

export async function deleteEvento(formData: FormData): Promise<void> {
  const id = z.string().min(1).parse(formData.get('id'))
  const scope = await requireYearAdminForEventoId(id)
  if (!scope) return

  await prisma.evento.delete({ where: { id } })
  await revalidateSubjectContent(scope.subjectSlug)
}

// Wrapper para useActionState en modal cliente
export interface ApunteActionState {
  ok: boolean
  message: string
}

const recursoSchema = z
  .object({
    url: z.string().url(),
    tipo: z.enum(['YOUTUBE', 'DRIVE']),
    orden: z.number().int().min(0).max(255),
  })
  .refine(
    (r) => {
      const detected = detectarRecurso(r.url)
      return detected !== null && detected.tipo === r.tipo
    },
    { message: 'URL no permitida o tipo inconsistente' },
  )

const apunteContentSchema = z.object({
  titulo: z.string().trim().min(1).max(200),
  descripcionHtml: z.string().max(20000).default(''),
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
})

function parseRecursosJson(raw: unknown): z.infer<typeof recursoSchema>[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return []
  try {
    return JSON.parse(raw) as z.infer<typeof recursoSchema>[]
  } catch {
    return null
  }
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

  const parsed = apunteContentSchema.safeParse({
    titulo: formData.get('titulo'),
    descripcionHtml: formData.get('descripcionHtml') ?? '',
    recursos: recursosRaw,
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }

  const { titulo, descripcionHtml, recursos } = parsed.data

  try {
    await prisma.apunte.create({
      data: {
        subjectId: subjectId.data,
        titulo,
        descripcionHtml: sanitizeRichHtml(descripcionHtml),
        recursos: {
          create: recursos.map((r) => ({
            tipo: r.tipo,
            url: r.url,
            orden: r.orden,
          })),
        },
      },
    })
  } catch {
    return { ok: false, message: 'No se pudo crear el apunte. Intentá de nuevo.' }
  }

  await revalidateSubjectContent(scope.subjectSlug)
  return { ok: true, message: 'Apunte creado correctamente.' }
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

  const parsed = apunteContentSchema.safeParse({
    titulo: formData.get('titulo'),
    descripcionHtml: formData.get('descripcionHtml') ?? '',
    recursos: recursosRaw,
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }

  const { titulo, descripcionHtml, recursos } = parsed.data

  try {
    await prisma.$transaction(async (tx) => {
      await tx.apunte.update({
        where: { id: apunteId.data },
        data: {
          titulo,
          descripcionHtml: sanitizeRichHtml(descripcionHtml),
        },
      })
      await tx.apunteRecurso.deleteMany({ where: { apunteId: apunteId.data } })
      await tx.apunteRecurso.createMany({
        data: recursos.map((r) => ({
          apunteId: apunteId.data,
          tipo: r.tipo,
          url: r.url,
          orden: r.orden,
        })),
      })
    })
  } catch {
    return { ok: false, message: 'No se pudo actualizar el apunte. Intentá de nuevo.' }
  }

  await revalidateSubjectContent(scope.subjectSlug)
  return { ok: true, message: 'Apunte actualizado correctamente.' }
}

export async function deleteApunteAction(formData: FormData): Promise<void> {
  const id = z.string().min(1).parse(formData.get('id'))
  const scope = await requireYearAdminForApunteId(id)
  if (!scope) return

  // La FK con onDelete: Cascade borra los ApunteRecurso automáticamente.
  await prisma.apunte.delete({ where: { id } })

  await revalidateSubjectContent(scope.subjectSlug)
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
    })
  } catch {
    return {
      ok: false,
      message: 'No se pudo guardar el banco. Probá de nuevo.',
    }
  }

  await revalidateSubjectContent(scope.subjectSlug)
  return {
    ok: true,
    message: `Banco "${nombre}" cargado (${bank.totalPreguntas} preguntas).`,
  }
}

export async function deleteQuizBankAction(formData: FormData): Promise<void> {
  const subjectSlug = z.string().min(1).parse(formData.get('subjectSlug'))
  const bankId = z.uuid().parse(formData.get('bankId'))
  const scope = await requireYearAdminForSubjectSlug(subjectSlug)
  if (!scope) return

  await deleteQuizBank(scope.yearSlug, scope.subjectSlug, bankId)
  await revalidateSubjectContent(scope.subjectSlug)
}

// --- ABM Años académicos ---------------------------------------------------

export interface YearActionState {
  ok: boolean
  message: string
}

const yearSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  orden: z.coerce
    .number()
    .int('El orden debe ser un número entero')
    .min(1, 'El orden debe ser mayor a 0'),
})

export async function createYearAction(
  _prev: YearActionState,
  formData: FormData,
): Promise<YearActionState> {
  await requireGeneralAdmin()

  const parsed = yearSchema.safeParse({
    nombre: formData.get('nombre'),
    orden: formData.get('orden'),
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const { nombre, orden } = parsed.data

  const career = await prisma.career.findFirst({ select: { id: true } })
  if (!career) {
    return { ok: false, message: 'No existe una carrera configurada.' }
  }

  const existingSlugs = await prisma.academicYear.findMany({
    select: { slug: true },
  })
  const takenSlugs = new Set(existingSlugs.map((y) => y.slug))
  const base = slugify(nombre)
  const slug = uniqueSlug(base, takenSlugs)

  await prisma.academicYear.create({
    data: { nombre, slug, orden, careerId: career.id },
  })

  revalidatePath('/')
  return { ok: true, message: 'Año creado correctamente.' }
}

export async function updateYearAction(
  _prev: YearActionState,
  formData: FormData,
): Promise<YearActionState> {
  await requireGeneralAdmin()

  const id = z.string().min(1).parse(formData.get('id'))

  const parsed = yearSchema.safeParse({
    nombre: formData.get('nombre'),
    orden: formData.get('orden'),
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const { nombre, orden } = parsed.data

  const year = await prisma.academicYear.findUnique({
    where: { id },
    select: { slug: true },
  })
  if (!year) return { ok: false, message: 'Año no encontrado.' }

  const oldSlug = year.slug

  const existingSlugs = await prisma.academicYear.findMany({
    where: { id: { not: id } },
    select: { slug: true },
  })
  const takenSlugs = new Set(existingSlugs.map((y) => y.slug))
  const base = slugify(nombre)
  const newSlug = uniqueSlug(base, takenSlugs)

  await prisma.academicYear.update({
    where: { id },
    data: { nombre, slug: newSlug, orden },
  })

  revalidatePath('/')
  revalidatePath(`/year/${oldSlug}`)
  revalidatePath(`/year/${oldSlug}/calendario`)
  if (newSlug !== oldSlug) {
    revalidatePath(`/year/${newSlug}`)
    revalidatePath(`/year/${newSlug}/calendario`)
  }
  return { ok: true, message: 'Año actualizado correctamente.' }
}

export async function deleteYearAction(formData: FormData): Promise<void> {
  await requireGeneralAdmin()
  const id = z.string().min(1).parse(formData.get('id'))

  // Capturar toda la info ANTES de borrar (la cascada elimina los registros)
  const year = await prisma.academicYear.findUnique({
    where: { id },
    select: {
      slug: true,
      subjects: { select: { slug: true } },
    },
  })
  if (!year) return

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

  revalidatePath('/')
  revalidatePath(`/year/${year.slug}`)
}

// Acción para obtener el impacto de eliminar un año (usada por el modal)
export async function getYearDeleteImpactAction(
  formData: FormData,
): Promise<YearDeleteImpact | null> {
  await requireGeneralAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  return getYearDeleteImpact(id)
}

// --- ABM Materias ----------------------------------------------------------

export interface SubjectActionState {
  ok: boolean
  message: string
}

const subjectSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(200),
  descripcion: z.string().trim().max(500).default(''),
  driveUrl: z.string().trim().url('El enlace de Drive debe ser una URL válida').or(z.literal('')).nullable().optional(),
})

export async function createSubjectAction(
  _prev: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  const yearId = z.string().min(1).parse(formData.get('yearId'))
  await requireYearAdminForYearId(yearId)

  const parsed = subjectSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
    driveUrl: formData.get('driveUrl') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const { nombre, descripcion, driveUrl } = parsed.data

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

  // Crear materia + Agenda 1:1 en una transacción
  await prisma.$transaction(async (tx) => {
    const subject = await tx.subject.create({
      data: { nombre, slug, descripcion, driveUrl: driveUrl || null, yearId },
    })
    await tx.agenda.create({ data: { subjectId: subject.id } })
  })

  revalidatePath('/')
  revalidatePath(`/year/${year.slug}`)
  revalidatePath(`/year/${year.slug}/calendario`)
  return { ok: true, message: 'Materia creada correctamente.' }
}

const updateSubjectSchema = subjectSchema.extend({
  playlistUrl: z.string().trim().url().or(z.literal('')).nullable().optional(),
  playlistEnabled: z.coerce.boolean().default(false),
})

export async function updateSubjectAction(
  _prev: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  const id = z.string().min(1).parse(formData.get('id'))
  const scope = await requireYearAdminForSubjectId(id)
  if (!scope) return { ok: false, message: 'Materia no encontrada.' }

  const parsed = updateSubjectSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
    driveUrl: formData.get('driveUrl') ?? '',
    playlistUrl: formData.get('playlistUrl') ?? '',
    playlistEnabled: formData.get('playlistEnabled'),
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const { nombre, descripcion, driveUrl, playlistUrl, playlistEnabled } = parsed.data

  // Validar que playlistUrl sea de YouTube si se provee
  const normalizedPlaylistUrl = playlistUrl || null
  if (normalizedPlaylistUrl) {
    const detected = detectarRecurso(normalizedPlaylistUrl)
    if (!detected || detected.tipo !== 'YOUTUBE') {
      return { ok: false, message: 'La playlist debe ser un enlace de YouTube válido.' }
    }
  }

  const oldSlug = scope.subjectSlug

  const existingSlugs = await prisma.subject.findMany({
    where: { id: { not: id } },
    select: { slug: true },
  })
  const takenSlugs = new Set(existingSlugs.map((s) => s.slug))
  const base = slugify(nombre)
  const newSlug = uniqueSlug(base, takenSlugs)

  await prisma.subject.update({
    where: { id },
    data: {
      nombre,
      slug: newSlug,
      descripcion,
      driveUrl: driveUrl || null,
      playlistUrl: normalizedPlaylistUrl,
      playlistEnabled,
    },
  })

  revalidatePath('/')
  revalidatePath(`/year/${scope.yearSlug}`)
  revalidatePath(`/year/${scope.yearSlug}/calendario`)
  revalidatePath(`/materia/${oldSlug}`)
  if (newSlug !== oldSlug) revalidatePath(`/materia/${newSlug}`)
  return { ok: true, message: 'Materia actualizada correctamente.' }
}

export async function deleteSubjectAction(formData: FormData): Promise<void> {
  const id = z.string().min(1).parse(formData.get('id'))

  const scope = await requireYearAdminForSubjectId(id)
  if (!scope) return

  const { subjectSlug, yearSlug } = scope

  // Limpiar Storage ANTES de borrar en BD
  try {
    await deleteSubjectStorage(yearSlug, subjectSlug)
  } catch {
    console.error(`Storage cleanup parcial para materia ${subjectSlug}`)
  }

  await prisma.subject.delete({ where: { id } })

  revalidatePath('/')
  revalidatePath(`/year/${yearSlug}`)
  revalidatePath(`/year/${yearSlug}/calendario`)
  revalidatePath(`/materia/${subjectSlug}`)
}

// Acción para obtener el impacto de eliminar una materia (usada por el modal)
export async function getSubjectDeleteImpactAction(
  formData: FormData,
): Promise<SubjectDeleteImpact | null> {
  const id = z.string().min(1).parse(formData.get('id'))
  const scope = await requireYearAdminForSubjectId(id)
  if (!scope) return null

  return getSubjectDeleteImpact(id)
}

export async function updateSubjectDriveUrlAction(
  subjectId: string,
  driveUrl: string | null,
  _subjectSlug: string,
): Promise<SubjectActionState> {
  void _subjectSlug
  const urlSchema = z
    .string()
    .trim()
    .url('El enlace de Drive debe ser una URL válida')
    .or(z.literal(''))
    .nullable()
    .optional()

  const parsed = urlSchema.safeParse(driveUrl)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }

  const normalizedDriveUrl = parsed.data || null
  const validSubjectId = z.string().min(1).parse(subjectId)
  const scope = await requireYearAdminForSubjectId(validSubjectId)
  if (!scope) return { ok: false, message: 'Materia no encontrada.' }

  await prisma.subject.update({
    where: { id: validSubjectId },
    data: { driveUrl: normalizedDriveUrl },
  })

  revalidatePath('/')
  revalidatePath(`/year/${scope.yearSlug}`)
  revalidatePath(`/year/${scope.yearSlug}/calendario`)
  revalidatePath(`/materia/${scope.subjectSlug}`)

  return { ok: true, message: 'Enlace de Google Drive actualizado correctamente.' }
}

// Edición rápida de la playlist (espejo de updateSubjectDriveUrlAction).
// Firma: (subjectId, playlistUrl | null, playlistEnabled, _subjectSlug)
export async function updateSubjectPlaylistAction(
  subjectId: string,
  playlistUrl: string | null,
  playlistEnabled: boolean,
  _subjectSlug: string,
): Promise<SubjectActionState> {
  void _subjectSlug

  const urlParsed = z
    .string()
    .trim()
    .url()
    .or(z.literal(''))
    .nullable()
    .optional()
    .safeParse(playlistUrl)
  if (!urlParsed.success) {
    return { ok: false, message: 'El enlace de la playlist no es válido.' }
  }

  const normalizedPlaylistUrl = urlParsed.data || null
  if (normalizedPlaylistUrl) {
    const detected = detectarRecurso(normalizedPlaylistUrl)
    if (!detected || detected.tipo !== 'YOUTUBE') {
      return { ok: false, message: 'La playlist debe ser un enlace de YouTube válido.' }
    }
  }

  const validSubjectId = z.string().min(1).parse(subjectId)
  const scope = await requireYearAdminForSubjectId(validSubjectId)
  if (!scope) return { ok: false, message: 'Materia no encontrada.' }

  await prisma.subject.update({
    where: { id: validSubjectId },
    data: { playlistUrl: normalizedPlaylistUrl, playlistEnabled },
  })

  revalidatePath('/')
  revalidatePath(`/year/${scope.yearSlug}`)
  revalidatePath(`/year/${scope.yearSlug}/calendario`)
  revalidatePath(`/materia/${scope.subjectSlug}`)

  return { ok: true, message: 'Playlist actualizada correctamente.' }
}

// --- Sesión ----------------------------------------------------------------

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}
