import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const controllers = vi.hoisted(() => ({
  search: vi.fn(),
  notifications: vi.fn(),
  feed: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@/components/admin/AdminSessionProvider', () => ({
  useAdminSessionContext: () => ({ isAdmin: true }),
}))
vi.mock('@/hooks/usePreferences', () => ({
  usePreferences: () => ({ prefs: null }),
}))
vi.mock('@/components/search/GlobalApunteSearch', () => ({
  GlobalApunteSearch: () => {
    controllers.search()
    return <button type="button">Buscar apuntes</button>
  },
}))
vi.mock('@/components/changelog/NotificationBell', () => ({
  NotificationBell: () => {
    controllers.notifications()
    return <button type="button">Novedades</button>
  },
}))
vi.mock('@/components/apuntes/ApuntesFeed', () => ({
  ApuntesFeed: (props: { variant: string }) => {
    controllers.feed(props)
    return <div>Apuntes compartidos</div>
  },
}))
vi.mock('./subject/tabs/AgendaTab', () => ({
  AgendaTab: () => <div>Agenda móvil</div>,
}))
vi.mock('./subject/tabs/QuizTab', () => ({
  QuizTab: () => <div>Quiz móvil</div>,
}))
vi.mock('./subject/tabs/ApuntesTab', () => ({
  ApuntesTab: () => <div>Apuntes móviles independientes</div>,
}))

import { MobileShell } from './shell/MobileShell'
import { SubjectTabs } from './subject/SubjectTabs'

beforeEach(() => vi.clearAllMocks())

describe('responsive composition', () => {
  it('server-renders both navigation layouts with one search and notification controller', () => {
    const markup = renderToStaticMarkup(
      <MobileShell
        title="Cálculo"
        drawerYears={[]}
        careerName="Campus"
        desktop={{
          sidebar: <span>Secciones de escritorio</span>,
          topbar: <span>Acciones de escritorio</span>,
        }}
      >
        <h1>Contenido compartido</h1>
      </MobileShell>,
    )
    expect(controllers.search).toHaveBeenCalledTimes(1)
    expect(controllers.notifications).toHaveBeenCalledTimes(1)
    expect(markup).toContain('Secciones de escritorio')
    expect(markup).toContain('Contenido compartido')
    expect(markup).toContain('Abrir menú')
    expect(markup).toContain('lg:block')
  })

  it('server-renders desktop sections and mobile tabs around exactly one notes feed', () => {
    const markup = renderToStaticMarkup(
      <SubjectTabs
        subjectId="s"
        subjectSlug="calculo"
        subjectName="Cálculo"
        yearSlug="primero"
        yearId="y"
        agendaId="a"
        events={[]}
        apuntes={[]}
        categorias={[]}
        apuntesHasMore={false}
        apuntesNextCursor={null}
        tiposEvento={[]}
        commissions={[]}
        desktopAgenda={<span>Agenda de escritorio</span>}
        desktopQuiz={<span>Quiz de escritorio</span>}
        notesHeading={<h2>Apuntes y descargas</h2>}
      />,
    )
    expect(controllers.feed).toHaveBeenCalledTimes(1)
    expect(controllers.feed).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'responsive' }),
    )
    expect(markup).toContain('Agenda de escritorio')
    expect(markup).toContain('Agenda móvil')
    expect(markup).toContain('role="tablist"')
    expect(markup).not.toContain('Apuntes móviles independientes')
    expect(markup).toContain('hidden space-y-4 lg:block')
  })
})
