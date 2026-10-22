import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ApuntesFeedRecovery } from './ApuntesFeedRecovery'

describe('ApuntesFeedRecovery', () => {
  it('offers a native keyboard-accessible retry button and announces errors', () => {
    const markup = renderToStaticMarkup(
      <ApuntesFeedRecovery error="No pudimos cargar los apuntes." loading={false} onRetry={() => {}} />,
    )
    expect(markup).toContain('role="status"')
    expect(markup).toContain('No pudimos cargar los apuntes.')
    expect(markup).toContain('<button type="button"')
    expect(markup).toContain('cursor-pointer')
    expect(markup).toContain('focus-visible:outline')
    expect(markup).toContain('Reintentar</button>')
    expect(markup).not.toContain('disabled=""')
  })

  it('keeps the control mounted with disabled and pending feedback while retrying', () => {
    const markup = renderToStaticMarkup(
      <ApuntesFeedRecovery error="No pudimos cargar los apuntes." loading onRetry={() => {}} />,
    )
    expect(markup).toContain('disabled=""')
    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('Reintentando…</button>')
    expect(markup).toContain('Reintentando cargar los apuntes…')
  })

  it('does not show an obsolete retry action after recovery or a category change', () => {
    expect(renderToStaticMarkup(
      <ApuntesFeedRecovery error="" loading={false} onRetry={() => {}} />,
    )).toBe('')
  })
})
