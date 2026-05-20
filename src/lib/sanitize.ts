import DOMPurify from 'isomorphic-dompurify'

// Sanitiza HTML enriquecido de admins (descripciones de eventos/apuntes).
// Defensa contra XSS / inyección: se aplica ANTES de persistir y al renderizar.
// Whitelist mínima: formato básico + links seguros.
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'ul', 'ol', 'li', 'a', 'h2', 'h3', 'h4',
  'blockquote', 'code', 'pre', 'span',
]

// Solo `href` como atributo permitido — rel/target los fija el hook afterSanitizeAttributes.
const ALLOWED_ATTR = ['href']

// Tags peligrosos nunca permitidos — segunda línea de defensa además de la allowlist.
const FORBIDDEN_TAGS = [
  'script', 'style', 'iframe', 'img', 'object', 'embed',
  'svg', 'form', 'input',
]

// Protocolos permitidos en href
const SAFE_HREF_RE = /^(https:|mailto:)/i

export function sanitizeRichHtml(dirty: string): string {
  // Usamos addHook para el patrón canónico de DOMPurify:
  // afterSanitizeAttributes garantiza que rel/target se aplican DESPUÉS de que
  // DOMPurify ya limpió los atributos, evitando que el HTML de entrada los override.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName !== 'A') return

    const href = node.getAttribute('href')

    // Si el href no es https: ni mailto:, eliminarlo.
    if (href !== null && !SAFE_HREF_RE.test(href)) {
      node.removeAttribute('href')
    }

    // Forzar siempre rel y target seguros en todos los <a>.
    node.setAttribute('rel', 'noopener noreferrer nofollow')
    node.setAttribute('target', '_blank')
  })

  const clean = DOMPurify.sanitize(dirty ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
  })

  // Limpiar el hook después de usar para no acumular hooks en llamadas sucesivas.
  DOMPurify.removeHook('afterSanitizeAttributes')

  return clean
}
