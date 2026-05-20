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

En **Project Settings → API Keys**:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **Publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Secret key** → `SUPABASE_SECRET_KEY`
  - ⚠️ Es secreta. Solo server-side. Nunca la pongas en un `NEXT_PUBLIC_*`.

> Supabase también mantiene claves legacy como `anon` y `service_role`, pero en
> este proyecto la configuración documentada usa **Publishable key** y **Secret key**.

---

## 4. Crear el bucket de Storage

1. **Storage → New bucket**.
2. Nombre: `apuntes`.
3. Dejalo **privado**.

---

## 5. Preparar el acceso administrativo

El campus no tiene registro público.

### AdminGeneral

`ADMIN_EMAILS` funciona como bootstrap de **AdminGeneral**.

1. En **Authentication → Users**, creá un usuario con email y contraseña.
2. Confirmá el usuario si hace falta.
3. Agregá ese email a `ADMIN_EMAILS` en el `.env`.
4. Iniciá sesión en `/admin/login`.

Ese primer acceso habilita al usuario como **AdminGeneral**, con acceso total.

### AdminCampus

Los usuarios **AdminCampus** no se cargan en `ADMIN_EMAILS`.
Se gestionan desde **`/admin/users`**.

- Los crea un **AdminGeneral**.
- Se les puede asignar uno o varios años académicos.
- Se les puede cambiar email, contraseña, estado y años asignados.
- Si quedan **desactivados**, pierden acceso administrativo en la app.

---

## 6. Crear el archivo `.env`

En la raíz del proyecto, creá `.env` (NO se commitea):

```env
# Runtime: pooler pgbouncer 6543 — el query string es obligatorio
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Migraciones / seed: conexión directa 5432
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
SUPABASE_SECRET_KEY="<secret-key>"
SUPABASE_STORAGE_BUCKET="apuntes"

# Bootstrap de administradores generales (emails separados por coma, en minúscula)
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
- `/admin/login` → entrás con el usuario incluido en `ADMIN_EMAILS`.
- `/admin/users` → un **AdminGeneral** puede crear y editar usuarios **AdminCampus**.
- Un usuario **AdminCampus** desactivado ya no puede gestionar contenido.
- Como anónimo no ves botones de edición ni podés escribir.

---

## 8. Cómo se crean y editan usuarios

La sección **`/admin/users`** usa Supabase Auth del lado del servidor para:

- crear usuarios con email y contraseña,
- actualizar email,
- cambiar contraseña cuando haga falta.

Como la operación usa una clave secreta, no hace falta exponer credenciales en el navegador.

---

## 9. Deploy en Vercel

1. Importá el repo en Vercel.
2. Cargá **todas** las variables del paso 6 en
   **Settings → Environment Variables** (Production + Preview).
3. El `build` ya corre `prisma generate` (ver `package.json`).
4. Las migraciones NO corren solas en el deploy: ejecutá
   `pnpm db:deploy` (usa `prisma migrate deploy`) apuntando a la DB de
   producción antes/después del primer deploy.

---

## Pendientes conocidos

- **Rate-limiting** en endpoints de escritura: recomendado para producción.
- RLS: el proyecto incluye una base de políticas restrictivas para tablas públicas.
  Si más adelante ampliás la superficie expuesta, revisá esas políticas junto con
  las nuevas rutas.
