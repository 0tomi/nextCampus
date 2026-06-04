import { describe, expect, it } from 'vitest'
import type { YearPageCareer, YearPageYear } from './year-page-adapters'
import {
  buildMobileYear,
  buildYearCalendarEvents,
  buildYearDrawerYears,
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
    descripcionHtml: '',
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
    descripcionHtml: '<p>Temas</p>',
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
    driveUrl: 'https://drive.example.com',
    playlistUrl: null,
    playlistEnabled: true,
    discordUrl: null,
    discordDescripcion: null,
    discordAltUrl: null,
    discordAltDescripcion: null,
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
        driveUrl: '',
        playlistUrl: null,
        playlistEnabled: true,
        orden: 1,
        color: null,
        subjects: [{ id: 'subject-1', slug: 'calculo', nombre: 'Cálculo', descripcion: '', driveUrl: '', commissions: [] }],
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
        commissions: year.subjects[0].commissions,
        categoriasDisponibles: [{ id: 'cat-1', nombre: 'Guías' }],
      },
    ])
    expect(mobileYear.subjects[0].agenda?.eventos.map((event) => event.commissionSlug)).toEqual([
      null,
      'comision-a',
    ])
  })
})
