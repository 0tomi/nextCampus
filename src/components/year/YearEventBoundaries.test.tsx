import { PassThrough } from 'node:stream'
import { renderToString, renderToPipeableStream } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import type { YearEventItem } from '@/lib/domain/year-page-adapters'
import { YearEventsProvider } from './YearEventsProvider'
import { YearOverviewEvents } from './YearOverviewEvents'
import { MobileYear } from '@/components/mobile/year/MobileYear'

vi.mock('@/components/calendar/EventCalendarAdmin', () => ({
  EventCalendarAdmin: ({ events }: { events: YearEventItem[] }) => <div data-testid="full-calendar">{events.map((event) => event.titulo).join('|')}</div>,
}))
vi.mock('@/components/commissions/usePreferredCommission', () => ({ usePreferredCommissionMap: () => ({}) }))
vi.mock('@/components/admin/AdminControls', () => ({ AdminControls: () => null }))
vi.mock('@/components/admin/SubjectPageAdminOverlay', () => ({ AdminTriggerButton: () => null, DeleteEventoButton: () => null }))

vi.mock('@/components/mobile/shell/MobileShell', () => ({ MobileShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/mobile/calendar/MobileEventDetailSheet', () => ({ MobileEventDetailSheet: () => null }))
vi.mock('./YearLatestApuntes', () => ({ YearLatestApuntes: () => null }))

const events: YearEventItem[] = ['2026-10-22', '2026-10-23'].map((fecha) => ({
  id: fecha, titulo: `Event ${fecha}`, fecha, hora: null, tipo: 'Clase', tipoId: 't', subjectId: 's', subjectSlug: 'calculo',
  materiaNombre: 'Cálculo', descripcion: '', commissionId: null, commissionSlug: null, commissionNombre: null, createdByUserId: null, apuntes: [],
}))
const content = (day: Promise<string>) => <YearEventsProvider events={events} todayKey={day}>
  <h1>Static hero</h1>
  <YearOverviewEvents year={{ id: 'y', slug: 'primero' }} subjects={[]} tiposEvento={[]} periodos={[]} />
</YearEventsProvider>

it('prerenders hero and full historical calendar while only the upcoming list suspends', () => {
  const html = renderToString(content(new Promise(() => {})))
  expect(html).toContain('Static hero')
  expect(html).toContain('data-testid="full-calendar"')
  expect(html).toContain('Event 2026-10-22 (Cálculo)|Event 2026-10-23 (Cálculo)')
  expect(html).toContain('aria-busy="true"')
})

it('streams the request-day-filtered upcoming cards during SSR, with history still in the calendar', async () => {
  const html = await new Promise<string>((resolve, reject) => {
    const output = new PassThrough()
    const chunks: Buffer[] = []
    output.on('data', (chunk) => chunks.push(chunk))
    output.on('end', () => resolve(Buffer.concat(chunks).toString()))
    const rendered = renderToPipeableStream(content(Promise.resolve('2026-10-23')), {
      onAllReady: () => rendered.pipe(output), onError: reject,
    })
  })
  expect(html).toContain('Event 2026-10-22 (Cálculo)|Event 2026-10-23 (Cálculo)')
  expect(html).toContain('>Event 2026-10-23</h3>')
  expect(html).not.toContain('>Event 2026-10-22</h3>')
})

it('keeps the mobile hero, subject links and calendar CTA in the shell when its upcoming list suspends', () => {
  const html = renderToString(<YearEventsProvider events={events} todayKey={new Promise(() => {})}>
    <MobileYear year={{ id: 'y', slug: 'primero', nombre: 'Primero', links: [], career: { nombre: 'Career' }, subjects: [
      { id: 's', slug: 'calculo', nombre: 'Cálculo', commissions: [], agenda: { id: 'a', eventos: [{ commissionId: null }] } },
    ] }} allYears={[]} careerName="Career" latestApuntes={[]} tiposEvento={[]} />
  </YearEventsProvider>)
  expect(html).toContain('Primero')
  expect(html).toContain('href="/primero/calculo"')
  expect(html).toContain('Ver calendario completo')
  expect(html).toContain('aria-busy="true"')
})
