<div align="center">

# nextCampus

**Un campus estudiantil hecho por estudiantes, para estudiantes.**

Porque el campus que nos da la facultad no alcanza.

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

🌐 **[Accedé al sitio →]()**  <!-- reemplazá con la URL cuando esté disponible -->

</div>

---

## ¿De qué se trata?

nextCampus nació de una frustración compartida: el campus virtual que nos provee la facultad no cubre las necesidades reales del día a día como estudiante. Falta organización, faltan herramientas de estudio, falta algo hecho con intención.

Este proyecto es nuestra respuesta. Un campus alternativo construido desde cero por estudiantes, pensado para estudiantes. Es **público, abierto y colaborativo** — cualquiera puede usarlo, y cualquiera puede contribuir.

## ¿Qué tiene?

### 📅 Calendario por materia
Cada materia tiene su propia agenda con eventos categorizados por tipo: exámenes, trabajos prácticos, exposiciones. Los eventos soportan descripciones enriquecidas con hipervínculos y formato.

### 🧠 Quiz por materia
Sistema de evaluación organizado por unidades temáticas. Soporta múltiple opción, verdadero/falso y respuesta corta. Cada pregunta incluye su explicación. Diseñado para que el alumno pueda elegir cómo evaluarse: por unidad, por tiempo, o en modo práctica con feedback inmediato.

### 📚 Apuntes
Repositorio de material de estudio por materia. Soporta PDFs (almacenados en Supabase Storage) y entradas descriptivas con enlaces a Drive, Docs, o cualquier recurso externo.

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript estricto — `any` es error de lint |
| Frontend | React 19 + Tailwind CSS 4 |
| ORM | Prisma 7 con driver adapter (`@prisma/adapter-pg`) |
| Base de datos | Supabase Postgres |
| Storage | Supabase Storage (bucket privado `apuntes`: PDFs y bancos de quiz) |
| Auth | Supabase Auth — solo admins, sin registro público |
| Validación | Zod 4 |
| Package manager | pnpm |
| Deploy | Vercel |

## Modelo de administración

El campus no tiene registro público.

- `ADMIN_EMAILS` sirve como **bootstrap** de los usuarios **AdminGeneral**.
- Un **AdminGeneral** tiene acceso total y puede gestionar usuarios desde **`/admin/users`**.
- Los usuarios **AdminCampus** se crean y editan desde **`/admin/users`**.
- Un **AdminCampus** administra solamente los años académicos que tenga asignados.
- Si un usuario queda **desactivado**, deja de poder usar las secciones administrativas de la app.

## Configuración local

Creá un `.env` en la raíz del proyecto con las siguientes variables:

```env
# Conexión runtime (pooler pgbouncer, puerto 6543)
DATABASE_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Conexión directa para migraciones (puerto 5432)
DIRECT_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
SUPABASE_SECRET_KEY="<secret-key>"
SUPABASE_STORAGE_BUCKET="apuntes"
ADMIN_EMAILS="admin@ejemplo.com"
```

> **Nota:** El `?pgbouncer=true&connection_limit=1` en `DATABASE_URL` es obligatorio para entornos serverless. Sin él aparece el error `prepared statement "s0" already exists`.

### Primer acceso administrativo

1. Creá en Supabase Auth un usuario con email y contraseña.
2. Agregá ese email a `ADMIN_EMAILS`.
3. Iniciá sesión en `/admin/login`.

Con eso, ese usuario queda habilitado como **AdminGeneral**. Después, desde **`/admin/users`**, puede crear y editar usuarios **AdminCampus**.

### Puesta en marcha

```bash
pnpm install
pnpm db:migrate   # crea las tablas
pnpm db:seed      # carga datos iniciales (carrera, años, materias)
pnpm dev          # http://localhost:3000
```

Para una guía paso a paso, ver **`docs/SETUP.md`**.

## Contribuir

El proyecto es completamente abierto. Si encontrás algo que falta, algo que está mal, o simplemente querés agregar una feature que te haría la vida más fácil como estudiante — abrí un issue o mandá un PR.

No hay burocracia. Solo ganas de construir algo útil.

---

<div align="center">
  <sub>Hecho con frustración productiva por estudiantes de Licenciatura en Sistemas.</sub>
</div>
