// Valida y exporta las variables de entorno requeridas con tipos seguros.
// No usa 'server-only' porque proxy.ts también lo importa; los secretos
// privados no llegan al cliente porque Next.js no los incluye en bundles
// de cliente cuando no tienen el prefijo NEXT_PUBLIC_.
import { z } from 'zod'

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('apuntes'),
  ADMIN_EMAILS: z.string().min(1, 'ADMIN_EMAILS requerido'),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
})

const result = schema.safeParse(process.env)

if (!result.success) {
  const missing = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ')
  console.error('[env] Variables faltantes o inválidas:\n  ' + missing)
  throw new Error('Configuración del servidor inválida')
}

export const env = result.data
