import sanitize from 'sanitize-html'

// Sanitiza HTML enriquecido de admins (descripciones de eventos/apuntes).
// Defensa contra XSS / inyección: se aplica ANTES de persistir y al renderizar.
// Whitelist mínima: formato básico + links seguros.
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'ul', 'ol', 'li', 'a', 'h2', 'h3', 'h4',
  'blockquote', 'code', 'pre', 'span',
]

// href viene del input, rel/target los inyecta transformTags.
const ALLOWED_ATTRS: sanitize.IOptions['allowedAttributes'] = {
  a: ['href', 'rel', 'target'],
}

// Protocolos permitidos en href
const ALLOWED_SCHEMES = ['https', 'mailto']

export function sanitizeRichHtml(dirty: string): string {
  return sanitize(dirty ?? '', {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ALLOWED_SCHEMES,
    // Forzar siempre rel y target seguros en todos los <a>.
    transformTags: {
      a: sanitize.simpleTransform('a', {
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      }),
    },
    // Tags peligrosos nunca permitidos — segunda línea de defensa además de la allowlist.
    exclusiveFilter: (frame) => {
      const forbidden = ['script', 'style', 'iframe', 'img', 'object', 'embed', 'svg', 'form', 'input']
      return forbidden.includes(frame.tag)
    },
  })
}
