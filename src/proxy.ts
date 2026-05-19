import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import { apiRatelimit, loginRatelimit, getClientIp } from '@/lib/ratelimit'

// Inyecta CSP con nonce por request, aplica rate limiting en /admin y /api,
// y protege /admin/** (salvo /admin/login) con auth check de Supabase.
// La autorización fina (allowlist de email) se re-chequea en cada server action.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // --- Nonce + CSP ---
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV !== 'production'
  const scriptSrc = `'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`
  const styleSrc = `'self' 'nonce-${nonce}'`

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "font-src 'self'",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  // Propagar el nonce al render como request header (los Server Components lo leen vía headers()).
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  // --- Rate limiting (solo /admin y /api) ---
  const shouldRateLimit = pathname.startsWith('/admin') || pathname.startsWith('/api')
  if (shouldRateLimit) {
    const ip = getClientIp(request.headers)
    const isLoginPath = pathname === '/admin/login'
    const limiter = isLoginPath ? loginRatelimit : apiRatelimit
    if (limiter) {
      const { success, limit, remaining, reset } = await limiter.limit(ip)
      if (!success) {
        return new NextResponse('Demasiadas solicitudes', {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        })
      }
    }
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } })

  // El check de Supabase solo corre en /admin/** para evitar latencia en rutas
  // públicas. La CSP y el rate limit ya se aplicaron arriba.
  if (pathname.startsWith('/admin')) {
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value)
            }
            response = NextResponse.next({ request: { headers: requestHeaders } })
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options)
            }
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const isAdminArea = pathname !== '/admin/login'
    if (isAdminArea && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('redirectTo', pathname)
      const redirectResponse = NextResponse.redirect(url)
      redirectResponse.headers.set('Content-Security-Policy', csp)
      return redirectResponse
    }
  }

  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    // Aplica a todo salvo assets estáticos / optimizaciones / API.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
