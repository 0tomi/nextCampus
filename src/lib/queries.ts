import 'server-only'
import { prisma } from './prisma'
import { countSubjectQuizBanks } from './storage'

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
            select: { id: true, slug: true, nombre: true, descripcion: true, driveUrl: true },
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
        select: {
          id: true,
          slug: true,
          nombre: true,
          agenda: {
            select: {
              id: true,
              eventos: {
                orderBy: { fecha: 'asc' },
                select: {
                  id: true,
                  titulo: true,
                  descripcionHtml: true,
                  fecha: true,
                  tipoEventoId: true,
                  tipoEvento: { select: { nombre: true } },
                },
              },
            },
          },
        },
      },
      career: { select: { nombre: true } },
    },
  })
}

export async function getSubjectPageBySlug(slug: string) {
  const result = await prisma.subject.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      nombre: true,
      descripcion: true,
      driveUrl: true,
      playlistUrl: true,
      playlistEnabled: true,
      year: {
        select: {
          id: true,
          slug: true,
          nombre: true,
          career: { select: { nombre: true } },
        },
      },
      agenda: {
        select: {
          id: true,
          eventos: {
            orderBy: { fecha: 'asc' },
            select: {
              id: true,
              titulo: true,
              descripcionHtml: true,
              fecha: true,
              tipoEventoId: true,
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
          recursos: {
            orderBy: { orden: 'asc' },
            select: {
              id: true,
              tipo: true,
              url: true,
              orden: true,
            },
          },
        },
      },
    },
  })
  return result
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
      year: { select: { id: true, slug: true } },
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
      apuntes: {
        orderBy: { createdAt: 'desc' },
        include: {
          recursos: { orderBy: { orden: 'asc' } },
        },
      },
    },
  })
}

export function getTiposEvento() {
  return prisma.tipoEvento.findMany({ orderBy: { nombre: 'asc' } })
}

export function getUpcomingEventsCrossYear(limit = 6) {
  return prisma.evento.findMany({
    where: { fecha: { gte: new Date() } },
    orderBy: { fecha: 'asc' },
    take: limit,
    select: {
      id: true,
      titulo: true,
      fecha: true,
      tipoEvento: { select: { nombre: true } },
      agenda: {
        select: {
          subject: {
            select: { slug: true, nombre: true },
          },
        },
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Impacto de eliminación — usado por ConfirmDeleteModal para mostrar conteos
// reales antes de que el admin confirme el borrado.
// ---------------------------------------------------------------------------

export interface SubjectDeleteImpact {
  subjectNombre: string
  eventosCount: number
  apuntesCount: number
  /** Cantidad de recursos multimedia (YouTube/Drive) ligados a los apuntes de esta materia. */
  recursosCount: number
  bancosCount: number
}

export async function getSubjectDeleteImpact(
  subjectId: string,
): Promise<SubjectDeleteImpact | null> {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      nombre: true,
      slug: true,
      year: { select: { slug: true } },
      agenda: {
        select: {
          _count: { select: { eventos: true } },
        },
      },
      _count: { select: { apuntes: true } },
    },
  })
  if (!subject) return null

  const [recursosCount, bancosCount] = await Promise.all([
    prisma.apunteRecurso.count({
      where: { apunte: { subjectId } },
    }),
    countSubjectQuizBanks(subject.year.slug, subject.slug),
  ])

  return {
    subjectNombre: subject.nombre,
    eventosCount: subject.agenda?._count.eventos ?? 0,
    apuntesCount: subject._count.apuntes,
    recursosCount,
    bancosCount,
  }
}

export interface YearDeleteImpact {
  yearNombre: string
  subjectsCount: number
  eventosCount: number
  apuntesCount: number
  /** Cantidad de recursos multimedia (YouTube/Drive) en los apuntes de todo el año. */
  recursosCount: number
  bancosCount: number
}

export async function getYearDeleteImpact(
  yearId: string,
): Promise<YearDeleteImpact | null> {
  const year = await prisma.academicYear.findUnique({
    where: { id: yearId },
    select: {
      nombre: true,
      slug: true,
      _count: { select: { subjects: true } },
      subjects: {
        select: {
          id: true,
          slug: true,
          agenda: { select: { _count: { select: { eventos: true } } } },
          _count: { select: { apuntes: true } },
        },
      },
    },
  })
  if (!year) return null

  let eventosCount = 0
  let apuntesCount = 0
  for (const s of year.subjects) {
    eventosCount += s.agenda?._count.eventos ?? 0
    apuntesCount += s._count.apuntes
  }

  const subjectIds = year.subjects.map((s) => s.id)
  const [recursosCount, bancosPerSubject] = await Promise.all([
    prisma.apunteRecurso.count({
      where: { apunte: { subjectId: { in: subjectIds } } },
    }),
    Promise.all(
      year.subjects.map((s) => countSubjectQuizBanks(year.slug, s.slug)),
    ),
  ])

  const bancosCount = bancosPerSubject.reduce((sum, n) => sum + n, 0)

  return {
    yearNombre: year.nombre,
    subjectsCount: year._count.subjects,
    eventosCount,
    apuntesCount,
    recursosCount,
    bancosCount,
  }
}
