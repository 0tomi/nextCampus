import { describe, expect, it } from 'vitest'
import { filterEventsByPreferredCommission } from '@/lib/commission-preferences'
import { getSubjectVisibleEvents } from './event-adapters'
import type { YearPageCareer, YearPageYear } from './year-page-adapters'
import {
  buildMobileYear,
  buildYearCalendarEvents,
  buildYearDrawerYears,
  buildYearLatestApuntes,
  buildYearModalSubjects,
  buildYearOverviewEvents,
  buildYearSidebarItems,
  buildYearUpcomingEvents,
  getYearDisplayIndex,
} from './year-page-adapters'

function makeYear(): YearPageYear {
  const generalEvent = {
    id: 'general-event',
    titulo: 'Clase general',
    descripcion: '',
    fecha: '2026-06-04',
    hora: null,
    createdByUserId: null,
    createdByNombre: null,
    tipoEventoId: 'tipo-1',
    tipoEvento: { nombre: 'Clase' },
    apuntes: [],
    commissionId: null,
    commission: null,
  }
  const commission = { id: 'commission-1', slug: 'comision-a', nombre: 'Comisión A' }
  const commissionEvent = {
    id: 'commission-event',
    titulo: 'Parcial',
    descripcion: '<p>Temas</p>',
    fecha: '2026-06-10',
    hora: '09:00',
    createdByUserId: 'user-1',
    createdByNombre: 'Admin',
    tipoEventoId: 'tipo-2',
    tipoEvento: { nombre: 'Parcial' },
    apuntes: [],
    commissionId: commission.id,
    commission,
  }

  return {
    id: 'year-1',
    slug: 'primer-anio',
    nombre: 'Primer año',
    descripcion: 'Descripción',
    links: [{ id: 'year-link-1', label: 'Drive del año', url: 'https://drive.example.com', orden: 0 }],
    color: 'orange',
    career: { nombre: 'Tecnicatura' },
    subjects: [
      {
        id: 'subject-1',
        slug: 'calculo',
        nombre: 'Cálculo',
        agenda: {
          id: 'agenda-general',
          commissionId: null,
          commission: null,
          isGeneral: true,
          eventos: [generalEvent],
        },
        agendaGeneral: {
          id: 'agenda-general',
          commissionId: null,
          commission: null,
          isGeneral: true,
          eventos: [generalEvent],
        },
        agendas: [
          {
            id: 'agenda-general',
            commissionId: null,
            commission: null,
            isGeneral: true,
            eventos: [generalEvent],
          },
          {
            id: 'agenda-commission',
            commissionId: commission.id,
            commission,
            isGeneral: false,
            eventos: [commissionEvent],
          },
        ],
        commissions: [{ ...commission, agenda: null }],
      },
    ],
  }
}

function makeCareer(): YearPageCareer {
  return {
    id: 'career-1',
    nombre: 'Tecnicatura',
    descripcion: '',
    years: [
      {
        id: 'year-1',
        slug: 'primer-anio',
        nombre: 'Primer año',
        descripcion: '',
        links: [],
        orden: 1,
        color: null,
        subjects: [{ id: 'subject-1', slug: 'calculo', nombre: 'Cálculo', descripcion: '', links: [], commissions: [] }],
      },
    ],
  }
}

