import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApuntesFeed, type ApunteFeedItem } from './ApuntesFeed'

vi.mock('@/components/admin/AdminControls', () => ({
  AdminControls: ({ children, ownerUserId }: { children: ReactNode; ownerUserId?: string }) =>
    <div data-owner={ownerUserId}>{children}</div>,
}))
vi.mock('@/components/admin/SubjectPageAdminOverlay', () => ({
  DeleteApunteButton: ({ apunteId }: { apunteId: string }) => <button type="button">Delete {apunteId}</button>,
}))
vi.mock('@/components/admin/EditApunteButton', () => ({
  EditApunteButton: ({ apunte }: { apunte: { id: string } }) => <button type="button">Edit {apunte.id}</button>,
}))
vi.mock('@/components/apuntes/ApunteRecursoView', () => ({
  ApunteRecursoView: ({ recurso, apunteHref, htmlLoadMode }: {
    recurso: { id: string }; apunteHref: string; htmlLoadMode: string
  }) => <a data-resource={recurso.id} data-load-mode={htmlLoadMode} href={apunteHref}>{recurso.id}</a>,
}))

function note(id: string, count: number): ApunteFeedItem {
  return {
    id, titulo: `Apunte ${id}`, slug: id, descripcion: 'Descripción del apunte',
    createdAt: '2026-01-01', createdByUserId: `owner-${id}`, categorias: [],
    recursos: Array.from({ length: count }, (_, orden) => ({
      id: `${id}-${orden}`, tipo: 'HTML', url: `/resource-${orden}`, orden, nombre: null,
    })),
  }
}

function render(items: ApunteFeedItem[], variant: 'desktop' | 'mobile' | 'responsive' = 'desktop') {
  return renderToStaticMarkup(<ApuntesFeed
    subjectId="subject" subjectSlug="materia" yearId="year" yearSlug="primero"
    categorias={[]} initialItems={items} initialHasMore={false} initialNextCursor={null}
    focusApunteSlug="multi" variant={variant}
  />)
}

describe('ApuntesFeed resource grouping', () => {
  it('renders one complete desktop group per note, independent of preceding resource counts', () => {
    const markup = render([note('single', 1), note('multi', 5), note('empty', 0)])
    expect(markup.match(/data-feed-apunte=/g)).toHaveLength(3)
    expect(markup.match(/<h3/g)).toHaveLength(3)
    expect(markup.match(/Delete /g)).toHaveLength(3)
    expect(markup.match(/Edit /g)).toHaveLength(3)
    expect(markup.match(/data-resource=/g)).toHaveLength(6)
    expect(markup.match(/data-load-mode="on-click"/g)).toHaveLength(6)
    expect(markup).toContain('data-owner="owner-multi"')
    expect(markup).toContain('href="/primero/materia/apuntes/multi"')
    expect(markup).toContain('ring-1 ring-white/20')
    expect(markup).not.toMatch(/-ml-4|-mt-4|border-[lrtb]-0|calc\(100%/)
  })

  it('uses a responsive internal grid only for multi-resource groups', () => {
    const single = render([note('single', 1)])
    const multi = render([note('multi', 3)])
    expect(single).not.toContain('xl:col-span-2')
    expect(single.match(/xl:grid-cols-2/g)).toHaveLength(1)
    expect(multi).toContain('xl:col-span-2')
    expect(multi.match(/xl:grid-cols-2/g)).toHaveLength(2)
    expect(multi).toContain('grid-cols-1 gap-4 border-t')
  })

  it('retains the mobile three-resource preview and complete-note navigation', () => {
    const markup = render([note('multi', 5)], 'mobile')
    expect(markup.match(/data-resource=/g)).toHaveLength(3)
    expect(markup).toContain('Y otros 2 recursos.')
    expect(markup).toContain('href="/primero/materia/apuntes/multi"')
    expect(markup).not.toContain('xl:grid-cols-2')
  })

  it('keeps both responsive variants behind their existing breakpoints', () => {
    const markup = render([note('multi', 4)], 'responsive')
    expect(markup).toContain('hidden items-start gap-4 lg:grid xl:grid-cols-2')
    expect(markup).toContain('flex flex-col gap-3 lg:hidden')
  })
})

describe('ApuntesFeed category filters', () => {
  it('exposes the selected filter state to assistive technology', () => {
    const markup = renderToStaticMarkup(<ApuntesFeed
      subjectId="subject" subjectSlug="materia" yearId="year" yearSlug="primero"
      categorias={[{ id: 'teoria', nombre: 'Teoría' }]} initialItems={[note('single', 1)]}
      initialHasMore={false} initialNextCursor={null} variant="desktop"
    />)
    expect(markup).toContain('role="group" aria-label="Filtrar por categoría"')
    expect(markup).toMatch(/aria-pressed="true"[^>]*>Todos</)
    expect(markup).toMatch(/aria-pressed="false"[^>]*>Teoría</)
  })
})
