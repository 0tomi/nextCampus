export type RecursoTipo = 'YOUTUBE' | 'DRIVE' | 'HTML' | 'REPOSITORY' | 'OTHER'

export function isValidHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
])

const DRIVE_HOSTS = new Set([
  'drive.google.com',
  'docs.google.com',
])

export function detectarRecurso(rawUrl: string): { tipo: RecursoTipo; url: string } | null {
  let u: URL
  try {
    u = new URL(rawUrl)
  } catch {
    return null
  }

  if (u.protocol !== 'https:') return null

  const host = u.hostname

  if (YOUTUBE_HOSTS.has(host)) {
    return { tipo: 'YOUTUBE', url: u.toString() }
  }

  if (DRIVE_HOSTS.has(host)) {
    return { tipo: 'DRIVE', url: u.toString() }
  }

  if (host === 'github.com' || host.endsWith('.github.com')) {
    return { tipo: 'REPOSITORY', url: u.toString() }
  }

  return null
}

// Regex para validar el formato de un YouTube video ID (11 caracteres alfanuméricos + _ -)
const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/

export function extraerYoutubeId(rawUrl: string): string | null {
  let u: URL
  try {
    u = new URL(rawUrl)
  } catch {
    return null
  }

  const host = u.hostname
  const segments = u.pathname.split('/').filter(Boolean)

  let id: string | null = null

  if (host === 'youtu.be') {
    // youtu.be/<id>
    id = segments[0] ?? null
  } else if (
    host === 'youtube.com' ||
    host === 'www.youtube.com' ||
    host === 'm.youtube.com'
  ) {
    if (u.pathname === '/watch' || u.pathname.startsWith('/watch')) {
      // youtube.com/watch?v=<id>
      id = u.searchParams.get('v')
    } else if (segments[0] === 'shorts' || segments[0] === 'embed') {
      // youtube.com/shorts/<id> or youtube.com/embed/<id>
      id = segments[1] ?? null
    }
  } else if (host === 'www.youtube-nocookie.com' || host === 'youtube-nocookie.com') {
    if (segments[0] === 'embed') {
      // youtube-nocookie.com/embed/<id>
      id = segments[1] ?? null
    }
  }

  if (!id) return null
  if (!YOUTUBE_ID_RE.test(id)) return null

  return id
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`
}

// ---------------------------------------------------------------------------
// Drive
// ---------------------------------------------------------------------------

export type DriveKind = 'file' | 'document' | 'spreadsheet' | 'presentation'

interface DriveParsed {
  kind: DriveKind
  id: string
  resourceKey?: string
}

// IDs de Google Drive/Docs son alfanuméricos + `_` y `-`.
const DRIVE_ID_RE = /^[a-zA-Z0-9_-]+$/

/**
 * Parsea una URL de Google Drive/Docs y devuelve el tipo de recurso y su ID.
 * Soporta:
 *   - drive.google.com/file/d/{ID}/...
 *   - drive.google.com/open?id={ID}
 *   - drive.google.com/uc?id={ID}
 *   - drive.google.com/thumbnail?id={ID}
 *   - docs.google.com/document/d/{ID}/...
 *   - docs.google.com/spreadsheets/d/{ID}/...
 *   - docs.google.com/presentation/d/{ID}/...
 *
 * Devuelve null para cualquier otro formato o URL malformada.
 */
export function extraerDriveFileId(rawUrl: string): DriveParsed | null {
  let u: URL
  try {
    u = new URL(rawUrl)
  } catch {
    return null
  }

  if (u.protocol !== 'https:') return null

  const host = u.hostname
  const segments = u.pathname.split('/').filter(Boolean)

  let kind: DriveKind | null = null
  let id: string | null = null
  const resourceKey = u.searchParams.get('resourcekey') ?? undefined

  if (host === 'drive.google.com') {
    if (segments[0] === 'file' && segments[1] === 'd' && segments[2]) {
      kind = 'file'
      id = segments[2]
    } else if (u.pathname === '/open' || u.pathname === '/uc' || u.pathname === '/thumbnail') {
      const queryId = u.searchParams.get('id')
      if (queryId) {
        kind = 'file'
        id = queryId
      }
    }
  } else if (host === 'docs.google.com') {
    if (segments[1] === 'd' && segments[2]) {
      if (segments[0] === 'document') {
        kind = 'document'
        id = segments[2]
      } else if (segments[0] === 'spreadsheets') {
        kind = 'spreadsheet'
        id = segments[2]
      } else if (segments[0] === 'presentation') {
        kind = 'presentation'
        id = segments[2]
      }
    }
  }

  if (!kind || !id) return null
  if (!DRIVE_ID_RE.test(id)) return null

  return resourceKey ? { kind, id, resourceKey } : { kind, id }
}

function withResourceKey(url: string, resourceKey?: string): string {
  if (!resourceKey) return url
  const u = new URL(url)
  u.searchParams.set('resourcekey', resourceKey)
  return u.toString()
}

/**
 * Devuelve la URL de embed oficial `/preview` para un recurso de Drive/Docs.
 * Sin OAuth, sin heurísticas: si el archivo no es público, el iframe muestra
 * el aviso nativo de Google pidiendo permisos.
 */
export function driveEmbedUrl(parsed: DriveParsed): string {
  const resourceKey = parsed.resourceKey
  switch (parsed.kind) {
    case 'file':
      return withResourceKey(`https://drive.google.com/file/d/${parsed.id}/preview`, resourceKey)
    case 'document':
      return withResourceKey(`https://docs.google.com/document/d/${parsed.id}/preview`, resourceKey)
    case 'spreadsheet':
      return withResourceKey(`https://docs.google.com/spreadsheets/d/${parsed.id}/preview`, resourceKey)
    case 'presentation':
      return withResourceKey(`https://docs.google.com/presentation/d/${parsed.id}/preview`, resourceKey)
  }
}

