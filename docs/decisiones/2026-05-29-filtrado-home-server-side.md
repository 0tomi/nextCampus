# Filtrado del home en el servidor (apuntes y calendario)

**Fecha:** 2026-05-29
**Estado:** Implementado

## El problema que disparó esto

En el home, la sección de "Últimos apuntes" aparecía vacía cuando el usuario
elegía ver solo un año. El calendario sí reflejaba el año elegido.

Causa raíz: `getLatestApuntes` traía los **6 apuntes más nuevos del campus
entero** (`take: 6`) y recién después el cliente filtraba por el año del
usuario. Si esos 6 eran de otros años, no quedaba nada que mostrar. El
calendario funcionaba porque traía **todos** los eventos y filtraba en el
cliente con el dataset completo.

Primer parche (commit aparte): se sacó el `take` para que el cliente reciba
todos los apuntes y filtre bien. Eso arregló el bug, pero dejó un problema de
escala: con muchos apuntes, viajaban TODOS por la red al navegador para mostrar
solo 6.

## Lo que se debatió

Pregunta de fondo: ¿dónde filtramos, en el cliente o en el servidor?

- **Filtrar en cliente (lo viejo):** el servidor manda todo, el navegador
  recorta. Problema: payload gigante viajando por la red.
- **Filtrar en servidor (lo elegido):** el servidor recorta antes de mandar.
  Al navegador viaja solo lo que el usuario necesita.

Esto es viable porque las preferencias se guardan en cookie + localStorage, y
al guardar la configuración se hace `window.location.assign('/')` (recarga
completa). O sea, el home siempre se rinde fresco leyendo la cookie; no
necesita reactividad en vivo de las preferencias.

### Idea alternativa que se descartó (top-N por grupo)

Se evaluó cachear "los 6 últimos apuntes de cada materia" en vez de todos.
Matemáticamente es correcto (la respuesta para cualquier selección de materias
cabe en los 6-por-materia, porque la lista final es de 6). PERO:

- Optimiza la parte barata (tamaño del caché del lado del servidor), no la que
  dolía (el payload por la red), que ya se resuelve filtrando en servidor.
- Requiere SQL crudo con window functions (`ROW_NUMBER() OVER (PARTITION BY
  ...)`), perdiendo la simplicidad y los tipos de Prisma.
- No aplica al calendario (que necesita todos los eventos del rango, no "los 6
  últimos").

Conclusión: **optimización prematura**. Se hace solo si algún día un número real
(tabla con cientos de miles de filas, caché lento o pesado) demuestra que duele.

## Lo que se implementó

Arquitectura de **dos capas** (a propósito, no es redundancia accidental):

1. **Caché compartido, sin filtrar.** `getLatestApuntes` y
   `getHomeCalendarEvents` siguen trayendo TODO y se cachean con
   `unstable_cache` (clave sin preferencias). Una sola entrada compartida entre
   todos los usuarios, refrescada cada 5 min. El filtro NUNCA va adentro del
   query cacheado: si no, contaminaríamos el caché compartido (usuario B vería
   lo filtrado para usuario A).

2. **Filtro por usuario en el servidor, antes de mandar.** En `page.tsx`
   (Server Component) se leen las preferencias de la cookie y se filtra:
   - **Apuntes:** se filtran por materia/año y se cortan a 6.
   - **Calendario:** se filtran por materia/comisión, SIN cortar (el calendario
     completo necesita todos los eventos del usuario).
   - Si no hay preferencias (cookie nula) se mandan arrays vacíos: el componente
     muestra el cartel de "configurá tus materias".

3. **El cliente conserva las preferencias solo para la UI.** Los componentes
   (`HomeLatestApuntes`, `HomeGlobalCalendar`, `MobileHome`) siguen usando
   `usePreferences` para decidir skeleton vs. cartel de setup vs. contenido, y
   re-filtran como red de seguridad (queda en no-op porque el servidor ya
   filtró con las mismas preferencias). Lo estructural (años/materias en
   `HomeYearsGrid`) se queda filtrando en cliente: es metadata liviana y está
   atada al toggle de admin "mostrar años ocultos".

### Detalle clave: el mensaje de "estado vacío" de apuntes

El mensaje vacío NO puede depender de la cantidad de apuntes recibidos. Como
ahora `notes` llega ya filtrado, "lista vacía" puede significar dos cosas
distintas:

- No hay apuntes en todo el sistema -> "Todavía no hay apuntes nuevos para
  mostrar."
- Hay apuntes pero ninguno de tu selección -> "Con tu selección actual no
  aparece material nuevo todavía."

Para distinguirlas se pasa una señal aparte (`hasAnyNotes`), calculada del set
completo SIN filtrar. Si esto se rompe (vuelve a aparecer el mensaje equivocado
de "no hay nada"), revisá esta señal primero.

## Consecuencia aceptada

Se pierde la sincronización entre pestañas para estas secciones (cambiás la
config en otra pestaña y el home abierto no se actualiza solo). Es un caso de
borde y el flujo real recarga la página, así que se aceptó.

## Si esto explota, revisá (en este orden)

1. **Sincronía cookie <-> localStorage.** El servidor filtra con la cookie; el
   cliente decide la UI con localStorage. `writePreferences` escribe las dos
   juntas. Si se desincronizan (ej. cookie expirada tras 1 año), el servidor
   puede mandar vacío aunque localStorage tenga preferencias. Solución del
   usuario: reconfigurar (reescribe la cookie).
2. **El filtro vive en `page.tsx`, no en el query.** Verificá que el filtro por
   preferencias esté en el Server Component y NUNCA dentro de `unstable_cache`.
3. **La clave del caché sigue sin preferencias.** `['latest-apuntes']` y
   `['home-calendar-events']` deben ser neutrales/compartidas. Si alguien mete
   las preferencias en la clave, fragmenta el caché por usuario.

## Archivos

- `src/lib/queries.ts` — `getLatestApuntes` / `getHomeCalendarEvents` (caché sin filtrar)
- `src/app/page.tsx` — filtro por preferencias + corte de apuntes a 6 + señal `hasAnyNotes`
- `src/components/home/HomeLatestApuntes.tsx` — mensaje vacío basado en `hasAnyNotes`
- `src/components/mobile/home/MobileHome.tsx` — reenvía `hasAnyNotes`
