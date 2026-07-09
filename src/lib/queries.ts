import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { Prisma } from '../../prisma/generated/client/client'
import { prisma } from './prisma'
import { countSubjectQuizBanks } from './storage'
import { isPeriodoTone } from './periodos'
import { todayKeyAR } from './utils'

// Una fecha "calendario" (sin hora) no es un instante: serializarla como Date
// arrastra el bug de zona horaria (medianoche UTC se ve como el día anterior en
// AR). Por eso la mandamos al cliente como string "YYYY-MM-DD" y la hora como
// "HH:mm" | null aparte. `@db.Date` devuelve un Date a medianoche UTC, así que
// `toISOString().slice(0,10)` extrae el día correcto sin tocar zonas horarias.
const toDateKey = (d: Date): string => d.toISOString().slice(0, 10)

// Inicio del día calendario ACTUAL en zona AR, expresado como Date a medianoche
// UTC para comparar contra una columna `@db.Date`. Evita que los eventos de hoy
// "desaparezcan" de próximos al avanzar la hora del reloj.
function arTodayBoundary(): Date {
  const ar = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  return new Date(`${ar}T00:00:00.000Z`)
}

// Orden canónico de eventos: por día y, dentro del día, por hora. Los eventos
// sin hora van PRIMERO (nulls first).
const eventoOrderBy: Prisma.EventoOrderByWithRelationInput[] = [
  { fecha: 'asc' },
  { hora: { sort: 'asc', nulls: 'first' } },
]

const eventoSelect = {
  id: true,
  titulo: true,
  descripcionHtml: true,
  fecha: true,
  hora: true,
  createdByUserId: true,
  createdBy: { select: { nombreUsuario: true } },
  tipoEventoId: true,
  tipoEvento: { select: { nombre: true } },
  apuntes: {
    orderBy: { createdAt: 'asc' },
    select: {
      apunte: {
        select: {
          id: true,
          titulo: true,
          slug: true,
          subject: {
            select: {
              slug: true,
              year: { select: { slug: true } },
            },
          },
        },
      },
    },
  },
} as const

const agendaWithEventosSelect = {
  id: true,
  commissionId: true,
  commission: {
    select: {
      id: true,
      slug: true,
      nombre: true,
    },
  },
  eventos: {
    orderBy: eventoOrderBy,
    select: eventoSelect,
  },
} as const

type QueryCommission = {
  id: string
  slug: string
  nombre: string
}

// Shape de salida (consumida por componentes): fecha como string "YYYY-MM-DD".
type QueryEvent = {
  id: string
  titulo: string
  descripcionHtml: string
  fecha: string
  hora: string | null
  createdByUserId: string | null
  createdByNombre: string | null
  tipoEventoId: string
  tipoEvento: {
    nombre: string
  }
  apuntes: RelatedApunte[]
}

