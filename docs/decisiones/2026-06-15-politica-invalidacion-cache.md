# Política de invalidación de cache

**Fecha:** 2026-06-15
**Estado:** Implementado

## Objetivo

Cada mutación administrativa debe invalidar todos los datos cacheados que
muestran la entidad modificada, sin refrescar caches ajenos. La fuente de
verdad de tags es `queryTags` en `src/lib/queries.ts`; los bancos de preguntas
usan `quizBanksCacheTag` en `src/lib/storage.ts`.

Todas las invalidaciones por tag pasan por el wrapper de
`src/app/admin/actions/shared.ts`, que llama a `revalidateTag(tag, 'max')`.
Esto conserva la política stale-while-revalidate de Next.js 16.

## Matriz de lecturas cacheadas

| Lectura | Datos visibles | Tags |
|---|---|---|
| `getCareer` | Carrera, años, materias, comisiones y enlaces | `career` |
| `getYearBySlug` | Año, materias, comisiones y eventos | `year:<slug>`, `career` |
| `getSubjectPageBySlug` | Materia, comisiones, eventos, apuntes y categorías | `subject:<slug>` |
| `getApuntePageBySlug` | Apunte, recursos, categorías y eventos relacionados | `subject:<slug>` |
| `getSubjectQuizMeta` | Identidad de materia y año para los flujos de quiz | `subject:<slug>` |
| `getCategoriasApunte` | Catálogo global de categorías | `categorias-apunte` |
| `getTiposEvento` | Catálogo global de tipos de evento | `tipos-evento` |
| `getPeriodos` | Períodos académicos globales | `periodos` |
| `getUpcomingEventsCrossYear` | Próximos eventos y apuntes relacionados | `upcoming-events` |
| `getHomeCalendarEvents` | Calendario global, materias, años y comisiones | `upcoming-events`, `career` |
| `getLatestApuntes` | Apuntes recientes con materia y año | `latest-apuntes`, `career` |
| `getLatestApuntesByYear` | Apuntes recientes de un año | `year:<slug>` |
| `listQuizBanks` | Bancos de preguntas de una materia | `quiz-banks:<año>:<materia>` |

No existen mutaciones administrativas para categorías o tipos de evento en el
barrel actual. Si se agregan, deberán invalidar sus tags dedicados.

## Matriz de acciones administrativas

La tabla cubre las 23 acciones exportadas por `src/app/admin/actions.ts`.
Cuando una entrada dice “delega”, la acción wrapper ejecuta la mutación y la
invalidación de la acción indicada.

| Acción | Mutación | Tags invalidados | Paths |
|---|---|---|---|
| `createEvento` | Crea evento y relaciones con apuntes | `subject`, `year`, `upcoming-events` | año, calendario, materia y comisiones |
| `createEventoAction` | Wrapper de creación | Delega en `createEvento` | Delega |
| `updateEventoFechaAction` | Cambia fecha | `subject`, `year`, `upcoming-events` | año, calendario, materia y comisiones |
| `updateEventoAction` | Edita evento y relaciones | `subject`, `year`, `upcoming-events` | año, calendario, materia y comisiones |
| `deleteEvento` | Elimina evento | `subject`, `year`, `upcoming-events` | año, calendario, materia y comisiones |
| `createPeriodoAction` | Crea período global | `periodos` | Ninguno |
| `updatePeriodoAction` | Edita período global | `periodos` | Ninguno |
| `deletePeriodo` | Elimina período global | `periodos` | Ninguno |
| `createApunteAction` | Crea apunte | `subject`, `year`, `latest-apuntes`, `upcoming-events` | año, calendario, materia y comisiones |
| `updateApunteAction` | Edita apunte y recursos | `subject`, `year`, `latest-apuntes`, `upcoming-events` | año, calendario, materia y comisiones |
| `deleteApunteAction` | Elimina apunte y recursos | `subject`, `year`, `latest-apuntes`, `upcoming-events` | año, calendario, materia y comisiones |
| `uploadQuizBankAction` | Sube banco de preguntas | `quiz-banks:<año>:<materia>` | Ninguno |
| `deleteQuizBankAction` | Elimina banco de preguntas | `quiz-banks:<año>:<materia>` | Ninguno |
| `createYearAction` | Crea año | `career` | home |
| `updateYearAction` | Edita año o slug | `career`, `year:<slug viejo>`, `year:<slug nuevo>` | home y rutas vieja/nueva |
| `deleteYearAction` | Elimina año, materias y storage | `career`, `year`, todos sus `subject` y `quiz-banks` | home y año |
| `getYearDeleteImpactAction` | Solo lectura | Ninguno | Ninguno |
| `createSubjectAction` | Crea materia y comisión inicial | `career`, `year` | home, año y calendario |
| `createCommissionAction` | Crea comisión y agenda | `career`, `subject`, `year` | año, calendario, materia y comisiones |
| `updateSubjectAction` | Edita materia o slug | `career`, `year`, `subject:<slug viejo>`, `subject:<slug nuevo>` | home, año, calendario y rutas vieja/nueva |
| `deleteSubjectAction` | Elimina materia y storage | `career`, `year`, `subject`, `quiz-banks` | home, año, calendario y materia |
| `getSubjectDeleteImpactAction` | Solo lectura | Ninguno | Ninguno |
| `signOutAction` | Cierra sesión | Ninguno | layout global |

