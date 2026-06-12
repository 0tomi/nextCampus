import { NextResponse } from 'next/server'

function extractMeta(html: string, url: string): { title: string; description: string; image?: string; logo?: string } {
  const result: { title: string; description: string; image?: string; logo?: string } = {
    title: '',
    description: '',
  }

  // Título
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                  html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)
  const twitterTitle = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i)
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)

  const rawTitle = ogTitle?.[1] || twitterTitle?.[1] || titleTag?.[1] || ''
  result.title = decodeHtmlEntities(rawTitle).trim()

  // Descripción
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                 html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i)
  const twitterDesc = html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i)
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                   html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)

  const rawDesc = ogDesc?.[1] || twitterDesc?.[1] || metaDesc?.[1] || ''
  result.description = decodeHtmlEntities(rawDesc).trim()

  // Imagen
  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                  html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
  const twitterImage = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
  
  let rawImage = ogImage?.[1] || twitterImage?.[1]
  if (rawImage) {
    result.image = resolveUrl(rawImage.trim(), url)
  }

  // Favicon / Logo
  const iconPatterns = [
    /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i,
  ]

  let rawLogo: string | undefined
  for (const pattern of iconPatterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      rawLogo = match[1]
      break
    }
  }

  try {
    const parsedUrl = new URL(url)
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`
    result.logo = rawLogo ? resolveUrl(rawLogo.trim(), url) : googleFaviconUrl
  } catch {
    result.logo = rawLogo ? resolveUrl(rawLogo.trim(), url) : undefined
  }

  return result
}

function resolveUrl(to: string, from: string): string {
  try {
    return new URL(to, from).toString()
  } catch {
    return to
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get('url')

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL no proporcionada' }, { status: 400 })
  }

  try {
    const parsed = new URL(targetUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'Protocolo no válido' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'URL no válida' }, { status: 400 })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)

  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 nextCampus/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    })

    if (!res.ok) {
      // Si el sitio responde con error, intentamos dar metadatos mínimos basados en el host
      const hostname = new URL(targetUrl).hostname
      return NextResponse.json({
        title: hostname,
        description: 'Recurso web externo.',
        logo: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
      })
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      const hostname = new URL(targetUrl).hostname
      return NextResponse.json({
        title: hostname,
        description: 'Recurso web.',
        logo: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
      })
    }

    const html = await res.text()
    const metadata = extractMeta(html, targetUrl)

    // Si no pudimos extraer el título, usar el hostname como título
    if (!metadata.title) {
      metadata.title = new URL(targetUrl).hostname
    }

    return NextResponse.json(metadata)
  } catch (err) {
    console.error('Error fetching URL metadata:', err)
    const hostname = new URL(targetUrl).hostname
    return NextResponse.json({
      title: hostname,
      description: 'Enlace externo.',
      logo: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
