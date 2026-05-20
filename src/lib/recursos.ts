export type RecursoTipo = 'YOUTUBE' | 'DRIVE'

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
