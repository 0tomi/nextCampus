'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { sanitizeRichHtml } from '@/lib/sanitize'
import { slugify, uniqueSlug } from '@/lib/slug'
import {
  uploadApuntePdf,
  deleteApuntePdf,
  uploadQuizBank,
  deleteQuizBank,
  deleteSubjectStorage,
  deleteYearStorage,
} from '@/lib/storage'
import {
  getSubjectQuizMeta,
  getSubjectDeleteImpact,
  getYearDeleteImpact,
  type SubjectDeleteImpact,
  type YearDeleteImpact,
} from '@/lib/queries'
import { parseQuizBank } from '@/lib/domain/quiz-bank'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Toda escritura: requireAdmin() (verifica JWT + allowlist) -> Zod -> sanitize.

function revalidateSubjectContent(subjectSlug: string): void {
  revalidatePath(`/materia/${subjectSlug}`)
  revalidatePath(`/materia/${subjectSlug}/quiz`)
}

const eventoSchema = z.object({
  agendaId: z.string().min(1),
  tipoEventoId: z.string().min(1),
  titulo: z.string().min(1).max(200),
  descripcionHtml: z.string().max(20000).default(''),
  fecha: z.coerce.date(),
  subjectSlug: z.string().min(1),
})

export async function createEvento(formData: FormData): Promise<void> {
  await requireAdmin()
  const data = eventoSchema.parse({
    agendaId: formData.get('agendaId'),
    tipoEventoId: formData.get('tipoEventoId'),
    titulo: formData.get('titulo'),
    descripcionHtml: formData.get('descripcionHtml') ?? '',
    fecha: formData.get('fecha'),
    subjectSlug: formData.get('subjectSlug'),
  })
  await prisma.evento.create({
    data: {
      agendaId: data.agendaId,
      tipoEventoId: data.tipoEventoId,
      titulo: data.titulo,
      descripcionHtml: sanitizeRichHtml(data.descripcionHtml),
      fecha: data.fecha,
    },
  })
  revalidateSubjectContent(data.subjectSlug)
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
  subjectSlug: string,
): Promise<{ ok: boolean }> {
  await requireAdmin()
  const validId = z.string().min(1).parse(id)
  const validFecha = z.coerce.date().parse(nuevaFecha)
  const validSlug = z.string().min(1).parse(subjectSlug)
  await prisma.evento.update({ where: { id: validId }, data: { fecha: validFecha } })
  revalidateSubjectContent(validSlug)
  return { ok: true }
}

export async function deleteEvento(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const subjectSlug = z.string().min(1).parse(formData.get('subjectSlug'))
  await prisma.evento.delete({ where: { id } })
  revalidateSubjectContent(subjectSlug)
}

const apunteSchema = z.object({
  subjectId: z.string().min(1),
  subjectSlug: z.string().min(1),
  titulo: z.string().min(1).max(200),
  descripcionHtml: z.string().max(20000).default(''),
})

export async function createApunte(formData: FormData): Promise<void> {
  await requireAdmin()
  const data = apunteSchema.parse({
    subjectId: formData.get('subjectId'),
    subjectSlug: formData.get('subjectSlug'),
    titulo: formData.get('titulo'),
    descripcionHtml: formData.get('descripcionHtml') ?? '',
  })

  // DB-first: crear la fila sin PDF; solo después subir el archivo.
  // Si la subida falla, borramos la fila como compensación (Storage no participa
  // en transacciones SQL, así que este es el único patrón seguro).
  const apunte = await prisma.apunte.create({
    data: {
      subjectId: data.subjectId,
      titulo: data.titulo,
      descripcionHtml: sanitizeRichHtml(data.descripcionHtml),
      pdfObjectKey: null,
    },
  })

  const file = formData.get('pdf')
  if (file instanceof File && file.size > 0) {
    let pdfObjectKey: string
    try {
      pdfObjectKey = await uploadApuntePdf(file, data.subjectSlug)
    } catch (err) {
      await prisma.apunte.delete({ where: { id: apunte.id } })
      throw err
    }
    await prisma.apunte.update({ where: { id: apunte.id }, data: { pdfObjectKey } })
  }

  revalidateSubjectContent(data.subjectSlug)
}

// Wrapper para useActionState en modal cliente
export interface ApunteActionState {
  ok: boolean
  message: string
}

export async function createApunteAction(
  _prev: ApunteActionState,
  formData: FormData,
): Promise<ApunteActionState> {
  try {
    await createApunte(formData)
    return { ok: true, message: 'Apunte creado correctamente.' }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, message: err.issues[0].message }
    }
    return { ok: false, message: 'No se pudo crear el apunte. Intentá de nuevo.' }
  }
}

