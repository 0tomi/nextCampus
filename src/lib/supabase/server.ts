import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

// Cliente Supabase ligado a las cookies de la request (sesión SSR).
// Se usa SOLO para auth (getUser). Los datos van por Prisma.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Llamado desde un Server Component: lo maneja el middleware.
          }
        },
      },
    },
  )
}
