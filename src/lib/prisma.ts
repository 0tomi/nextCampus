import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../prisma/generated/client/client'

// Runtime: conexión pooled de Supabase (pgbouncer, puerto 6543).
// El adapter pg toma DATABASE_URL directamente; las migraciones usan DIRECT_URL
// vía prisma.config.ts. Una sola instancia por proceso (evita agotar conexiones
// en serverless / hot-reload de Next dev).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL no está definida')
  }
  const adapter = new PrismaPg({
    connectionString,
    // Serverless: cada instancia (Lambda/Edge) abre su propio pool.
    // Supabase Transaction Pooler → 200 slots. Con max=2 soportamos
    // hasta 100 instancias concurrentes sin agotar conexiones.
    max: 2,
    idleTimeoutMillis: 30_000,
  })
  return new PrismaClient({ adapter })
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
