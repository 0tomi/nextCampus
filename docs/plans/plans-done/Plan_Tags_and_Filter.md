# Plan: Categorías de apuntes + filtros infinitos en apuntes e historial admin

## Resumen
- Agregar categorías persistidas para apuntes con relación muchos-a-muchos, seed inicial y migración de apuntes existentes a **Otro**.
- Mostrar categorías como tags editables en el modal admin y como filtros multi-tag en la sección de apuntes.
- Reemplazar cargas completas/paginación por cursor pagination: **15 apuntes** por tanda y **20 movimientos** de historial por tanda.
- Investigación Drive: sin API key no se puede obtener MIME/nombre real de un archivo Drive genérico desde el iframe. Se mantiene preview existente y solo se infieren tags por URL obvia o nombre escrito por el admin. Fuentes: [Drive Files API](https://developers.google.com/workspace/drive/api/reference/rest/v3/files), [metadata Drive](https://developers.google.com/workspace/drive/api/guides/file-metadata), [resource keys](https://developers.google.com/workspace/drive/api/guides/resource-keys).

## Cambios clave
- **Base de datos / Prisma**
  - Crear `Categoria` con `id`, `nombre @unique`.
  - Crear `ApunteCategoria` pivot con `apunteId`, `categoriaId`, PK compuesta e índices por categoría.
  - Relacionar `Apunte.categorias`.
  - Seed/migración con: `Otro`, `Documento`, `Herramienta`, `Cuestionario`, `Video`, `Imágenes`, `Pizarra`, `Interactivo`.
  - Backfill: todos los apuntes existentes reciben `Otro`.
  - Enforce mínimo una categoría con validación server-side y, si es viable en la migración, constraint trigger diferido de Postgres para evitar apuntes sin categoría al final de una transacción.
  - Agregar índices para scroll infinito:
    - apuntes por `subjectId + createdAt + id`;
    - pivot por `categoriaId + apunteId`;
    - audit logs por `createdAt + id`, `userId + createdAt + id`, `action + createdAt + id`.

- **Categorías de apuntes**
  - Crear helper compartido para inferir tags:
    - recurso `HTML` → `Interactivo`;
    - YouTube → `Video`;
    - Drive `docs.google.com/document|spreadsheets|presentation` → `Documento`;
    - Drive genérico solo se infiere si el nombre escrito por el admin termina en extensión clara: `pdf/doc/docx/ppt/pptx/xls/xlsx` → `Documento`, `jpg/png/webp/gif` → `Imágenes`;
    - sin inferencia → `Otro`.
  - En `ApunteModal`, agregar selector de tags:
    - tags automáticas aparecen con animación;
    - el admin puede agregar/quitar tags manualmente;
    - siempre debe quedar al menos una tag.
  - Guardar categorías en `createApunteAction` y `updateApunteAction` dentro de la misma transacción que el apunte.

- **Listado de apuntes**
  - Cambiar la carga de la materia para traer solo la primera página de apuntes y todas las categorías disponibles.
  - Crear endpoint público validado, por ejemplo `GET /api/apuntes?subjectId=&categoria=&cursor=`.
  - Respuesta: `{ items, nextCursor, hasMore }`.
  - Usar cursor por `createdAt desc, id desc`; pedir `take: 16` para devolver 15 y detectar si hay más.
  - Filtro multi-tag con semántica **OR**: si se eligen varias tags, aparece cualquier apunte que tenga al menos una.
  - UI: chips “Todos” + categorías, selección múltiple, reset al cambiar filtros, scroll infinito con `IntersectionObserver` y mensaje final cuando no hay más apuntes.

- **Historial admin**
  - Reemplazar paginación por scroll infinito de **20 registros** usando cursor; evitar `count()` total.
  - Crear endpoints protegidos por `requireGeneralAdmin()`:
    - `GET /api/admin/historial?userId=&action=&cursor=`;
    - `GET /api/admin/historial/users?q=` para búsqueda por email con debounce.
  - Filtros:
    - usuarios: searchbar inteligente, permite seleccionar varios emails;
    - acciones: multiselect con etiquetas user-friendly;
    - usuarios y acciones se combinan con AND; múltiples usuarios/acciones usan IN.
  - Mantener URL con search params para compartir/recargar filtros.

## Tests y verificación
- Prisma/migración:
  - categorías se crean una sola vez;
  - apuntes existentes quedan con `Otro`;
  - no se puede guardar un apunte sin categorías.
- Unit tests:
  - inferencia de tags por YouTube, HTML, Docs/Drive y extensiones en nombre.
  - cursor pagination devuelve `hasMore` y `nextCursor` correctamente.
  - filtros multi-tag usan OR.
  - historial filtra por múltiples usuarios y acciones.
- UI/manual:
  - crear/editar apunte con tags automáticas y manuales;
  - filtros de apuntes cargan de a 15 y frenan al final;
  - historial carga de a 20, busca usuarios por email y frena al final.
- Comandos sugeridos:
  - `pnpm test`
  - `pnpm lint`
  - no correr build salvo pedido explícito del usuario.
- Al terminar implementación: commit obligatorio Conventional Commit, sin atribución IA.

## Supuestos definidos
- No se agrega Google Drive API key ni OAuth.
- Tags automáticas son sugerencias editables por el admin.
- Filtro multi-tag de apuntes usa “cualquiera de las seleccionadas”.
- La paginación por cursor sigue recomendaciones de Prisma para datasets grandes/infinite scroll y evita conteos caros; fuentes: [Prisma pagination](https://www.prisma.io/docs/orm/prisma-client/queries/pagination), [Supabase/Postgres indexes](https://supabase.com/docs/guides/database/postgres/indexes).
