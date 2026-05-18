import 'server-only'
import { prisma } from './prisma'

// Lecturas públicas (anónimas). Sin datos sensibles.

export function getCareer() {
  return prisma.career.findFirst({
    include: {
      years: {
        orderBy: { orden: 'asc' },
        include: { subjects: { orderBy: { nombre: 'asc' } } },
      },
    },
  })
}

export function getYearBySlug(slug: string) {
  return prisma.academicYear.findUnique({
    where: { slug },
    include: { subjects: { orderBy: { nombre: 'asc' } }, career: true },
  })
}

export function getSubjectBySlug(slug: string) {
  return prisma.subject.findUnique({
    where: { slug },
    include: {
      year: { include: { career: true } },
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
  })
}

export function getPreguntaById(id: string) {
  return prisma.pregunta.findUnique({ where: { id } })
}
