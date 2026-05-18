import 'server-only'
import { prisma } from './prisma'

// Lecturas públicas (anónimas). Sin datos sensibles.

export function getCareer() {
  return prisma.career.findFirst({
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      years: {
        orderBy: { orden: 'asc' },
        select: {
          id: true,
          slug: true,
          nombre: true,
          subjects: {
            orderBy: { nombre: 'asc' },
            select: { id: true, slug: true, nombre: true },
          },
        },
      },
    },
  })
}

export function getYearBySlug(slug: string) {
  return prisma.academicYear.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      nombre: true,
      subjects: {
        orderBy: { nombre: 'asc' },
        select: { id: true, slug: true, nombre: true },
      },
      career: { select: { nombre: true } },
    },
  })
}

export function getSubjectPageBySlug(slug: string) {
  return prisma.subject.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      nombre: true,
      year: {
        select: {
          slug: true,
          nombre: true,
          career: { select: { nombre: true } },
        },
      },
      agenda: {
        select: {
          eventos: {
            orderBy: { fecha: 'asc' },
            select: {
              id: true,
              titulo: true,
              descripcionHtml: true,
              fecha: true,
              tipoEvento: { select: { nombre: true } },
            },
          },
        },
      },
      quizUnidades: {
        orderBy: { orden: 'asc' },
        select: {
          id: true,
          titulo: true,
          _count: { select: { preguntas: true } },
        },
      },
      apuntes: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          titulo: true,
          descripcionHtml: true,
          pdfObjectKey: true,
        },
      },
    },
  })
}

export function getSubjectQuizBySlug(slug: string) {
  return prisma.subject.findUnique({
    where: { slug },
    select: {
      id: true,
      nombre: true,
      quizUnidades: {
        orderBy: { orden: 'asc' },
        select: {
          id: true,
          titulo: true,
          _count: { select: { preguntas: true } },
        },
      },
    },
  })
}

export function getSubjectQuizUnitIdsBySlug(slug: string) {
  return prisma.subject.findUnique({
    where: { slug },
    select: {
      quizUnidades: {
        select: { id: true },
      },
    },
  })
}

export function getAdminSubjectBySlug(slug: string) {
  return prisma.subject.findUnique({
    where: { slug },
    include: {
      agenda: {
        include: {
          eventos: {
            orderBy: { fecha: 'asc' },
            include: { tipoEvento: true },
          },
        },
      },
      quizUnidades: {
        orderBy: { orden: 'asc' },
        include: { _count: { select: { preguntas: true } } },
      },
      apuntes: { orderBy: { createdAt: 'desc' } },
    },
  })
}

export function getTiposEvento() {
  return prisma.tipoEvento.findMany({ orderBy: { nombre: 'asc' } })
}

export function getPreguntasByUnidades(quizUnidadIds: string[]) {
  return prisma.pregunta.findMany({
    where: { quizUnidadId: { in: quizUnidadIds } },
    select: {
      id: true,
      tipo: true,
      enunciado: true,
      opciones: true,
      respuestaCorrecta: true,
      explicacion: true,
    },
  })
}

export function getPreguntasByIds(ids: string[]) {
  return prisma.pregunta.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      tipo: true,
      enunciado: true,
      opciones: true,
      respuestaCorrecta: true,
      explicacion: true,
    },
  })
}

export function getPreguntaById(id: string) {
  return prisma.pregunta.findUnique({
    where: { id },
    select: {
      id: true,
      tipo: true,
      enunciado: true,
      opciones: true,
      respuestaCorrecta: true,
      explicacion: true,
    },
  })
}