`career` también pertenece a los caches del calendario global y de apuntes
recientes. Por eso las eliminaciones y renombres estructurales no necesitan
invalidar además `upcoming-events` o `latest-apuntes`: la misma entrada
cacheada ya queda obsoleta al invalidar cualquiera de sus tags.

Los apuntes sí invalidan `upcoming-events` porque los eventos cacheados incluyen
título y slug de sus apuntes relacionados. Se mantiene esta regla uniforme
para crear, editar y borrar apuntes; evita que una relación creada en el mismo
flujo quede desactualizada sin introducir variantes especiales por operación.

## Helpers y contexto

- `revalidateSubjectContent` invalida el cache de materia, el cache del año y
  las rutas públicas de esa materia.
- `revalidateSubjectEvents` agrega `upcoming-events`.
- `revalidateSubjectApuntes` agrega `latest-apuntes` y `upcoming-events`.
- Los helpers no consultan la base. Los scopes de autorización ya recuperan
  `yearSlug` y los slugs de comisiones en su lectura de la materia, y ese
  contexto se pasa directamente.
- Las mutaciones de períodos invalidan solo `periodos`; se eliminó el barrido
  redundante de todos los años.
- Las mutaciones de bancos invalidan solo su tag de Storage. No cambian la
  metadata cacheada de la materia.

## Regla para acciones nuevas

Antes de mergear una nueva mutación:

1. Identificar qué campos o relaciones modifica.
2. Ubicar en la matriz de lecturas todas las queries que muestran esos datos.
3. Invalidar al menos uno de los tags declarados por cada lectura afectada.
4. Agregar la acción a esta matriz.
5. No agregar `revalidatePath` como sustituto de un tag faltante.

Si aparece una lectura cacheada o un tag nuevo, esta decisión se actualiza en
el mismo cambio.

## Verificación manual

El 2026-06-15 se ejecutó un smoke test con una cuenta administrativa temporal
y datos identificables que se eliminaron al finalizar:

1. Se creó y editó un apunte con recurso.
2. Se creó y editó un evento, moviéndolo a una fecha próxima.
3. Se confirmó el contenido actualizado en la materia, el calendario del año
   y el inicio con preferencias que incluían esa materia.
4. Se eliminaron el evento y el apunte desde la interfaz.
5. Se confirmó su ausencia en las tres vistas después de la revalidación.
6. Se eliminaron la cuenta temporal, sus auditorías y cualquier dato de prueba
   restante.

## Archivos

- `src/lib/queries.ts` — fuente de verdad de `queryTags`.
- `src/lib/storage.ts` — tag de bancos de preguntas.
- `src/lib/auth.ts` — contexto de año, materia y comisiones ya obtenido por autorización.
- `src/app/admin/actions/shared.ts` — política común y helpers.
- `src/app/admin/actions/` — call sites por dominio.
