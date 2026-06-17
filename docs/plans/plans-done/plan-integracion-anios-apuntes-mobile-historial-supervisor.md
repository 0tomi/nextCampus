# Plan de integración: años, apuntes interactivos, mobile e historial Supervisor

## Resumen

- Usar las skills relevantes del proyecto: `planificar`, `brainstorming`, `next-best-practices`, `frontend-design`, `tailwind-css-patterns`, `prisma-client-api`, `supabase` y `supabase-postgres-best-practices`.
- Implementar los links de Drive/playlist en años académicos siguiendo el patrón existente de materias.
- Mejorar edición y preview de apuntes interactivos sin romper el flujo actual.
- Habilitar historial para Supervisores, filtrado solo por años supervisados.
- Al terminar implementación: commit obligatorio con Conventional Commit, sin atribución IA.

## Cambios clave

### 1) Drive y playlist en año académico

- Agregar a `AcademicYear`:
  - `driveUrl String?`
  - `playlistUrl String?`
  - `playlistEnabled Boolean @default(false)`
- Extender `YearModal` con:
  - descripción editable,
  - enlace de Google Drive,
  - playlist de YouTube validada igual que en materias.
- Mostrar en la página del año y mobile:
  - descripción del año,
  - botón “Drive del año” si hay `driveUrl`,
  - botón “Playlist del año” si hay `playlistUrl`.
- Actualizar queries/cache/revalidaciones para incluir estos campos.

### 2) Reemplazar recurso interactivo en edición de Apunte

- En `ApunteModal`, cuando un recurso HTML existente tenga `storageKey`, mostrar:
  - estado “Apunte interactivo cargado”,
  - botón `Reemplazar`,
  - botón `Cancelar reemplazo` si ya se eligió reemplazar.
- Si se reemplaza, conservar el recurso anterior hasta guardar.
- Al guardar:
  - subir el nuevo archivo,
  - conservar orden/nombre/categorías,
  - eliminar el archivo viejo de Storage solo después de una actualización exitosa.
- Mantener el flujo actual de borrar recurso como alternativa.

### 3) Preview de apunte interactivo dentro de materias

- Extraer/reutilizar el comportamiento expandible de `HtmlPreviewIframe` de la página del apunte.
- En la vista de materia, los recursos HTML deben renderizar una preview compacta embebida, con:
  - borde sutil y consistente,
  - iframe lazy,
  - botón `Expandir`,
  - vista expandida full-screen igual a la vista del apunte.
- Eliminar el modal/borde viejo de la preview de materia para unificar estética.

### 4) Animación mobile entre secciones de materia

- En `SubjectTabs`, animar cambio entre Agenda / Quiz / Apuntes con transición suave:
  - fade + leve desplazamiento horizontal/vertical,
  - duración corta,
  - `prefers-reduced-motion` respetado.
- Agregar keyframes mínimos en `globals.css`, sin dependencias nuevas.

### 5) Historial para Supervisores

- Agregar a `AuditLog` campos denormalizados:
  - `yearId String?`
  - `yearSlug String?`
  - índices por `yearId + createdAt + id`.
- Extender `recordAudit` para aceptar `yearId/yearSlug`.
- Actualizar todas las acciones con alcance académico para registrar esos campos.
- Backfill best-effort de logs existentes usando:
  - `detail.yearSlug`,
  - `entityType='year'`,
  - `subjectSlug` en logs antiguos,
  - joins contra `Subject/AcademicYear` cuando sea posible.
- Cambiar `/admin/historial` y APIs:
  - Admin ve todo.
  - Supervisor ve solo logs con `yearId` dentro de sus permisos.
  - Logs sin año quedan ocultos para Supervisor.
- Mostrar “Historial” en sidebar para Admin y Supervisor.

## Test plan

- Tests unitarios/route:
  - auth/capabilities para acceso de Supervisor a historial.
  - historial API filtra por `yearId`.
  - usuarios del filtro de historial quedan acotados al alcance del Supervisor.
  - edición de apunte conserva/reemplaza `storageKey` correctamente.
- Tests UI/manuales:
  - año con/sin Drive y playlist en desktop/mobile.
  - editar año y verificar revalidación.
  - reemplazar apunte interactivo y confirmar que abre el nuevo.
  - preview compacta y expandida desde materia.
  - animación mobile entre tabs.
- Ejecutar `pnpm test` y `pnpm lint`. No correr build salvo pedido explícito.

## Supuestos

- Los links de año deben ser administrados por Admin general, igual que el resto del ABM de años actual.
- Para Supervisores, es preferible ocultar logs históricos sin año identificable antes que arriesgar mostrar movimientos fuera de alcance.
- La playlist se muestra si existe URL, siguiendo el comportamiento actual de materias.
