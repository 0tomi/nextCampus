import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Cliente con service role. SOLO server-side (storage, operaciones privilegiadas).
// La service role key NUNCA se expone al cliente.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
