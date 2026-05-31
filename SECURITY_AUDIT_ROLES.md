# Auditoría de seguridad — Modelo de roles (Admin / Supervisor / Ayudante)

**Commit auditado:** `2de6a00`
**Fecha:** 2026-05-31
**Alcance:** capa de autorización del campus — `src/lib/auth.ts`, server actions de `admin/`, route handlers de `src/app/api/`, capa de Storage y schema Prisma.

---

## Veredicto

El modelo de 3 roles está **bien implementado**. La autenticación verifica el JWT contra Supabase (`getUser()`, nunca `getSession()`), y la autorización usa dos compuertas consistentes en TODA la superficie de mutación:

1. **Compuerta de año** (`adminCanManageYear`) — Supervisor/Ayudante solo operan sobre sus años permitidos.
2. **Compuerta de propiedad** (`ensureCanManageContribution`) — el Ayudante solo edita/borra lo suyo.

No encontré escalada de privilegios, bypass de ownership, ni fuga de respuestas de quiz. Los hallazgos son menores y de defensa en profundidad.

### Cómo se cumplen los 3 requisitos

| Rol | Requisito | Cómo se garantiza |
|-----|-----------|-------------------|
| **Admin** | hace todo | `requireGeneralAdmin` + `canManageAllYears: true` |
| **Supervisor** | todo, solo sobre años permitidos | `requireAcademicManager` + `requireYearAdminFor*` (scope por año); bloqueado de ABM de años y de usuarios |
| **Ayudante** | crea recursos, solo modifica lo suyo | `canCreateContributions: true` para crear; `ensureCanManageContribution` en TODO edit/delete |

Verifiqué que **cada** mutación alcanzable por un Ayudante aplica la compuerta de propiedad:
`updateEventoFechaAction`, `updateEventoAction`, `deleteEvento`, `updateApunteAction`, `deleteApunteAction`, `deleteQuizBankAction`. Las creaciones (`createEvento`, `createApunteAction`, `uploadQuizBankAction`) solo exigen scope de año, que es lo correcto.

---

## Hallazgos reales

### 1. `getSubjectDeleteImpactAction` no exige `requireAcademicManager` — **Severidad: BAJA** ✅ RESUELTO

> **Estado:** corregido. Se agregó `await requireAcademicManager()` antes del scope (mismo patrón que `deleteSubjectAction`). Cubierto por test de regresión en `src/app/admin/actions.test.ts` (`getSubjectDeleteImpactAction`).


`src/app/admin/actions.ts:1652`

```ts
export async function getSubjectDeleteImpactAction(formData) {
  const id = z.string().min(1).parse(formData.get('id'))
  const scope = await requireYearAdminForSubjectId(id)   // solo scope de año
  if (!scope) return null
  return getSubjectDeleteImpact(id)
}
```

Su hermana `deleteSubjectAction` (línea 1609) sí exige `requireAcademicManager()` **además** del scope. Esta no. Un **Ayudante** con permiso en el año de la materia puede invocar la server action directamente (no por UI) y leer el "impacto de borrado": conteos de apuntes, eventos, quizzes y comisiones.

**Por qué es solo BAJA:** únicamente revela conteos dentro de un año que el ayudante ya puede ver, y NO permite borrar nada. Pero es una inconsistencia clara con el resto del ABM de materias.

**Fix:**
```ts
await requireAcademicManager()
const scope = await requireYearAdminForSubjectId(id)
```

---

### 2. La autorización vive en un Data Access Layer (patrón correcto) — **Observación, no hallazgo**

> **Corrección respecto de una versión previa de este reporte:** una versión anterior marcaba "no existe `middleware.ts`" como una fragilidad y recomendaba agregar un middleware que gatee `/admin/*`. **Eso era incorrecto** y quedó desactualizado para Next.js 16 (este proyecto: `next@16.2.6`).

Hechos verificados contra la skill `next-best-practices` y la doc de Next 16:

- En Next.js 16 `middleware.ts` se renombró a **`proxy.ts`**. El nombre viejo ya no aplica.
- La guía oficial de Next.js indica que la autorización debe vivir en el **Data Access Layer** (el check colocado junto al acceso al dato), **no** en middleware/proxy. Middleware/proxy sirve para redirects optimistas, no como barrera de auth (cf. CVE-2025-29927, bypass de auth en middleware).

