import { defineConfig } from 'prisma/config'

// Prisma 7: las URLs de datasource viven acá, no en schema.prisma.
// CLI/migraciones usan DIRECT_URL (conexión directa 5432, sin pgbouncer).
// El runtime de la app usa DATABASE_URL pooled vía el driver adapter
// (src/lib/prisma.ts), independiente de esta config.
//
// Fallback inofensivo: permite `prisma generate` (no toca la DB) sin env.
// `prisma migrate`/`db push` SÍ requieren DIRECT_URL real en el entorno.
const directUrl =
  process.env.DIRECT_URL ??
  'postgresql://placeholder:placeholder@localhost:5432/placeholder'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: directUrl,
  },
})
