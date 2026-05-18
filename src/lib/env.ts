// Valida y exporta las variables de entorno requeridas con tipos seguros.
// No usa 'server-only' porque middleware.ts (Edge Runtime) también lo importa;
// los secretos privados no llegan al cliente porque Next.js no los incluye en
// bundles de cliente cuando no tienen el prefijo NEXT_PUBLIC_.
import { z } from 'zod'

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('apuntes'),
  ADMIN_EMAILS: z.string().default(''),
})

const result = schema.safeParse(process.env)

if (!result.success) {
  const missing = result.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('\n  ')
  throw new Error(`Variables de entorno faltantes o inválidas:\n  ${missing}`)
}

export const env = result.data