describe('year-page-adapters', () => {
  it('arma años del drawer y conserva slugs/rutas de materias', () => {
    expect(buildYearDrawerYears(makeCareer())).toEqual([
      {
        slug: 'primer-anio',
        nombre: 'Primer año',
        color: null,
        subjectsCount: 1,
        orden: 1,
        subjects: [{ id: 'subject-1', slug: 'calculo', nombre: 'Cálculo' }],
      },
    ])

    expect(
      buildYearSidebarItems({
        badgeClassName: 'badge',
        subjects: makeYear().subjects,
        yearSlug: 'primer-anio',
      })[0].href,
    ).toBe('/primer-anio/calculo')
  })

  it('calcula el índice visual del año con fallback seguro', () => {
    expect(getYearDisplayIndex(makeCareer(), 'year-1')).toBe(1)
    expect(getYearDisplayIndex(makeCareer(), 'missing')).toBe(1)
  })

  it('adapta los últimos apuntes del año al shape de UI', () => {
    expect(
      buildYearLatestApuntes([
        {
          id: 'apunte-1',
          titulo: 'Resumen unidad 1',
          slug: 'resumen-unidad-1',
          createdAt: '2026-06-10T12:00:00.000Z',
          updatedAt: '2026-06-10T12:00:00.000Z',
          subject: {
            slug: 'calculo',
            nombre: 'Cálculo',
            year: {
              slug: 'primer-anio',
              nombre: 'Primer año',
            },
          },
        },
      ]),
    ).toEqual([
      {
        id: 'apunte-1',
        titulo: 'Resumen unidad 1',
        slug: 'resumen-unidad-1',
        createdAt: '2026-06-10T12:00:00.000Z',
        updatedAt: '2026-06-10T12:00:00.000Z',
        subjectSlug: 'calculo',
        subjectNombre: 'Cálculo',
        yearSlug: 'primer-anio',
        yearNombre: 'Primer año',
      },
    ])
  })

  it('proyecta eventos de overview, calendario y próximos sin duplicar lógica', () => {
    const year = makeYear()

    expect(buildYearOverviewEvents(year.subjects).map((event) => event.titulo)).toEqual([
      'Clase general (Cálculo)',
      'Parcial (Cálculo)',
    ])
    expect(buildYearCalendarEvents(year.subjects).map((event) => event.titulo)).toEqual([
      'Clase general · Cálculo',
      'Parcial · Cálculo',
    ])
    expect(buildYearUpcomingEvents(year.subjects, '2026-06-05').map((event) => event.id)).toEqual([
      'commission-event',
    ])
  })

  it('arma subjects de modales desde agenda general y datos mobile con eventos de comisiones', () => {
    const year = makeYear()
    const modalSubjects = buildYearModalSubjects(year.subjects, [{ id: 'cat-1', nombre: 'Guías' }])
    const mobileYear = buildMobileYear(year)

    expect(modalSubjects).toEqual([
      {
        id: 'subject-1',
        slug: 'calculo',
        nombre: 'Cálculo',
        agendaId: 'agenda-general',
        commissions: [{ id: 'commission-1', slug: 'comision-a', nombre: 'Comisión A' }],
        categoriasDisponibles: [{ id: 'cat-1', nombre: 'Guías' }],
      },
    ])
    expect(mobileYear.subjects[0].agenda?.eventos.map((event) => event.commissionId)).toEqual([
      null,
      'commission-1',
    ])
  })
})


describe('lean mobile and modal projections', () => {
  it('passes only count rows and commission options, preserving visible event counts', () => {
    const year = makeYear()
    const mobile = buildMobileYear(year)
    expect(Object.keys(mobile).sort()).toEqual(['career', 'color', 'descripcion', 'id', 'links', 'nombre', 'slug', 'subjects'])
    expect(Object.keys(mobile.subjects[0]).sort()).toEqual(['agenda', 'commissions', 'id', 'nombre', 'slug'])
    expect(mobile.subjects[0].agenda?.eventos).toEqual([{ commissionId: null }, { commissionId: 'commission-1' }])
    expect(Object.keys(mobile.subjects[0].commissions[0]).sort()).toEqual(['id', 'nombre', 'slug'])
    expect(Object.keys(buildYearModalSubjects(year.subjects, [])[0].commissions[0]).sort()).toEqual(['id', 'nombre', 'slug'])
    for (const preferred of [null, 'commission-1', 'missing']) {
      expect(filterEventsByPreferredCommission(mobile.subjects[0].agenda?.eventos ?? [], preferred)).toHaveLength(
        filterEventsByPreferredCommission(getSubjectVisibleEvents(year.subjects[0]), preferred).length,
      )
    }
    const legacy = {
      ...year,
      subjects: year.subjects.map((subject) => ({
        ...subject,
        agenda: {
          id: subject.agenda?.id ?? subject.agendas[0]?.id ?? subject.id,
          eventos: getSubjectVisibleEvents(subject).map((event) => ({ ...event, commissionSlug: event.commission?.slug ?? null, commissionNombre: event.commission?.nombre ?? null })),
        },
      })),
    }
    const before = Buffer.byteLength(JSON.stringify(legacy))
    const after = Buffer.byteLength(JSON.stringify(mobile))
    expect(after).toBeLessThan(before / 2)
    console.info(`mobile fixture DTO bytes: ${before} -> ${after}`)
  })
  it('preserves null agendas and ID fallback for commission-only subjects', () => {
    const year = makeYear()
    year.subjects[0].agenda = null
    year.subjects[0].agendaGeneral = null
    year.subjects[0].agendas = year.subjects[0].agendas.slice(1)
    expect(buildMobileYear(year).subjects[0].agenda).toEqual({ id: 'agenda-commission', eventos: [{ commissionId: 'commission-1' }] })
    year.subjects[0].agendas = []
    expect(buildMobileYear(year).subjects[0].agenda).toBeNull()
    expect(buildYearModalSubjects(year.subjects, [])).toEqual([])
  })
})
