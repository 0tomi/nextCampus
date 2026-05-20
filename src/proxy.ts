import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import { apiRatelimit, loginRatelimit, getClientIp } from '@/lib/ratelimit'

// Inyecta CSP compatible con SRI, aplica rate limiting en /admin y /api,
// y protege /admin/** (salvo /admin/login) con auth check de Supabase.
// La autorización fina (allowlist de email) se re-chequea en cada server action.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

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

  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // --- CSP con SRI ---
  // En dev, Next.js (Turbopack/HMR) inyecta scripts inline para bootstrap y
  // refresh. Necesita 'unsafe-inline' + 'unsafe-eval'. En prod se mantiene
  // estricto: solo 'self' + SRI vía el bundler.
  const isDev = process.env.NODE_ENV !== 'production'
  const scriptSrc = `'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ''}`
  const styleSrc = "'self' 'unsafe-inline'"

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "font-src 'self'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  let response = NextResponse.next()

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
            response = NextResponse.next()
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
    // Rate limit para API sin CSP de página.
    '/api/:path*',
    // CSP para páginas, salteando assets y prefetches.
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
