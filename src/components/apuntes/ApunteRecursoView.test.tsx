import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ApunteRecursoView } from './ApunteRecursoView'

const htmlRecurso = {
  id: 'recurso-html-1',
  tipo: 'HTML' as const,
  url: '',
  orden: 1,
  nombre: 'Clase interactiva',
}

describe('ApunteRecursoView', () => {
  it('espera el click antes de montar el iframe HTML cuando se pide carga manual', () => {
    const markup = renderToStaticMarkup(
      <ApunteRecursoView recurso={htmlRecurso} apunteHref="/primer-anio/materia/apuntes/clase" htmlLoadMode="on-click" />,
    )

    expect(markup).toContain('Ver apunte interactivo')
    expect(markup).toContain('Tocá para abrir la vista previa.')
    expect(markup).not.toContain('/api/apuntes/recursos/recurso-html-1/preview')
  })

  it('mantiene la carga automática por defecto para los apuntes interactivos', () => {
    const markup = renderToStaticMarkup(
      <ApunteRecursoView recurso={htmlRecurso} apunteHref="/primer-anio/materia/apuntes/clase" />,
    )

    expect(markup).toContain('/api/apuntes/recursos/recurso-html-1/preview')
    expect(markup).not.toContain('Ver apunte interactivo')
  })
})
