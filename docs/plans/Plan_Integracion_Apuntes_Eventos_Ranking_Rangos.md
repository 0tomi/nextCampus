# Plan: Integración Apuntes↔Eventos, Ranking de aportadores y Rangos

## 1. Resumen

Implementar tres cambios coordinados:

- **Apuntes anexados a eventos:** nueva tabla pivot `ApunteEvento`, selección/creación de apuntes desde el modal de evento y visualización minimalista de títulos enlazados en eventos.
- **Ranking de aportadores:** nuevos campos invisibles/visibles en `UserAccount`, ranking top 5 en “Nosotros” sin devolver `puntaje`.
- **Rangos:** migrar `ADMIN_GENERAL/ADMIN_CAMPUS` a `ADMIN/SUPERVISOR/AYUDANTE`, con `ADMIN_CAMPUS` existentes pasando a `AYUDANTE`.

## 2. Datos, migraciones y backend

### Migración Prisma/Postgres

- Actualizar `UserRole`:
  - `ADMIN_GENERAL` → `ADMIN`
  - `ADMIN_CAMPUS` → `AYUDANTE`
  - Agregar `SUPERVISOR`
  - Conservar `UserYearPermission`.
- Agregar autoría nullable:
  - `Evento.createdByUserId`
  - `Apunte.createdByUserId`
  - FK a `UserAccount`, `onDelete: SetNull`.
- Agregar campos a `UserAccount`:
  - `nombreUsuario String`
  - `puntaje Int @default(0)` — nunca devuelto por APIs públicas ni admin UI.
  - `eventosCreados Int @default(0)`
  - `apuntesCreados Int @default(0)`
  - `bancosPreguntasCreados Int @default(0)`
- Agregar pivot:
  - `ApunteEvento(apunteId, eventoId, createdAt)`
  - PK compuesta `[apunteId, eventoId]`
  - índices por `eventoId` y `apunteId`
  - FK cascade al borrar evento o apunte.
  - Trigger/constraint SQL para impedir vincular apuntes de otra materia.

### Backfill histórico

- Inicializar `nombreUsuario` con email actual.
- Backfill de autoría y contadores:
  - Eventos/apuntes: usar `audit_logs.entityId + userId` para `EVENTO_CREATED` y `APUNTE_CREATED`.
  - Recursos de apunte: sumar al `puntaje` usando `detail.recursosCount` cuando exista.
  - Quiz: listar bancos en Supabase Storage, leer JSON/meta, matchear `subidoPor` con `UserAccount.email`, sumar `1 + units.length`.
- Si un recurso existente no tiene audit/meta confiable:
  - dejar `createdByUserId = null`;
  - no sumar al ranking;
  - editable solo por `ADMIN` o `SUPERVISOR`.

### Scoring runtime

Crear helper central, por ejemplo `src/lib/contributions.ts`:

- `awardEventoCreated(userId)`:
  - `eventosCreados += 1`
  - `puntaje += 1`
- `awardApunteCreated(userId, recursosCount)`:
  - `apuntesCreados += 1`
  - `puntaje += 1 + recursosCount`
- `awardQuizBankCreated(userId, unitsCount)`:
  - `bancosPreguntasCreados += 1`
  - `puntaje += 1 + unitsCount`

No sumar puntos en updates/deletes para evitar gaming.

### Autorización

- `ADMIN`:
  - acceso global;
  - usuarios, historial, años, materias, eventos, apuntes y quiz.
- `SUPERVISOR`:
  - year-scoped;
  - puede crear/editar/borrar materias, eventos, apuntes y bancos de cualquier usuario en sus años.
- `AYUDANTE`:
  - year-scoped;
  - puede crear eventos, apuntes y bancos;
  - solo puede editar/borrar recursos propios;
  - no puede crear/editar/borrar años, materias, comisiones ni descripciones de materias.

Actualizar `src/lib/auth.ts` con capabilities explícitas, evitando checks genéricos tipo “admin de año” para todo.

### APIs/queries

- Agregar endpoint admin para búsqueda de apuntes:
  - `GET /api/admin/apuntes/search?q=&yearId=&subjectId=`
  - protegido por permisos admin;
  - devuelve solo `id`, `titulo`, `slug`, `subject`, `year`.
- Agregar ranking público:
  - `GET /api/ranking`
  - devuelve top 5 con `position`, `nombreUsuario`, `eventosCreados`, `apuntesCreados`, `bancosPreguntasCreados`.
  - No devolver `puntaje`, `userId`, `authUserId`, email ni audit details.
- Extender queries de eventos para incluir apuntes anexados con shape mínima:
  - `id`, `titulo`, `slug`, `subject.slug`, `subject.year.slug`.

## 3. Frontend

Todas las superficies frontend deben seguir **estrictamente `DESIGN.md`**: dark mode profundo, bordes `white/5–white/10`, controles suaves, texto user-friendly, sin vocabulario técnico, sin emojis y `cursor-pointer` en todo lo clickeable.

### Modal de evento

Modificar `src/components/admin/EventModal.tsx`:

