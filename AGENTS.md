### Context
Estas desarrollando una aplicacion de un campus academico, con Quiz, Calendario y Apuntes por materia.
Tecnologias que utilizamos aca:
- NextJS
- Prisma
- Supabase
- PNPM Como gestor de dependencias

Para supabase, contas con el MCP instalado para comunicarte con la base de datos si lo necesitas.

### Skills Protocol
Este proyecto tiene skills disponibles que DEBES usar para trabajar de forma inteligente. Esto es OBLIGATORIO, no opcional:

1. **ANTES de cualquier tarea de código** (escribir, refactorizar, revisar, debuggear), abrí `.atl/skill-registry.md` y escaneá la tabla de skills.
2. Identificá toda skill cuyo **Trigger / Context** matchee con la tarea — considerá tanto los archivos/tecnologías que vas a tocar (ej: `.tsx`, Prisma, Supabase, Tailwind) como la acción que vas a hacer (estilar UI, query a la DB, crear un commit, planificar).
3. No esperes a que el usuario te nombre la skill. Si el Trigger matchea, la usás.

### Coding rules
## Rutas
- NOTIFICAR AL USUARIO si se van a cambiar algun tipo de slug. NO Cambiar slugs sin la aprobacion del usuario.

## Frontend rules
- Cuando el usuario haga preguntas técnicas o observaciones técnicas, estas no deben anotarse en el frontend. El frontend DEBE manejar un vocabulario user friendly NO técnico y no hacer referencias a la infrastructura del programa, ya sea del frontend como del backend.
- Citas como estas en el frontend son intolerables: El calendario vive en un wrapper client-only y la página sigue siendo Server Component.
- Los botones deben tener cursor pointer clickeable

## React State rules
- **`prefer-useReducer`**: cuando un componente tiene un grupo de estados que cambian SIEMPRE en bloque (ej: el flujo de un fetch — `items` / `cursor` / `hasMore` / `loading` / `error`, o una máquina de estados `config → running → done`), consolidálos en un `useReducer` en vez de múltiples `useState` sueltos. Cada transición pasa a ser una sola acción atómica, lo que elimina estados intermedios inconsistentes y centraliza la lógica.
- El criterio es la **interdependencia**, no la cantidad. NO conviertas a `useReducer` inputs controlados independientes (ej: `email`, `password`) ni toggles de UI sin relación entre sí: ahí `useState` es lo correcto y un reducer sería sobreingeniería.

## Git Commit rules
- Cada vez que se termine de implementar un feature, bugfix, refactor o configuración, es obligatorio hacer un commit con los cambios.
- Los commits deben seguir estrictamente la especificación de **Conventional Commits** (ej: `feat(db): ...`, `fix(ui): ...`).
- Los commits deben tener descripciones claras de lo implementado.
- **NUNCA** agregar "Co-Authored-By" ni ninguna atribución a IA en los mensajes de commit.

### Verificación pre-deploy
El deploy en Vercel corre `pnpm build` (`prisma generate && next build` con Turbopack). Si el build falla ahí, el deploy se cae. Para cachar esos errores ANTES, en capas:

- **Antes de dar una tarea por terminada (rápido, segundos):** corré `pnpm typecheck`. Agarra errores de tipos, identificadores duplicados (ej: `name defined multiple times`) e imports rotos — la mayoría de los errores que rompen el build.
- **Antes de mergear/pushear a `main` (autoritativo):** corré `pnpm build`. Es lo único que reproduce el 100% de lo que Vercel rechaza (incluye errores de RSC, boundaries client/server, etc.). Es más lento, por eso solo en este punto.
- **Atajo:** `pnpm verify` corre todo junto en orden (generate → typecheck → lint → test → build).

### Reglas de redaccion Frontend
- La redaccion debe ser de cara al usuario. No deben incluirse detalles tecnicos asociados al prompt ingresado por el usuario.
- Usar redaccion clara, sencilla y profesional.
- NO incluir cosas tecnicas, ni dar explicaciones donde se mencione la logica de la aplicacion. La intencionalidad del texto debe dejar claro para que sirve la feature.
