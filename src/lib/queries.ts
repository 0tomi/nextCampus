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

// Metadata mínima para resolver la key de Storage del banco de preguntas
// (quizzes/{anioSlug}/{materiaSlug}/...) y los títulos de la UI de quiz.
export function getSubjectQuizMeta(slug: string) {
  return prisma.subject.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      nombre: true,
      year: { select: { slug: true } },
    },
  })
}

export function getAdminSubjectBySlug(slug: string) {
  return prisma.subject.findUnique({
    where: { slug },
    include: {
      year: { select: { slug: true } },
      agenda: {
        include: {
          eventos: {
            orderBy: { fecha: 'asc' },
            include: { tipoEvento: true },
          },
        },
      },
      apuntes: { orderBy: { createdAt: 'desc' } },
    },
  })
}

export function getTiposEvento() {
  return prisma.tipoEvento.findMany({ orderBy: { nombre: 'asc' } })
}