type RelatedApunte = {
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

// Shape cruda (lo que devuelve Prisma): fecha como Date a medianoche UTC y pivot
// ApunteEvento envolviendo el apunte.
type RawQueryEvent = Omit<QueryEvent, 'fecha' | 'apuntes' | 'createdByNombre'> & {
  fecha: Date
  createdBy: { nombreUsuario: string } | null
  apuntes: Array<{ apunte: RelatedApunte }>
}

type QueryEventWithCommissionMetadata = QueryEvent & {
  commissionId: string | null
  commission: QueryCommission | null
}

type RawQueryAgenda = {
  id: string
  commissionId: string | null
  commission: QueryCommission | null
  eventos: RawQueryEvent[]
}

type QueryAgenda = Omit<RawQueryAgenda, 'eventos'> & {
  eventos: QueryEvent[]
}

type QueryAgendaWithCommissionMetadata = Omit<QueryAgenda, 'eventos'> & {
  isGeneral: boolean
  eventos: QueryEventWithCommissionMetadata[]
}

type SubjectWithCommissionMetadata<
  T extends {
    agendas: RawQueryAgenda[]
    commissions: QueryCommission[]
  },
> = Omit<T, 'agendas' | 'commissions'> & {
  agenda: QueryAgendaWithCommissionMetadata | null
  agendaGeneral: QueryAgendaWithCommissionMetadata | null
  agendas: QueryAgendaWithCommissionMetadata[]
  commissions: Array<T['commissions'][number] & { agenda: QueryAgendaWithCommissionMetadata | null }>
}

function attachCommissionMetadataToAgenda(
  agenda: RawQueryAgenda,
): QueryAgendaWithCommissionMetadata {

  const commission = agenda.commission ?? null

  return {
    ...agenda,
    isGeneral: agenda.commissionId === null,
    eventos: agenda.eventos.map((evento) => ({
      ...evento,
      fecha: toDateKey(evento.fecha),
      createdByNombre: evento.createdBy?.nombreUsuario ?? null,
      apuntes: evento.apuntes.map(({ apunte }) => apunte),
      commissionId: agenda.commissionId,
      commission,
    })),
  }
}

function attachCommissionMetadataToSubject<
  T extends {
    agendas: RawQueryAgenda[]
    commissions: QueryCommission[]
  },
>(subject: T): SubjectWithCommissionMetadata<T> {
  const agendas = subject.agendas.map((agenda) => attachCommissionMetadataToAgenda(agenda))
  const agendaGeneral = agendas.find((agenda) => agenda.commissionId === null) ?? null
  const agendasByCommissionId = new Map(
    agendas
      .filter((agenda) => agenda.commissionId !== null)
      .map((agenda) => [agenda.commissionId, agenda] as const),
  )

  return {
    ...subject,
    agenda: agendaGeneral,
    agendaGeneral,
    agendas,
    commissions: subject.commissions.map((commission) => ({
      ...commission,
      agenda: agendasByCommissionId.get(commission.id) ?? null,
    })),
  }
}

// Lecturas públicas (anónimas). Sin datos sensibles.
//
// Cacheamos las lecturas públicas por función y las invalidamos quirúrgicamente
// desde las server actions mediante tags.

const TAGS = {
  career: 'career',
  categorias: 'categorias-apunte',
  latestApuntes: 'latest-apuntes',
  tiposEvento: 'tipos-evento',
  year: (slug: string) => `year:${slug}`,
  subject: (slug: string) => `subject:${slug}`,
  upcomingEvents: 'upcoming-events',
  periodos: 'periodos',
} as const

export const queryTags = TAGS

export const APUNTES_PAGE_SIZE = 15

const categoriaSelect = {
  id: true,
  nombre: true,
} as const

const apunteCardSelect = {
  id: true,
  titulo: true,
  slug: true,
  descripcionHtml: true,
  createdAt: true,
  createdByUserId: true,
  recursos: {
    orderBy: { orden: 'asc' },
    select: {
      id: true,
      tipo: true,
      url: true,
      orden: true,
      nombre: true,
      storageKey: true,
      mimeType: true,
      sizeBytes: true,
    },
  },
  categorias: {
    select: {
      categoria: { select: categoriaSelect },
    },
    orderBy: { categoria: { nombre: 'asc' } },
  },
} as const

export type ApunteListItem = Awaited<ReturnType<typeof getApuntesPage>>['items'][number]
export type CategoriaListItem = { id: string; nombre: string }

function serializeApunteCard(apunte: Prisma.ApunteGetPayload<{ select: typeof apunteCardSelect }>) {
  return {
    ...apunte,
    createdAt: apunte.createdAt.toISOString(),
    categorias: apunte.categorias.map(({ categoria }) => categoria),
  }
}

export async function getCareer() {
  'use cache'
  cacheTag(TAGS.career)
  cacheLife({ revalidate: 3600, expire: 86400 })

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
          descripcion: true,
          orden: true,
          color: true,
          links: {
            select: { id: true, label: true, url: true, orden: true },
            orderBy: { orden: 'asc' },
          },
          subjects: {
            orderBy: { nombre: 'asc' },
            select: {
              id: true,
              slug: true,
              nombre: true,
              descripcion: true,
              links: {
                select: { id: true, label: true, url: true, orden: true },
                orderBy: { orden: 'asc' },
              },
              commissions: {
                orderBy: { nombre: 'asc' },
                select: { id: true, slug: true, nombre: true },
              },
            },
          },
        },
      },
    },
  })
}

