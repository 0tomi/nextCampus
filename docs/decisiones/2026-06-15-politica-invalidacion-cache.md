# Política de invalidación de cache

**Fecha:** 2026-06-15 · **Actualización:** 2026-10-14
**Estado:** Implementado; las rutas acotadas se conservan hasta verificar propagación en producción.

## Objetivo y semántica

Invalidar las proyecciones afectadas por una escritura, sin expirar contenido
independiente. `queryTags` en `src/lib/queries.ts` es la fuente de verdad;
Storage define `quizBanksCacheTag`. El wrapper `invalidateTag` usa `updateTag`,
no `revalidateTag(tag, 'max')`: expira inmediatamente con semántica
read-your-own-writes en Server Actions.

Registrar tags derivados de argumentos antes de consultar, incluso si no existe
la entidad. Las altas deben invalidar esos resultados negativos y sus rutas nuevas.

## Matriz de lecturas cacheadas

| Lectura | Tags |
|---|---|
| `getCareer` | `career` |
| `getYearBySlug` | `year:<slug>`, `year-meta:<slug>`, `career` |
| `getSubjectPageBySlug` | `subject:<slug>`, `subject-content:<slug>`, `subject-authors:<slug>`, `categorias-apunte`, `year-meta:<año encontrado>` |
| `getApuntePageBySlug` | `subject:<materia>`, `apunte:<materia>:<apunte>`, `subject-authors:<materia>`, `categorias-apunte`, `year-meta:<año encontrado>` |
| `getSubjectQuizMeta` | `subject:<slug>`, `year-meta:<año encontrado>` |
| `getCategoriasApunte` | `categorias-apunte` |
| `getTiposEvento` | `tipos-evento` |
| `getPeriodos`, `getCategoriasPeriodo` | `periodos` |
| `getHomeCalendarEvents` | `upcoming-events`, `career` |
| `getLatestApuntes` | `latest-apuntes`, `career` |
| `getLatestApuntesByYear` | `latest-apuntes-year:<año>` |
| `listQuizBanks` | `quiz-banks:<año>:<materia>` |

`subject` representa identidad y estructura; `subject-content`, eventos y listado
de apuntes. `year-meta` separa presentación/identidad del año de sus eventos.
Los nombres públicos dependen de `subject-authors`, no de un tag por autor:
una materia con muchos autores no debe superar el límite de tags por entrada.
Categorías y tipos de evento siguen siendo catálogos cargados por seed.

## Duración de agregados y fecha local

Solo los tres agregados siguientes amplían su intervalo de regeneración;
las escrituras siguen expirando sus tags inmediatamente.

| Lectura | `stale` | `revalidate` | `expire` |
|---|---:|---:|---:|
| `getHomeCalendarEvents` | 300 s | 1800 s | 3600 s |
| `getLatestApuntes` | 300 s | 1800 s | 3600 s |
| `getLatestApuntesByYear` | 300 s | 1800 s | 3600 s |

Todos los demás perfiles permanecen sin cambios. `getTodayKeyAR` conserva
`revalidate: 900` y `expire: 3600`, con fecha en la zona horaria de Argentina:
el cambio de día ocurre a las 03:00 UTC, no a medianoche UTC. Su resultado
cacheado puede conservar el día anterior hasta renovarse; esta política no
promete actualización exacta a medianoche. La dependencia de fecha del año
sigue imponiendo su intervalo de quince minutos. No debe deducirse una reducción
proporcional de ISR Writes a partir de estos intervalos.

## Matriz de escrituras

| Escritura | Tags afectados | Rutas conservadas |
|---|---|---|
| Crear/editar/eliminar evento | `subject-content`, `year`, `upcoming-events` | Año, calendario, materia, comisiones |
| Crear/editar/eliminar apunte | `subject-content`, detalles antiguos/nuevos `apunte`, `latest-apuntes`, `latest-apuntes-year` | Rutas acotadas anteriores y detalles exactos |
| Cambiar título/slug de apunte vinculado; eliminar apunte vinculado | Los anteriores, más `year`, `upcoming-events` | Las anteriores |
| Crear/editar/eliminar período o categoría de período | `periodos` | Ninguna |
| Subir/eliminar banco de quiz | Su `quiz-banks` | Ninguna |
| Crear/editar año | `career`, `year`, `year-meta`, `latest-apuntes-year` antiguos/nuevos | Inicio, año y calendario antiguos/nuevos |
| Eliminar año | Los anteriores, identidades `subject` y `quiz-banks` de sus materias | Inicio, año, calendario |
| Crear materia/comisión | `career`, `year`, `subject`, `subject-content`, `latest-apuntes-year` | Inicio cuando corresponde, año, calendario, materia, comisiones nuevas |
| Editar materia | `career`, `year`, `latest-apuntes-year`, identidades `subject` antiguas/nuevas | Inicio, año, calendario, materia antigua/nueva |
| Eliminar materia | `career`, `year`, `latest-apuntes-year`, `subject`, `quiz-banks` | Inicio, año, calendario, materia |
| Cambiar nombre de usuario | `subject-authors` de materias con sus apuntes/eventos y `year` de sus eventos | Vistas administrativas existentes |
| Cambiar correo, contraseña o permisos sin cambiar nombre | Ningún tag público | Vistas administrativas existentes |
| Cerrar sesión | Ninguno | Ninguna invalidación compartida; navegación completa a inicio |

Los wrappers delegan en su acción principal. Las consultas de impacto no mutan
ni invalidan. Las eliminaciones/renombres estructurales invalidan `career`, que
ya cubre calendario global y apuntes recientes globales. Los recientes del año
requieren su tag específico. Editar recursos/descripción de un apunte vinculado
sin cambiar título/slug no expira eventos.

## Orden de escritura y fallas

Autorización y validación preceden la escritura. Invalidar inmediatamente después
de confirmar la escritura visible, antes de puntuación, auditoría o limpieza de
archivos. Una falla secundaria no debe dejar cache antiguo de contenido confirmado.

En creación de apuntes, la visibilidad completa se confirma después de persistir
sus recursos. Una falla de recursos conserva la compensación existente: si se
confirma la eliminación del apunte, no se invalida; si la eliminación falla o la
limpieza impide confirmarla, se invalida conservadoramente. La puntuación queda
fuera de esa compensación: una falla de puntuación conserva el apunte confirmado,
ya invalidado, y se propaga sin reintentos ni rediseño del sistema de contribuciones.

Operaciones rechazadas, entidades ausentes y transacciones revertidas no invalidan.
El perfil sin cambios conserva su retorno temprano. Los contextos de autores se
resuelven antes de escribir y solo cuando cambia realmente el nombre.

## Helpers y verificación

Los helpers reciben contexto, deduplican tags y no consultan la base. El contexto
de apuntes agrega `apunteSlugs` y `affectsRelatedEvents`. El de autores recibe
materias y años de eventos afectados, obtenidos con consultas filtradas.

Se conservan los `revalidatePath` acotados existentes hasta demostrar propagación
correcta de tags en un build de producción. No agregar barridos globales como
sustituto de una dependencia faltante. Antes de extender una mutación, identificar
sus proyecciones lectoras y probar el conjunto exacto de tags, incluidos los que
no deben invalidarse, resultados negativos, rollback y fallas secundarias.

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
