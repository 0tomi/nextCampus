import 'server-only'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './supabase/server'
import { env } from '@/lib/env'

export interface AdminUser {
  id: string
  email: string
}

function adminAllowlist(): string[] {
  return env.ADMIN_EMAILS
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

// Devuelve el admin autenticado o null. Usa getUser() (verifica el JWT contra
// Supabase), NUNCA getSession() (que confía en la cookie sin validar).
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return null
  const email = user.email.toLowerCase()
  if (!adminAllowlist().includes(email)) return null
  return { id: user.id, email }
}

// Redirige a /admin/login si no hay admin. Para usar al inicio de toda server
// action de escritura. Usa redirect() para un 302 limpio en lugar de un 500.
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser()
  if (!admin) {
    redirect('/admin/login')
  }
  return admin
}