export async function getYearBySlug(slug: string) {
  'use cache'
  cacheTag(TAGS.year(slug), TAGS.career)
  cacheLife({ revalidate: 3600, expire: 86400 })

  const year = await prisma.academicYear.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      nombre: true,
      descripcion: true,
      color: true,
      links: {
        select: { id: true, label: true, url: true, orden: true },
        orderBy: { orden: 'asc' },
      },
      subjects: {
        orderBy: { nombre: 'asc' },
        select: {
          id: true,
          slug: true,
          nombre: true,
          agendas: {
            orderBy: { createdAt: 'asc' },
            select: agendaWithEventosSelect,
          },
          commissions: {
            orderBy: { nombre: 'asc' },
            select: {
              id: true,
              slug: true,
              nombre: true,
            },
          },
        },
      },
      career: { select: { nombre: true } },
    },
  })

  if (!year) return null

  return {
    ...year,
    subjects: year.subjects.map((subject) => attachCommissionMetadataToSubject(subject)),
  }
}

export async function getSubjectPageBySlug(slug: string) {
  'use cache'
  cacheTag(TAGS.subject(slug))
  cacheLife({ revalidate: 3600, expire: 86400 })

  const [subject, categorias] = await Promise.all([
    prisma.subject.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        nombre: true,
        descripcion: true,
        links: {
          select: { id: true, label: true, url: true, orden: true },
          orderBy: { orden: 'asc' },
        },
        year: {
          select: {
            id: true,
            slug: true,
            nombre: true,
            color: true,
            career: { select: { nombre: true } },
          },
        },
        agendas: {
          orderBy: { createdAt: 'asc' },
          select: agendaWithEventosSelect,
        },
        commissions: {
          orderBy: { nombre: 'asc' },
          select: {
            id: true,
            slug: true,
            nombre: true,
          },
        },
        _count: { select: { apuntes: true } },
        apuntes: {
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: APUNTES_PAGE_SIZE + 1,
          select: apunteCardSelect,
        },
      },
    }),
    prisma.categoria.findMany({ orderBy: { nombre: 'asc' }, select: categoriaSelect }),
  ])

  if (!subject) return null

  const base = attachCommissionMetadataToSubject({
    ...subject,
    apuntes: subject.apuntes.slice(0, APUNTES_PAGE_SIZE).map(serializeApunteCard),
  })

  return {
    ...base,
    categoriasDisponibles: categorias,
    apuntesHasMore: subject.apuntes.length > APUNTES_PAGE_SIZE,
    apuntesNextCursor:
      subject.apuntes.length > APUNTES_PAGE_SIZE
        ? subject.apuntes[APUNTES_PAGE_SIZE - 1]?.id ?? null
        : null,
    apuntesTotal: subject._count.apuntes,
  }
}

export async function getApuntePageBySlug(subjectSlug: string, apunteSlug: string) {
  'use cache'
  cacheTag(TAGS.subject(subjectSlug))
  cacheLife({ revalidate: 3600, expire: 86400 })

  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    select: {
      id: true,
      slug: true,
      nombre: true,
      year: {
        select: {
          id: true,
          slug: true,
          nombre: true,
          color: true,
          career: { select: { nombre: true } },
        },
      },
      apuntes: {
        where: { slug: apunteSlug },
        take: 1,
        select: {
          id: true,
          titulo: true,
          slug: true,
          descripcionHtml: true,
          createdAt: true,
          createdBy: { select: { nombreUsuario: true } },
          categorias: {
            select: { categoria: { select: categoriaSelect } },
            orderBy: { categoria: { nombre: 'asc' } },
          },
          recursos: {
            orderBy: { orden: 'asc' },
            select: {
              id: true,
              tipo: true,
              url: true,
              orden: true,
              nombre: true,
              storageKey: true,
              mimeType: true,
              sizeBytes: true,
            },
          },
        },
      },
    },
  })

  const apunte = subject?.apuntes[0]
  if (!subject || !apunte) return null

  return {
    subject: {
      id: subject.id,
      slug: subject.slug,
      nombre: subject.nombre,
      year: subject.year,
    },
    apunte: {
      ...apunte,
      createdAt: apunte.createdAt.toISOString(),
      createdByNombre: apunte.createdBy?.nombreUsuario ?? null,
      categorias: apunte.categorias.map(({ categoria }) => categoria),
    },
  }
}

