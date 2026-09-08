import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CalendarExportButton } from './CalendarExportButton'

describe('CalendarExportButton', () => {
  it('muestra una acción textual accesible en desktop', () => {
    const markup = renderToStaticMarkup(
      <CalendarExportButton events={[]} calendarName="Calendario" variant="desktop" />,
    )

    expect(markup).toContain('Descargar calendario')
    expect(markup).toContain('type="button"')
  })

  it('muestra un botón mobile con nombre accesible y estado disabled', () => {
    const markup = renderToStaticMarkup(
      <CalendarExportButton events={[]} calendarName="Calendario" variant="mobile" disabled />,
    )

    expect(markup).toContain('aria-label="Descargar calendario"')
    expect(markup).toContain('title="Descargar calendario"')
    expect(markup).toContain('disabled')
  })
})
