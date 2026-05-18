import DOMPurify from 'isomorphic-dompurify'

// Sanitiza HTML enriquecido de admins (descripciones de eventos/apuntes).
// Defensa contra XSS / inyección: se aplica ANTES de persistir y al renderizar.
// Whitelist mínima: formato básico + links seguros.
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'ul', 'ol', 'li', 'a', 'h2', 'h3', 'h4',
  'blockquote', 'code', 'pre', 'span',
]

// Solo `href`: target/rel los fija el post-step (evita atributos duplicados).
const ALLOWED_ATTR = ['href']

export function sanitizeRichHtml(dirty: string): string {
  const clean = DOMPurify.sanitize(dirty ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
  })
  // Fuerza rel seguro en links que abren en otra pestaña.
  return clean.replace(
    /<a\s+([^>]*?)>/gi,
    (match, attrs: string) =>
      `<a ${attrs} target="_blank" rel="noopener noreferrer nofollow">`,
  )
}
