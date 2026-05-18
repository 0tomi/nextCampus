'use client'

import { createBrowserClient } from '@supabase/ssr'

// Cliente Supabase para el navegador. Solo se usa para el flujo de login admin.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
