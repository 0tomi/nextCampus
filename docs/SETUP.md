# Setup — Credenciales y puesta en marcha

Pasos para dejar el campus funcionando. Todo lo que sigue es trabajo tuyo:
el sandbox no puede crear el proyecto Supabase ni escribir `.env`.

---

## 1. Crear el proyecto en Supabase

1. Entrá a https://supabase.com → **New project**.
2. Anotá la **Database password** que elegís (no se vuelve a mostrar entera).
3. Esperá a que el proyecto termine de aprovisionar.

---

## 2. Obtener las connection strings (Prisma)

En el dashboard: **Project Settings → Database → Connection string**.

Necesitás **dos** URLs:

| Variable | Modo | Puerto | Para qué |
|---|---|---|---|
| `DATABASE_URL` | Transaction pooler (pgbouncer) | **6543** | Runtime de la app (serverless/Vercel) |
| `DIRECT_URL` | Direct connection / Session | **5432** | `prisma migrate` y `prisma db seed` |

> **OBLIGATORIO**: a `DATABASE_URL` agregale el query string
> `?pgbouncer=true&connection_limit=1`. Sin esto, en Vercel explota con
> `prepared statement "s0" already exists`.

Reemplazá `[YOUR-PASSWORD]` por la password del paso 1 (URL-encodeá los
caracteres especiales: `@` → `%40`, etc.).

---

## 3. Obtener las API keys (Auth / Storage)

En **Project Settings → API**:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`
  - ⚠️ Es secreta. Solo server-side. NUNCA la pongas en un `NEXT_PUBLIC_*`.

---

## 4. Crear el bucket de Storage

1. **Storage → New bucket**.
2. Nombre: `apuntes`.
3. Dejalo **privado** (los PDFs se sirven con URLs firmadas temporales,
   ver `src/lib/storage.ts`).

---

## 5. Crear el/los administradores

No hay registro público. El admin se crea a mano:

1. **Authentication → Users → Add user** (email + password).
   - Marcá **Auto Confirm User** (o confirmá el email).
2. Ese email tiene que estar en `ADMIN_EMAILS` (paso 6). La autorización la
   hace la app verificando el JWT (`getUser()`) contra esa allowlist —
   `src/lib/auth.ts`. No hay tabla de admins.

---

## 6. Crear el archivo `.env`

En la raíz del proyecto, creá `.env` (NO se commitea):

```env
# Runtime: pooler pgbouncer 6543 — el query string es obligatorio
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Migraciones / seed: conexión directa 5432
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
SUPABASE_STORAGE_BUCKET="apuntes"

# Allowlist de admins (emails separados por coma, en minúscula)
ADMIN_EMAILS="tu-email@ejemplo.com"
```

---

## 7. Migrar, seedear y levantar

```bash
pnpm install
pnpm db:migrate     # crea las tablas (usa DIRECT_URL)
pnpm db:seed        # carga carrera + años + materias + tipos de evento
pnpm dev            # http://localhost:3000
```

Verificación rápida:

- `/` muestra la carrera y los 5 años → seed OK.
- Navegás a una materia → ves Calendario / Quiz / Apuntes vacíos.
- `/admin/login` → entrás con el usuario del paso 5 → `/admin` te deja
  gestionar contenido. Un email fuera de `ADMIN_EMAILS` ve "No autorizado".
- Como anónimo no ves botones de edición ni podés escribir.

---

## 8. Deploy en Vercel

1. Importá el repo en Vercel.
2. Cargá **todas** las variables del paso 6 en
   **Settings → Environment Variables** (Production + Preview).
3. El `build` ya corre `prisma generate` (ver `package.json`).
4. Las migraciones NO corren solas en el deploy: ejecutá
   `pnpm db:deploy` (usa `prisma migrate deploy`) apuntando a la DB de
   producción antes/después del primer deploy.

---

## Pendiente conocido

- **Rate-limiting** en endpoints de escritura: NO implementado todavía
  (estaba en el paso 7 del plan). Queda como deuda explícita.
- RLS: la autorización real vive en la capa de servidor de Next, no en
  RLS (el acceso a datos va por Prisma con un rol que bypassea RLS).
  Si querés defensa en profundidad, agregá políticas RLS restrictivas;
  no afectan a Prisma pero blindan la superficie anónima de Supabase.