/**
 * Resuelve nombres de usuario a partir de sus ids de cuenta. Lo usa el banco de
 * preguntas: su meta guarda `subidoPorId` (id de cuenta, inmutable). El backfill
 * `pnpm backfill:banco-author` completó ese id en los bancos viejos, así que hoy
 * todos lo tienen. Devuelve un Map id → nombreUsuario; los ids sin cuenta (cuenta
 * borrada) quedan fuera y el llamador omite la línea de autor.
 */
export async function getUserNamesByAccountId(
  ids: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))]
  if (unique.length === 0) return new Map()

  const users = await prisma.userAccount.findMany({
    where: { id: { in: unique } },
    select: { id: true, nombreUsuario: true },
  })

  return new Map(users.map((u) => [u.id, u.nombreUsuario]))
}

export async function getCategoriasApunte(): Promise<CategoriaListItem[]> {
  'use cache'
  cacheTag(TAGS.categorias)
  cacheLife({ revalidate: 3600, expire: 86400 })

  return prisma.categoria.findMany({ orderBy: { nombre: 'asc' }, select: categoriaSelect })
}

export async function getApuntesPage(input: {
  subjectId: string
  categoriaIds?: string[]
  cursor?: string | null
  pageSize?: number
}) {
  const pageSize = input.pageSize ?? APUNTES_PAGE_SIZE
  const where: Prisma.ApunteWhereInput = {
    subjectId: input.subjectId,
    ...(input.categoriaIds && input.categoriaIds.length > 0
      ? { categorias: { some: { categoriaId: { in: input.categoriaIds } } } }
      : {}),
  }

  const rows = await prisma.apunte.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: pageSize + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    select: apunteCardSelect,
  })

  const hasMore = rows.length > pageSize
  const items = rows.slice(0, pageSize).map(serializeApunteCard)

  return {
    items,
    hasMore,
    nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
  }
}