- Agregar sección “Apuntes relacionados”.
- Permitir:
  - asociar apuntes existentes;
  - buscar por título, materia y año;
  - crear un apunte y anexarlo automáticamente.
- En modo año:
  - exigir materia antes de crear apunte inline;
  - si cambia la materia, limpiar selección incompatible.
- En edición:
  - precargar apuntes anexados.
- En submit:
  - enviar `apunteIdsJson`.
- Reutilizar estilos del modal de apunte; no introducir un lenguaje visual nuevo.

Para “crear y asociar”, reutilizar `ApunteModal` con estado de retorno que incluya el apunte creado y lo agregue a la selección del evento.

### Visualización de apuntes en eventos

Mostrar títulos minimalistas enlazados a:

`/[yearSlug]/[subjectSlug]/apuntes/[apunteSlug]`

Superficies:

- Inicio: `HomeGlobalCalendar`
- Año: `YearOverviewEvents`, `YearCalendarView`
- Materia: `SubjectEventsSection`
- Desktop detail sheet: `EventCalendarAdmin`
- Mobile: `MobileCalendar`, `AgendaCard`, `MobileEventDetailSheet`

Regla UI:

- En cards compactas: mostrar 1–2 títulos y `+N` si hace falta.
- En detail sheet: mostrar todos los títulos.
- Mostrar únicamente el título del apunte como texto visible.

### Ranking en “Nosotros”

Modificar `src/components/ui/NosotrosModal.tsx`:

- En desktop, ampliar modal a dos columnas:
  - izquierda: contenido actual;
  - derecha: ranking top 5.
- En mobile, stack vertical.
- Ranking muestra:
  - posición 1–5;
  - `nombreUsuario`;
  - contadores visibles: eventos, apuntes, quiz.
- No mostrar puntaje real.
- Loading/empty state con copy amigable.

### Admin usuarios

Actualizar panel admin:

- Listar `AYUDANTE` y `SUPERVISOR`.
- Crear usuarios como `AYUDANTE` por defecto.
- En edición, permitir cambiar rol entre `AYUDANTE` y `SUPERVISOR`.
- Mantener `ADMIN` fuera de esta pantalla.
- Actualizar copies:
  - “Administrador general” → “Admin”
  - “Administrador de campus” → “Ayudante” o “Supervisor” según rol.

## 4. Archivos principales a tocar

- `prisma/schema.prisma`
- `prisma/migrations/.../migration.sql`
- `src/lib/auth.ts`
- `src/lib/contributions.ts`
- `src/lib/queries.ts`
- `src/app/admin/actions.ts`
- `src/app/admin/users/**`
- `src/app/api/admin/apuntes/search/route.ts`
- `src/app/api/ranking/route.ts`
- `src/components/admin/EventModal.tsx`
- `src/components/ui/NosotrosModal.tsx`
- componentes de eventos en home/año/materia/mobile.

## 5. Tests y validación

### Unit/backend

- Migración roles:
  - `ADMIN_GENERAL` pasa a `ADMIN`.
  - `ADMIN_CAMPUS` pasa a `AYUDANTE`.
- Auth:
  - Admin gestiona todo.
  - Supervisor gestiona todo en años asignados.
  - Ayudante crea recursos en años asignados.
  - Ayudante no edita recursos ajenos.
  - Ayudante no gestiona materias/años/comisiones.
- Contribuciones:
  - evento suma 1 punto y 1 contador.
  - apunte suma `1 + recursosCount` y solo 1 contador.
  - quiz suma `1 + unitsCount` y solo 1 contador.
  - ranking nunca devuelve `puntaje`.

### Integración

- Crear evento sin apuntes.
- Crear evento con uno o más apuntes anexados.
- Rechazar apunte de otra materia.
- Editar evento agregando/removiendo apuntes.
- Crear apunte desde modal de evento y dejarlo anexado.
- Borrar evento/apunte elimina filas pivot.
- Ranking top 5 ordena por `puntaje` pero devuelve solo posición + contadores.

### Frontend

- Modal de evento mantiene estética de `ApunteModal` y `DESIGN.md`.
- Links de apuntes en eventos muestran solo títulos.
- “Nosotros” mantiene estética actual y agrega ranking sin romper mobile.
- Botones/links nuevos tienen `cursor-pointer`.

### Comandos sugeridos

- `pnpm db:generate`
- `pnpm test src/lib/auth.test.ts`
- `pnpm test src/app/admin/actions.test.ts`
- `pnpm test src/app/admin/users`
- `pnpm test src/components/home/HomeGlobalCalendar.test.tsx`
- `pnpm lint`

No correr build salvo pedido explícito del usuario.

## 6. Assumptions cerradas

- `SUPERVISOR` es year-scoped, no global.
- Los `ADMIN_CAMPUS` existentes migran a `AYUDANTE`.
- Recursos históricos sin autor confiable quedan sin dueño y solo los gestiona Admin/Supervisor.
- `nombreUsuario` se inicializa con email; luego se podrá cambiar manualmente.
- El puntaje extra aplica a recursos dentro de un apunte creado, no a recursos dentro de eventos.
- `puntaje` puede usarse para ordenar en backend, pero nunca se serializa al frontend.
