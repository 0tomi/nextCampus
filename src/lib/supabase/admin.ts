import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

const supabaseAdminClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

// Cliente con service role. SOLO server-side (storage, operaciones privilegiadas).
// La service role key NUNCA se expone al cliente.
export function createSupabaseAdminClient() {
  return supabaseAdminClient
}