// Metadata mínima para resolver la key de Storage del banco de preguntas
// (quizzes/{anioSlug}/{materiaSlug}/...) y los títulos de la UI de quiz.
export async function getSubjectQuizMeta(slug: string) {
  'use cache'
  cacheTag(TAGS.subject(slug))
  cacheLife({ revalidate: 3600, expire: 86400 })

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

// Sin cache: usa includes para campos de edición que cambian con cada
// mutación admin. La lectura es del admin panel, no del frontend público.
export function getAdminSubjectBySlug(slug: string) {
  return prisma.subject.findUnique({
    where: { slug },
    include: {
      year: { select: { slug: true } },
      agendas: {
        orderBy: { createdAt: 'asc' },
        include: {
          commission: true,
          eventos: {
            orderBy: eventoOrderBy,
            include: {
              tipoEvento: true,
              createdBy: { select: { nombreUsuario: true } },
              apuntes: {
                orderBy: { createdAt: 'asc' },
                select: {
                  apunte: {
                    select: {
                      id: true,
                      titulo: true,
                      slug: true,
                      subject: {
                        select: { slug: true, year: { select: { slug: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      commissions: {
        orderBy: { nombre: 'asc' },
        include: {
          agenda: {
            include: {
              commission: true,
              eventos: {
                orderBy: eventoOrderBy,
                include: {
                  tipoEvento: true,
                  createdBy: { select: { nombreUsuario: true } },
                  apuntes: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                      apunte: {
                        select: {
                          id: true,
                          titulo: true,
                          slug: true,
                          subject: {
                            select: { slug: true, year: { select: { slug: true } } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      apuntes: {
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        include: {
          recursos: { orderBy: { orden: 'asc' } },
          categorias: {
            include: { categoria: true },
            orderBy: { categoria: { nombre: 'asc' } },
          },
        },
      },
    },
  }).then((subject) => {
    if (!subject) return null

    const agendas = subject.agendas.map((agenda) => attachCommissionMetadataToAgenda(agenda))
    const agendaGeneral = agendas.find((agenda) => agenda.commissionId === null) ?? null
    const agendasByCommissionId = new Map(
      agendas
        .filter((agenda) => agenda.commissionId !== null)
        .map((agenda) => [agenda.commissionId, agenda] as const),
    )

    return {
      ...subject,
      agenda: agendaGeneral,
      agendaGeneral,
      agendas,
      commissions: subject.commissions.map((commission) => ({
        ...commission,
        agenda: agendasByCommissionId.get(commission.id) ?? commission.agenda ?? null,
      })),
    }
  })
}

export async function getTiposEvento() {
  'use cache'
  cacheTag(TAGS.tiposEvento)
  cacheLife({ revalidate: 86400, expire: 604800 })

  return prisma.tipoEvento.findMany({ orderBy: { nombre: 'asc' } })
}

// Períodos académicos (globales, no cuelgan de materia). Fechas serializadas a
// "YYYY-MM-DD" para el cliente. Sin filtros de preferencias: aplican a todos.
export async function getPeriodos() {
  'use cache'
  cacheTag(TAGS.periodos)
  cacheLife({ revalidate: 3600, expire: 86400 })

  const rows = await prisma.periodoAcademico.findMany({
    orderBy: { fechaInicio: 'asc' },
    select: {
      id: true,
      categoriaId: true,
      categoria: {
        select: {
          id: true,
          label: true,
          tone: true,
        },
      },
      titulo: true,
      fechaInicio: true,
      fechaFin: true,
    },
  })
  return rows.map((row) => ({
    ...row,
    categoria: {
      ...row.categoria,
      tone: isPeriodoTone(row.categoria.tone) ? row.categoria.tone : 'sky',
    },
    fechaInicio: toDateKey(row.fechaInicio),
    fechaFin: toDateKey(row.fechaFin),
  }))
}

// Categorías de períodos académicos ordenadas por etiqueta.
export async function getCategoriasPeriodo() {
  'use cache'
  cacheTag(TAGS.periodos)
  cacheLife({ revalidate: 3600, expire: 86400 })

  const rows = await prisma.categoriaPeriodo.findMany({
    orderBy: { label: 'asc' },
    select: {
      id: true,
      label: true,
      tone: true,
    },
  })
  return rows.map((row) => ({
    ...row,
    tone: isPeriodoTone(row.tone) ? row.tone : 'sky',
  }))
}

// Cacheado 60s: el filtro "fecha >= ahora" se mueve con el reloj, pero a
// nivel de la home con revalidate=300 ya estábamos sirviendo datos hasta
// 5 min viejos. 60s es un buen balance entre frescura y carga a la DB.
export async function getUpcomingEventsCrossYear(limit = 6) {
  'use cache'
  cacheTag(TAGS.upcomingEvents)
  cacheLife({ revalidate: 60, expire: 3600 })

  const rows = await prisma.evento.findMany({
    // "Próximo" es por DÍA, no por instante: un evento de hoy sigue
    // apareciendo todo el día (incluido uno sin hora). Comparamos contra
    // el inicio del día calendario de AR.
    where: { fecha: { gte: arTodayBoundary() } },
    orderBy: eventoOrderBy,
    take: limit,
    select: {
      id: true,
      titulo: true,
      fecha: true,
      hora: true,
      tipoEvento: { select: { nombre: true } },
      apuntes: {
        orderBy: { createdAt: 'asc' },
        select: {
          apunte: {
            select: {
              id: true,
              titulo: true,
              slug: true,
              subject: {
                select: { slug: true, year: { select: { slug: true } } },
              },
            },
          },
        },
      },
      agenda: {
        select: {
          commissionId: true,
          commission: {
            select: {
              id: true,
              slug: true,
              nombre: true,
            },
          },
          subject: {
            select: { slug: true, nombre: true },
          },
        },
      },
    },
  })
  return rows.map((row) => ({
    ...row,
    fecha: toDateKey(row.fecha),
    apuntes: row.apuntes.map(({ apunte }) => apunte),
  }))
}

export async function getHomeCalendarEvents() {
  'use cache'
  cacheTag(TAGS.upcomingEvents, TAGS.career)
  cacheLife({ revalidate: 300, expire: 3600 })

  const rows = await prisma.evento.findMany({
    orderBy: eventoOrderBy,
    select: {
      id: true,
      titulo: true,
      descripcionHtml: true,
      fecha: true,
      hora: true,
      tipoEventoId: true,
      tipoEvento: { select: { nombre: true } },
      createdByUserId: true,
      apuntes: {
        orderBy: { createdAt: 'asc' },
        select: {
          apunte: {
            select: {
              id: true,
              titulo: true,
              slug: true,
              subject: {
                select: { slug: true, year: { select: { slug: true } } },
              },
            },
          },
        },
      },
      agenda: {
        select: {
          id: true,
          commissionId: true,
          commission: {
            select: {
              id: true,
              slug: true,
              nombre: true,
            },
          },
          subject: {
            select: {
              id: true,
              slug: true,
              nombre: true,
              commissions: {
                orderBy: { nombre: 'asc' },
                select: { id: true, slug: true, nombre: true },
              },
              year: {
                select: {
                  id: true,
                  slug: true,
                  nombre: true,
                  orden: true,
                },
              },
            },
          },
        },
      },
    },
  })
  return rows.map((row) => ({
    ...row,
    fecha: toDateKey(row.fecha),
    apuntes: row.apuntes.map(({ apunte }) => apunte),
  }))
}

export async function getLatestApuntes() {
  'use cache'
  cacheTag(TAGS.latestApuntes, TAGS.career)
  cacheLife({ revalidate: 300, expire: 3600 })

  // Traemos todos los apuntes ordenados por fecha y dejamos que el cliente
  // filtre según los años/materias elegidos y recorte a los últimos. Si
  // limitáramos acá, un año podría quedarse sin apuntes en el home solo
  // porque sus apuntes no entran en los más nuevos del campus entero.
  const rows = await prisma.apunte.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      titulo: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      subject: {
        select: {
          slug: true,
          nombre: true,
          year: {
            select: {
              slug: true,
              nombre: true,
            },
          },
        },
      },
    },
  })
  return rows.map((apunte) => ({
    ...apunte,
    createdAt: apunte.createdAt.toISOString(),
    updatedAt: apunte.updatedAt.toISOString(),
  }))
}

export async function getLatestApuntesByYear(yearSlug: string, limit = 6) {
  'use cache'
  cacheTag(TAGS.year(yearSlug))
  cacheLife({ revalidate: 300, expire: 3600 })

  const rows = await prisma.apunte.findMany({
    where: {
      subject: {
        year: {
          slug: yearSlug,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      titulo: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      subject: {
        select: {
          slug: true,
          nombre: true,
          year: {
            select: {
              slug: true,
              nombre: true,
            },
          },
        },
      },
    },
  })

  return rows.map((apunte) => ({
    ...apunte,
    createdAt: apunte.createdAt.toISOString(),
    updatedAt: apunte.updatedAt.toISOString(),
  }))
}

// ---------------------------------------------------------------------------
// Impacto de eliminación — usado por ConfirmDeleteModal para mostrar conteos
// reales antes de que el admin confirme el borrado. Sin cache: el admin
// quiere ver los conteos vivos antes de decidir.
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
      agendas: {
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
    eventosCount: subject.agendas.reduce((total, agenda) => total + agenda._count.eventos, 0),
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
          agendas: {
            select: {
              _count: { select: { eventos: true } },
            },
          },
          _count: { select: { apuntes: true } },
        },
      },
    },
  })
  if (!year) return null

  let eventosCount = 0
  let apuntesCount = 0
  for (const s of year.subjects) {
    eventosCount += s.agendas.reduce((total, agenda) => total + agenda._count.eventos, 0)
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

// La clave "hoy" (zona AR) para filtrar próximos eventos en páginas prerendereadas.
// Un Server Component estático no puede llamar new Date() directo (error
// next-prerender-current-time), pero dentro de 'use cache' sí: el valor queda
// cacheado y se refresca por revalidate/expire, con desfase máximo de 1h tras
// la medianoche.
export async function getTodayKeyAR(): Promise<string> {
  'use cache'
  cacheLife({ revalidate: 900, expire: 3600 })
  return todayKeyAR()
}

// Enumera los slugs existentes (años, materias, comisiones y apuntes) para que las
// rutas públicas se pre-rendericen en build time vía generateStaticParams. Corre solo
// durante el build, por eso NO usa 'use cache' (esa directiva es para request time).
export async function getContentSlugsForStaticParams() {
  return prisma.academicYear.findMany({
    select: {
      slug: true,
      subjects: {
        select: {
          slug: true,
          commissions: { select: { slug: true } },
          apuntes: { select: { slug: true } },
        },
      },
    },
  })
}
