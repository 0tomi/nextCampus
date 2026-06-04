import { describe, expect, it } from 'vitest'
import type { UserPreferences } from '@/lib/preferences'
import {
  buildHomeCalendarEvents,
  buildHomeLatestApuntes,
  buildHomeUpcomingEvents,
  isHomeEventVisibleForPrefs,
  type RawHomeCalendarEvent,
  type RawHomeLatestApunte,
} from './home-page-adapters'

const visiblePrefs: UserPreferences = {
  hiddenYears: [],
  hiddenSubjects: [],
  hiddenCommissions: [],
}

function makeHomeEvent(overrides: Partial<RawHomeCalendarEvent> = {}): RawHomeCalendarEvent {
  return {
    id: 'event-1',
    titulo: 'Primer parcial',
    descripcionHtml: '<p>Temas</p>',
    fecha: '2026-06-10',
    hora: '09:00',
    tipoEventoId: 'tipo-1',
    tipoEvento: { nombre: 'Parcial' },
    createdByUserId: 'user-1',
    apuntes: [],
    agenda: {
      id: 'agenda-1',
      commissionId: 'commission-1',
      commission: { id: 'commission-1', slug: 'comision-a', nombre: 'Comisión A' },
      subject: {
        id: 'subject-1',
        slug: 'calculo',
        nombre: 'Cálculo',
        commissions: [{ id: 'commission-1', slug: 'comision-a', nombre: 'Comisión A' }],
        year: { id: 'year-1', slug: 'primer-anio', nombre: 'Primer año', orden: 1 },
      },
    },
    ...overrides,
  }
}

function makeApunte(overrides: Partial<RawHomeLatestApunte> = {}): RawHomeLatestApunte {
  return {
    id: 'apunte-1',
    titulo: 'Guía 1',
    slug: 'guia-1',
    createdAt: new Date('2026-05-20T12:00:00.000Z'),
    subject: {
      slug: 'calculo',
      nombre: 'Cálculo',
      year: { slug: 'primer-anio', nombre: 'Primer año' },
    },
    ...overrides,
  }
}

describe('home-page-adapters', () => {
  it('respeta preferencias de materia y comisión en eventos del home', () => {
    expect(
      isHomeEventVisibleForPrefs(
        { yearSlug: 'primer-anio', subjectSlug: 'calculo', commissionSlug: 'comision-a' },
        visiblePrefs,
      ),
    ).toBe(true)

    expect(
      isHomeEventVisibleForPrefs(
        { yearSlug: 'primer-anio', subjectSlug: 'calculo', commissionSlug: 'comision-a' },
        { hiddenYears: [], hiddenSubjects: [], hiddenCommissions: ['calculo:comision-a'] },
      ),
    ).toBe(false)

    expect(
      isHomeEventVisibleForPrefs(
        { yearSlug: null, subjectSlug: 'calculo', commissionSlug: null },
        visiblePrefs,
      ),
    ).toBe(false)
  })

  it('arma próximos eventos desde todayKey, los ordena y aplica límite', () => {
    const result = buildHomeUpcomingEvents(
      [
        makeHomeEvent({ id: 'old', fecha: '2026-06-03' }),
        makeHomeEvent({ id: 'later', fecha: '2026-06-05', hora: '10:00' }),
        makeHomeEvent({ id: 'today', fecha: '2026-06-04', hora: null }),
      ],
      visiblePrefs,
      '2026-06-04',
      2,
    )

    expect(result.map((event) => event.id)).toEqual(['today', 'later'])
  })

  it('omite eventos sin materia o año para evitar rutas incompletas', () => {
    const result = buildHomeCalendarEvents(
      [makeHomeEvent({ agenda: { ...makeHomeEvent().agenda, subject: null } as unknown as RawHomeCalendarEvent['agenda'] })],
      visiblePrefs,
    )

    expect(result).toEqual([])
  })

  it('filtra apuntes por preferencias, limita a seis y serializa fechas', () => {
    const apuntes = Array.from({ length: 8 }, (_, index) =>
      makeApunte({ id: `apunte-${index}`, slug: `guia-${index}` }),
    )

    const result = buildHomeLatestApuntes(apuntes, visiblePrefs)

    expect(result).toHaveLength(6)
    expect(result[0].createdAt).toBe('2026-05-20T12:00:00.000Z')
  })

  it('sin preferencias no envía apuntes ni eventos filtrados al cliente', () => {
    expect(buildHomeUpcomingEvents([makeHomeEvent()], null, '2026-06-04')).toEqual([])
    expect(buildHomeCalendarEvents([makeHomeEvent()], null)).toEqual([])
    expect(buildHomeLatestApuntes([makeApunte()], null)).toEqual([])
  })
})
