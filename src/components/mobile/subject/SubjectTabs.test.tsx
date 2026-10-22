import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./tabs/AgendaTab', () => ({ AgendaTab: () => <div>Agenda móvil</div> }))
vi.mock('./tabs/QuizTab', () => ({ QuizTab: () => <div>Quiz móvil</div> }))
vi.mock('./tabs/ApuntesTab', () => ({ ApuntesTab: () => <div>Apuntes móviles</div> }))
vi.mock('@/components/apuntes/ApuntesFeed', () => ({ ApuntesFeed: () => <div>Apuntes</div> }))

import { getAdjacentTabKey, SubjectTabs } from './SubjectTabs'

const baseProps = {
  subjectId: 's',
  subjectSlug: 'calculo',
  subjectName: 'Cálculo',
  yearSlug: 'primero',
  yearId: 'y',
  agendaId: 'a',
  events: [],
  apuntes: [],
  categorias: [],
  apuntesHasMore: false,
  apuntesNextCursor: null,
  tiposEvento: [],
  commissions: [],
}

function attributesOf(markup: string, label: string) {
  const match = markup.match(new RegExp(`<button([^>]*)>(?:(?!</button>).)*${label}</button>`))
  if (!match) throw new Error(`Tab ${label} not found`)
  return match[1]
}

function attr(attributes: string, name: string) {
  return attributes.match(new RegExp(`${name}="([^"]*)"`))?.[1]
}

describe('SubjectTabs accessibility', () => {
  it('links every tab with its panel when all panels are rendered', () => {
    const markup = renderToStaticMarkup(
      <SubjectTabs
        {...baseProps}
        desktopAgenda={<span>Agenda de escritorio</span>}
        desktopQuiz={<span>Quiz de escritorio</span>}
      />,
    )

    for (const label of ['Agenda', 'Quiz', 'Apuntes']) {
      const tab = attributesOf(markup, label)
      const tabId = attr(tab, 'id')
      const panelId = attr(tab, 'aria-controls')
      expect(tabId).toBeTruthy()
      expect(panelId).toBeTruthy()
      expect(markup).toContain(`id="${panelId}"`)
      expect(markup).toMatch(
        new RegExp(`id="${panelId}"[^>]*role="tabpanel"[^>]*aria-labelledby="${tabId}"|role="tabpanel"[^>]*id="${panelId}"[^>]*aria-labelledby="${tabId}"`),
      )
    }
  })

  it('keeps only the selected tab in the keyboard tab order', () => {
    const markup = renderToStaticMarkup(<SubjectTabs {...baseProps} />)
    expect(attr(attributesOf(markup, 'Agenda'), 'tabindex')).toBe('0')
    expect(attr(attributesOf(markup, 'Quiz'), 'tabindex')).toBe('-1')
    expect(attr(attributesOf(markup, 'Apuntes'), 'tabindex')).toBe('-1')
    expect(attr(attributesOf(markup, 'Agenda'), 'aria-controls')).toBeTruthy()
    expect(attr(attributesOf(markup, 'Quiz'), 'aria-controls')).toBeUndefined()
    expect(markup.match(/role="tabpanel"/g)).toHaveLength(1)
  })
})

describe('getAdjacentTabKey', () => {
  it.each([
    ['agenda', 'ArrowRight', 'quiz'],
    ['apuntes', 'ArrowRight', 'agenda'],
    ['agenda', 'ArrowLeft', 'apuntes'],
    ['quiz', 'ArrowLeft', 'agenda'],
    ['quiz', 'Home', 'agenda'],
    ['quiz', 'End', 'apuntes'],
  ] as const)('moves from %s with %s to %s', (current, key, expected) => {
    expect(getAdjacentTabKey(current, key)).toBe(expected)
  })

  it('ignores unrelated keys', () => {
    expect(getAdjacentTabKey('agenda', 'Enter')).toBeNull()
  })
})
