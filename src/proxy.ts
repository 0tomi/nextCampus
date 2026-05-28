import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import {
  isAuthSessionMissingError,
  isInvalidRefreshTokenError,
  isSupabaseAuthCookie,
} from '@/lib/supabase/auth-errors'
import { apiRatelimit, loginRatelimit, getClientIp } from '@/lib/ratelimit'

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (!isSupabaseAuthCookie(cookie.name)) continue

    request.cookies.delete(cookie.name)
    response.cookies.delete(cookie.name)
  }
}

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

  // --- CSP ---
  // Next.js requiere 'unsafe-inline' en script-src para ejecutar scripts de
  // hidratación inline (__NEXT_DATA__) en páginas estáticas e ISR.
  // 'unsafe-eval' solo se habilita en desarrollo para Hot Module Replacement.
  const isDev = process.env.NODE_ENV !== 'production'
  const scriptSrc = `'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`
  const styleSrc = "'self' 'unsafe-inline'"

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://*.supabase.co https://drive.google.com https://*.googleusercontent.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://drive.google.com https://docs.google.com",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  let response = NextResponse.next()

  // Solo consultamos Supabase en /admin/** o cuando ya hay cookies auth de
  // Supabase presentes. Eso permite limpiar sesiones rotas también en rutas
  // públicas sin pagar el costo en visitantes anónimos.
  const hasSupabaseAuthCookies = request.cookies.getAll().some((cookie) =>
    isSupabaseAuthCookie(cookie.name),
  )

  if (pathname.startsWith('/admin') || hasSupabaseAuthCookies) {
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

    let user = null
    try {
      const result = await supabase.auth.getUser()

      if (result.error) {
        if (isAuthSessionMissingError(result.error)) {
          user = null
        } else if (isInvalidRefreshTokenError(result.error)) {
          clearSupabaseAuthCookies(request, response)
        } else {
          throw result.error
        }
      }

      user = result.data.user
    } catch (error) {
      if (isAuthSessionMissingError(error)) {
        user = null
      } else if (isInvalidRefreshTokenError(error)) {
        clearSupabaseAuthCookies(request, response)
      } else {
        throw error
      }
    }

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
