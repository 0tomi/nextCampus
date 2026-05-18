'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { sanitizeRichHtml } from '@/lib/sanitize'
import { uploadApuntePdf, deleteApuntePdf } from '@/lib/storage'

// Toda escritura: requireAdmin() (verifica JWT + allowlist) -> Zod -> sanitize.

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
  revalidatePath(`/materia/${data.subjectSlug}`)
}

export async function deleteEvento(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = z.string().min(1).parse(formData.get('id'))
  const subjectSlug = z.string().min(1).parse(formData.get('subjectSlug'))
  await prisma.evento.delete({ where: { id } })
  revalidatePath(`/materia/${subjectSlug}`)
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

  revalidatePath(`/materia/${data.subjectSlug}`)
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

  revalidatePath(`/materia/${subjectSlug}`)
}

const unidadSchema = z.object({
  subjectId: z.string().min(1),
  subjectSlug: z.string().min(1),
  titulo: z.string().min(1).max(200),
  orden: z.coerce.number().int().min(0).default(0),
})

export async function createQuizUnidad(formData: FormData): Promise<void> {
  await requireAdmin()
  const data = unidadSchema.parse({
    subjectId: formData.get('subjectId'),
    subjectSlug: formData.get('subjectSlug'),
    titulo: formData.get('titulo'),
    orden: formData.get('orden') ?? 0,
  })
  await prisma.quizUnidad.create({
    data: {
      subjectId: data.subjectId,
      titulo: data.titulo,
      orden: data.orden,
    },
  })
  revalidatePath(`/materia/${data.subjectSlug}`)
}

const preguntaSchema = z.object({
  quizUnidadId: z.string().min(1),
  subjectSlug: z.string().min(1),
  tipo: z.enum(['MULTIPLE_CHOICE', 'VERDADERO_FALSO', 'RESPUESTA_CORTA']),
  enunciado: z.string().min(1).max(2000),
  opciones: z.array(z.string().max(500)).max(10).default([]),
  respuestaCorrecta: z.string().min(1).max(500),
  explicacion: z.string().max(4000).default(''),
})

export async function createPregunta(formData: FormData): Promise<void> {
  await requireAdmin()
  const rawOpciones = formData.get('opciones')
  const opciones =
    typeof rawOpciones === 'string' && rawOpciones.trim().length > 0
      ? rawOpciones.split('\n').map((o) => o.trim()).filter(Boolean)
      : []

  const data = preguntaSchema.parse({
    quizUnidadId: formData.get('quizUnidadId'),
    subjectSlug: formData.get('subjectSlug'),
    tipo: formData.get('tipo'),
    enunciado: formData.get('enunciado'),
    opciones,
    respuestaCorrecta: formData.get('respuestaCorrecta'),
    explicacion: formData.get('explicacion') ?? '',
  })

  // Validación del contrato por tipo (ver schema.prisma para el contrato completo)
  if (data.tipo === 'VERDADERO_FALSO') {
    if (data.respuestaCorrecta !== 'true' && data.respuestaCorrecta !== 'false') {
      throw new Error('VALIDATION: Para V/F la respuesta debe ser "true" o "false"')
    }
  }
  if (data.tipo === 'MULTIPLE_CHOICE') {
    if (data.opciones.length < 2) {
      throw new Error('VALIDATION: MULTIPLE_CHOICE requiere al menos 2 opciones')
    }
    if (!data.opciones.includes(data.respuestaCorrecta)) {
      throw new Error('VALIDATION: La respuesta correcta debe ser una de las opciones')
    }
  }

  await prisma.pregunta.create({
    data: {
      quizUnidadId: data.quizUnidadId,
      tipo: data.tipo,
      enunciado: data.enunciado,
      opciones: data.opciones,
      respuestaCorrecta: data.respuestaCorrecta,
      explicacion: data.explicacion,
    },
  })
  revalidatePath(`/materia/${data.subjectSlug}`)
}