export function driveThumbnailUrl(parsed: DriveParsed, width = 1200): string {
  const u = new URL('https://drive.google.com/thumbnail')
  u.searchParams.set('id', parsed.id)
  u.searchParams.set('sz', `w${width}`)
  if (parsed.resourceKey) u.searchParams.set('resourcekey', parsed.resourceKey)
  return u.toString()
}

export type DrivePreviewMode = 'embed' | 'thumbnail' | 'fallback'

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v'])
const DOCUMENT_EXTENSIONS = new Set(['pdf'])
const UNSAFE_PREVIEW_EXTENSIONS = new Set([
  'html',
  'htm',
  'ppt',
  'pptx',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'zip',
  'rar',
  '7z',
])

export function inferDrivePreviewMode(
  parsed: DriveParsed,
  label?: string | null,
): DrivePreviewMode {
  if (parsed.kind !== 'file') return 'embed'

  const normalized = label?.trim().toLowerCase() ?? ''
  const extension = normalized.match(/\.([a-z0-9]+)$/)?.[1]

  if (extension) {
    if (IMAGE_EXTENSIONS.has(extension)) return 'thumbnail'
    if (VIDEO_EXTENSIONS.has(extension) || DOCUMENT_EXTENSIONS.has(extension)) return 'embed'
    if (UNSAFE_PREVIEW_EXTENSIONS.has(extension)) return 'fallback'
  }

  if (/\b(html?|pptx?|docx?|xlsx?|zip|rar|7z)\b/.test(normalized)) {
    return 'fallback'
  }

  return 'thumbnail'
}

/**
 * Nombre genérico user-friendly para mostrar cuando el recurso no tiene
 * nombre custom.
 */
export function nombreFallbackRecurso(tipo: RecursoTipo): string {
  switch (tipo) {
    case 'YOUTUBE':
      return 'Video de YouTube'
    case 'DRIVE':
      return 'Archivo de Drive'
    case 'HTML':
      return 'Vista interactiva'
    case 'REPOSITORY':
      return 'Repositorio de GitHub'
    case 'OTHER':
      return 'Recurso externo'
  }
}
