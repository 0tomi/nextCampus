'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { sanitizeRichHtml } from '@/lib/sanitize'
import {
  uploadApuntePdf,
  deleteApuntePdf,
  uploadQuizBank,
  deleteQuizBank,
} from '@/lib/storage'
import { getSubjectQuizMeta } from '@/lib/queries'
import { parseQuizBank } from '@/lib/domain/quiz-bank'

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
  nombre: z.string().trim().min(1).max(120),
  json: z.string().min(1).max(2 * 1024 * 1024),
})

// Sube un banco de preguntas. Valida el JSON ANTES de tocar Storage (forma +
// semántica, sin eval). Devuelve estado para feedback en el modal.
export async function uploadQuizBankAction(
  _prev: QuizBankActionState,
  formData: FormData,
): Promise<QuizBankActionState> {
  const admin = await requireAdmin()

  const parsedForm = uploadBankSchema.safeParse({
    subjectSlug: formData.get('subjectSlug'),
    nombre: formData.get('nombre'),
    json: formData.get('json'),
  })
  if (!parsedForm.success) {
    return { ok: false, message: 'Completá el nombre y pegá el JSON del banco.' }
  }
  const { subjectSlug, nombre, json } = parsedForm.data

  const subject = await getSubjectQuizMeta(subjectSlug)
  if (!subject) {
    return { ok: false, message: 'Materia no encontrada.' }
  }

  const bank = parseQuizBank(json)
  if (!bank.ok) {
    return { ok: false, message: bank.error }
  }

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
  revalidatePath(`/admin/materia/${subjectSlug}`)
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
  revalidatePath(`/admin/materia/${subjectSlug}`)
}
