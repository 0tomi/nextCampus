# NextCampus

Campus estudiantil — Next.js (App Router) + TypeScript + Prisma + Supabase.
Contenido público de solo lectura; edición restringida a administradores.
Gestor de paquetes: **pnpm** (no npm). Deploy objetivo: **Vercel**.

## Stack

- Next.js 16 App Router, React 19, TypeScript estricto (ESLint `no-explicit-any: error`)
- Tailwind CSS 4
- Prisma 7 (driver adapter `@prisma/adapter-pg`) sobre Supabase Postgres
- Supabase Auth (solo admins) + Supabase Storage (PDFs de apuntes)

## Variables de entorno

El sandbox bloquea archivos `.env*`; creá vos un `.env` en la raíz con:

```env
# Runtime (app): pooler pgbouncer 6543. OBLIGATORIO ?pgbouncer=true&connection_limit=1
DATABASE_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# Migraciones / Prisma CLI: conexión directa 5432
DIRECT_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"   # solo server-side, NUNCA al cliente
SUPABASE_STORAGE_BUCKET="apuntes"
```

> El `?pgbouncer=true&connection_limit=1` en `DATABASE_URL` es obligatorio: sin él,
> en serverless explota con `prepared statement "s0" already exists`.

## Comandos

```bash
pnpm install
pnpm db:migrate     # prisma migrate dev (usa DIRECT_URL)
pnpm db:seed        # carga carrera fija + años + materias + TipoEvento
pnpm dev            # http://localhost:3000
pnpm lint           # falla ante cualquier `any`
pnpm build          # prisma generate && next build
```