export async function deleteApunte(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const subjectSlug = z.string().min(1).parse(formData.get('subjectSlug'))
  const apunte = await prisma.apunte.findUnique({ where: { id } })

  // DB-first: borrar la fila antes de tocar Storage. Si el delete de Storage falla,
  // la fila ya no existe en DB (correcto); el objeto huérfano queda para limpieza manual.
  await prisma.apunte.delete({ where: { id } })

  if (apunte?.pdfObjectKey) {
    try {
      await deleteApuntePdf(apunte.pdfObjectKey)
    } catch {
      console.error(`Storage cleanup pendiente para key: ${apunte.pdfObjectKey}`)
    }
  }

  revalidateSubjectContent(subjectSlug)
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
  const admin = await requireAdmin()

  const parsedForm = uploadBankSchema.safeParse({
    subjectSlug: formData.get('subjectSlug'),
    json: formData.get('json'),
  })
  if (!parsedForm.success) {
    return { ok: false, message: 'Seleccioná un archivo de preguntas válido.' }
  }
  const { subjectSlug, json } = parsedForm.data

  const subject = await getSubjectQuizMeta(subjectSlug)
  if (!subject) {
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
      yearSlug: subject.year.slug,
      subjectSlug: subject.slug,
      nombre,
      // Re-serializa la versión validada/normalizada (descarta basura extra).
      rawJson: JSON.stringify(bank.bank),
      totalPreguntas: bank.totalPreguntas,
      subidoPor: admin.email,
    })
  } catch {
    return {
      ok: false,
      message: 'No se pudo guardar el banco. Probá de nuevo.',
    }
  }

  revalidateSubjectContent(subjectSlug)
  return {
    ok: true,
    message: `Banco "${nombre}" cargado (${bank.totalPreguntas} preguntas).`,
  }
}

export async function deleteQuizBankAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const subjectSlug = z.string().min(1).parse(formData.get('subjectSlug'))
  const bankId = z.string().min(1).max(64).parse(formData.get('bankId'))
  const subject = await getSubjectQuizMeta(subjectSlug)
  if (!subject) return
  await deleteQuizBank(subject.year.slug, subject.slug, bankId)
  revalidateSubjectContent(subjectSlug)
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
  await requireAdmin()

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
  await requireAdmin()

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
  if (newSlug !== oldSlug) revalidatePath(`/year/${newSlug}`)
  return { ok: true, message: 'Año actualizado correctamente.' }
}

export async function deleteYearAction(formData: FormData): Promise<void> {
  await requireAdmin()
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
  await requireAdmin()
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
})

export async function createSubjectAction(
  _prev: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  await requireAdmin()

  const yearId = z.string().min(1).parse(formData.get('yearId'))

  const parsed = subjectSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const { nombre, descripcion } = parsed.data

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
      data: { nombre, slug, descripcion, yearId },
    })
    await tx.agenda.create({ data: { subjectId: subject.id } })
  })

  revalidatePath('/')
  revalidatePath(`/year/${year.slug}`)
  return { ok: true, message: 'Materia creada correctamente.' }
}

export async function updateSubjectAction(
  _prev: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  await requireAdmin()

  const id = z.string().min(1).parse(formData.get('id'))

  const parsed = subjectSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message }
  }
  const { nombre, descripcion } = parsed.data

  const subject = await prisma.subject.findUnique({
    where: { id },
    select: { slug: true, year: { select: { slug: true } } },
  })
  if (!subject) return { ok: false, message: 'Materia no encontrada.' }

  const oldSlug = subject.slug

  const existingSlugs = await prisma.subject.findMany({
    where: { id: { not: id } },
    select: { slug: true },
  })
  const takenSlugs = new Set(existingSlugs.map((s) => s.slug))
  const base = slugify(nombre)
  const newSlug = uniqueSlug(base, takenSlugs)

  await prisma.subject.update({
    where: { id },
    data: { nombre, slug: newSlug, descripcion },
  })

  revalidatePath('/')
  revalidatePath(`/year/${subject.year.slug}`)
  revalidatePath(`/materia/${oldSlug}`)
  if (newSlug !== oldSlug) revalidatePath(`/materia/${newSlug}`)
  return { ok: true, message: 'Materia actualizada correctamente.' }
}

export async function deleteSubjectAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))

  // Capturar slugs ANTES de borrar
  const subject = await prisma.subject.findUnique({
    where: { id },
    select: {
      slug: true,
      year: { select: { slug: true } },
    },
  })
  if (!subject) return

  const { slug: subjectSlug, year } = subject

  // Limpiar Storage ANTES de borrar en BD
  try {
    await deleteSubjectStorage(year.slug, subjectSlug)
  } catch {
    console.error(`Storage cleanup parcial para materia ${subjectSlug}`)
  }

  await prisma.subject.delete({ where: { id } })

  revalidatePath('/')
  revalidatePath(`/year/${year.slug}`)
  revalidatePath(`/materia/${subjectSlug}`)
}

// Acción para obtener el impacto de eliminar una materia (usada por el modal)
export async function getSubjectDeleteImpactAction(
  formData: FormData,
): Promise<SubjectDeleteImpact | null> {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  return getSubjectDeleteImpact(id)
}

// --- Sesión ----------------------------------------------------------------

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/')
}