Este proyecto **ya implementa el patrón recomendado**: los helpers `require*` de `src/lib/auth.ts` actúan como Data Access Layer y se aplican consistentemente en cada server action, route handler y page. Eso es una **fortaleza**, no una deuda.

**Única recomendación residual (opcional, defensa en profundidad real a nivel DB):**
- La DB se accede con Prisma + service-role de Supabase (`createSupabaseAdminClient`), que bypassea RLS. Si se quisiera una segunda red **a nivel base de datos** (no en el borde), se podría evaluar RLS en Supabase. Es opcional: el DAL ya cubre la autorización correctamente.
- Mantener como invariante de equipo: "toda mutación/lectura sensible arranca con un `require*`". Es el patrón que Next.js recomienda y que el código ya respeta.

---

### 3. Ownership de bancos de quiz es por **email**, no por **id** — **Severidad: BAJA / integridad** ✅ RESUELTO

> **Estado:** corregido. Se agregó `subidoPorId` (opcional) a la meta del banco; `uploadQuizBank` ahora persiste el id de la cuenta y `deleteQuizBankAction` compara por id, con fallback al email **solo** para metas viejas que aún no tienen `subidoPorId` (ningún ayudante pierde acceso a sus bancos previos).


`src/app/admin/actions.ts:1139`

```ts
if (!scope.admin.canManageAnyContribution && meta?.subidoPor !== scope.admin.email) {
  return
}
```

El resto del sistema chequea propiedad por `createdByUserId === admin.id`. Acá se compara contra el **email** guardado en la meta del banco. Si un Ayudante cambia su email (acción de perfil), pierde la capacidad de borrar sus propios bancos.

**Por qué no es vulnerabilidad:** falla **cerrado** (deniega de más, no de menos). Es un quirk de integridad, no de seguridad.

**Fix sugerido:** persistir `userId` en la meta del banco y comparar por id (alinea el criterio con apuntes/eventos).

---

## Falsos positivos descartados

| Sospecha | Por qué se descarta |
|----------|---------------------|
| Rutas públicas sin auth (`/api/apuntes`, `/api/ranking`, preview de recursos) | Contenido académico **público** por diseño; no exponen datos sensibles. |
| El quiz filtraría las respuestas correctas | **No.** `/api/quiz/set` arma el set con `toPublicQuestion` (sin `answer` ni `explanation`); la corrección es server-side en `/api/quiz/answer` recargando el banco desde Storage. Las respuestas nunca viajan al cliente. Un `id` forjado se rechaza contra el manifest de la materia. Blindaje correcto. |
| `'unsafe-inline'` en la CSP del preview de apuntes | Mitigado: `sandbox allow-scripts` **sin** `allow-same-origin` → origen opaco, el iframe no accede a cookies/Storage/DOM del campus. Además, solo Admins suben artifacts. |
| Bootstrap admin vía `ADMIN_EMAILS` re-fuerza rol ADMIN en cada request | Escape hatch **intencional**; su seguridad depende de una env var controlada por infra. |
| Recursos huérfanos (`createdByUserId = null` tras borrar un usuario, por `onDelete: SetNull`) | `adminCanManageContribution(ayudante, null)` → `false`. Falla cerrado: ningún ayudante puede tocarlos. |
| `/api/admin/me` expone capabilities al cliente | Son para UX (mostrar/ocultar botones). El server **siempre** revalida en cada mutación; no son barrera y no se confía en ellas. |

---

## Resumen ejecutivo

- **Crítico/Alto:** ninguno.
- **Medio:** ninguno.
- **Bajo:** #1 (`getSubjectDeleteImpactAction` sin gate de academic manager) y #3 (ownership de quiz por email).
- **Observación (no hallazgo):** #2 — la autorización vive en un Data Access Layer (`require*`), que es el patrón **recomendado** por Next.js 16. RLS a nivel DB queda como opción de defensa en profundidad.

La arquitectura de permisos es sólida y consistente. El único fix de código concreto recomendado es el #1 (una línea).
