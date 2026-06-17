 Contexto

 El sitio se siente lento en: primeras cargas, abrir apuntes y subir contenido. Auditoría completa
 (datos/rendering/bundle) con las reglas de react-best-practices, supabase, nodejs-best-practices y
 next-cache-components. Este plan lo ejecuta un agente de código de principio a fin: cubre TODO lo
 encontrado — migración a use cache (Cache Components), uploads paralelos, bundle y el refactor de los
 gemelos del Mapa. Lo que está sano no se toca.

 Diagnóstico: la base está sana (imports tree-shakeable, sin fetching en useEffect, índices Prisma
 completos, singleton + pooler correctos, DAL con React.cache). La lentitud viene de puntos concretos,
 listados abajo.

 Hallazgos verificados

 #: 1
 Hallazgo: getCareer() SIN cache, llamado en home, /[yearSlug], materia, /mapa, /mapa/visual — la query
 más
   pesada del sistema (career→years→subjects→links→commissions) fresca en cada request
 Evidencia: src/lib/queries.ts:263
 Severidad: 🔴
 ────────────────────────────────────────
 #: 2
 Hallazgo: Uploads de recursos HTML secuenciales: for con await compila (esbuild) y sube a Storage de a
   uno; además crea un cliente Supabase admin por upload
 Evidencia: src/app/admin/actions.ts:752-827, src/lib/storage.ts:35, src/lib/supabase/admin.ts:7
 Severidad: 🔴
 ────────────────────────────────────────
 #: 3
 Hallazgo: cookies() fuerza render dinámico en home y mapa; revalidate = 300 se ignora
 Evidencia: src/app/page.tsx:29, src/app/mapa/page.tsx, src/app/mapa/visual/page.tsx
 Severidad: 🔴
 ────────────────────────────────────────
 #: 4
 Hallazgo: Apunte: generateMetadata + page llaman getApuntePageBySlug por separado; unstable_cache no
   deduplica llamadas concurrentes del mismo request → 2 round-trips en cache miss
 Evidencia: apuntes/[apunteSlug]/page.tsx:26 y :44
 Severidad: 🟡
 ────────────────────────────────────────
 #: 5
 Hallazgo: Solo 2 loading.tsx en toda la app (root y [yearSlug]); cero streaming en las rutas lentas
 Evidencia: src/app/
 Severidad: 🟡
 ────────────────────────────────────────
 #: 6
 Hallazgo: getCategoriasApunte() sin cache
 Evidencia: src/lib/queries.ts:522
 Severidad: 🟡
 ────────────────────────────────────────
 #: 7
 Hallazgo: NosotrosModal (474 líneas) y Mascot (526 líneas) importados estáticamente por DashboardShell →
   viajan en el bundle de TODAS las páginas; el modal solo se abre con un click en la home
 Evidencia: src/components/shell/DashboardShell.tsx:10-11,134
 Severidad: 🟡
 ────────────────────────────────────────
 #: 8
 Hallazgo: MobileCalendarLazy es un wrapper dynamic() dentro de árbol ya cliente → cero ahorro, patrón
   engañoso
 Evidencia: src/components/mobile/calendar/MobileCalendarLazy.tsx
 Severidad: 🟢
 ────────────────────────────────────────
 #: 9
 Hallazgo: Mapa: lógica duplicada inline entre MapaCorrelativas (1183), MapaCorrelativasMobile (1136) y
   MapaVisualCorrelativas (526). OJO: ya existe dominio compartido en src/lib/domain/mapa/ — la
 duplicación
    restante es acotada (ver Fase 4)
 Evidencia: src/components/mapa/*
 Severidad: 🟢
 ────────────────────────────────────────
 #: 10
 Hallazgo: SVGs template de Next sin uso en public/ (vercel.svg, next.svg, file.svg, globe.svg,
 window.svg)
 Evidencia: public/
 Severidad: 🟢

 Falsos positivos descartados (verificados — NO tocar)

 - DashboardShell NO fuerza el árbol cliente: recibe sidebar/children/topbar como props ReactNode desde
 server components (DashboardShell.tsx:13-21) — el contenido sigue siendo server. No hay que partirlo;
 solo lazy-load de sus imports estáticos (hallazgo 7).
 - Índices de ApunteCategoria completos: @@id([apunteId, categoriaId]) + @@index([categoriaId, apunteId])
 (prisma/schema.prisma:304-305).
 - getLatestApuntes() trae todos los apuntes a propósito: diseño documentado en comentario
 (queries.ts:846-849, filtrado por preferencias), cacheado 300s. Se migra a use cache como el resto, sin
 cambiar la semántica.

 ---
 FASE 1 — Migración a Cache Components (use cache)

 Sustituye unstable_cache/revalidate por el modelo de Next 16. Resuelve hallazgos 1, 3, 4, 5 y 6 de una
 sola vez.

 1.1 Habilitar

 next.config.ts: agregar cacheComponents: true (top-level, NO experimental).

 1.2 Migrar las funciones de datos (src/lib/queries.ts + src/lib/storage.ts)

 Patrón por función (ejemplo getYearBySlug):

 // ANTES: return unstable_cache(async () => {...}, ['year', slug], { tags: [...], revalidate: 3600 })()
 // DESPUÉS:
 export async function getYearBySlug(slug: string) {
   'use cache'
   cacheTag(TAGS.year(slug), TAGS.career)
   cacheLife({ revalidate: 3600 })
   // ...cuerpo igual
 }

 Reglas:
 - Sin keyParts manuales: los argumentos son la cache key automáticamente.
 - options.tags → cacheTag(...) con los MISMOS tags de TAGS (la invalidación con revalidateTag en las
 actions de admin sigue funcionando sin cambios).
 - options.revalidate → cacheLife({ revalidate: N }) con el MISMO valor actual (no cambiar TTLs en esta
 pasada: 300/3600/86400/60 según cada sitio).
 - Call sites a migrar: queries.ts líneas 305, 359, 429, 561, 679, 687, 713, 772, 850 y storage.ts:165
 (leer cada uno; los dos de 679/687 son unstable_cache directos sobre la constante, mismo patrón).
 - Mantener las normalizaciones existentes de Date → toISOString() (la serialización de use cache tiene la
 misma restricción; el contrato actual ya es correcto).

 1.3 Cachear lo que faltaba

 - getCareer() (queries.ts:263): agregar 'use cache' + cacheTag(TAGS.career) + cacheLife({ revalidate:
 3600 }). Verificar en src/app/admin/actions.ts que toda mutación de career/years/subjects ya revalida
 TAGS.career — si alguna no lo hace, agregarle el revalidateTag.
 - getCategoriasApunte() (queries.ts:522): 'use cache' + tag de categorías (crear TAGS.categorias si no
 existe) + revalidar en las actions que crean/editan/borran categorías.

 1.4 Limpiar segment configs (incompatibles con cacheComponents)

 - Quitar export const revalidate de las 9 páginas: page.tsx (home), configurar, mapa, mapa/visual,
 [yearSlug], [yearSlug]/calendario, [yearSlug]/[subjectSlug], .../[commissionSlug],
 .../apuntes/[apunteSlug], .../quiz. El caching ahora vive en las funciones de datos.
 - Quitar export const dynamic = 'force-dynamic' de las 5 páginas admin (historial, perfil, users,
 users/create, users/edit/[id]) — dinámico es el default.
 - Route handlers (src/app/api/**, 10 sitios): si el build con cacheComponents rechaza el segment config,
 quitarlo — todos leen request/auth, son inherentemente dinámicos. Si lo acepta, dejarlo.

 1.5 Suspense boundaries (obligatorias con cacheComponents para data dinámica)

 Con cacheComponents, todo acceso dinámico (cookies(), params, queries no cacheadas) debe quedar bajo una
 boundary o el build falla. Cobertura por loading.tsx de ruta (skeleton simple: header + cards, estilo del
 DashboardSkeleton existente):

 - Agregar loading.tsx en: [yearSlug]/[subjectSlug]/, .../apuntes/[apunteSlug]/, [yearSlug]/calendario/,
 mapa/, mapa/visual/, configurar/, [yearSlug]/[subjectSlug]/quiz/, .../[commissionSlug]/, y en las páginas
 admin si el build lo exige.
 - Home y mapa siguen leyendo cookies() (preferencias sin flash — diseño correcto, se mantiene): quedan
 dinámicas pero baratas, porque TODAS sus queries pasan a ser cache-hits y el shell estático llega al
 instante por PPR.

 1.6 Dedupe del apunte (hallazgo 4)

 'use cache' ya memoiza por request, pero verificar con logs de Prisma en dev que al abrir un apunte se
 dispara UNA sola query desde generateMetadata + page. Si se observan dos (llamadas concurrentes en cache
 miss), envolver la función exportada en React.cache() — una línea.

 Commit: perf(cache): migrate to cache components with use cache directive

 ---
 FASE 2 — Upload paralelo (hallazgo 2)

 En buildApunteRecursos (src/app/admin/actions.ts:752-827):

 1. Reemplazar el for secuencial por Promise.all(recursos.map(async (recurso, index) => {...})). La
 compilación esbuild + upload a Storage de cada recurso corre en paralelo. Usar el índice del array para
 orden estable. Si un upload falla, Promise.all rechaza → el flujo de error actual (la action ya maneja
 throw) se conserva; los recursos huérfanos en Storage no son peores que hoy (mismo comportamiento ante
 fallo a mitad del loop).
 2. Crear UN solo cliente Supabase admin por batch y pasarlo a uploadApunteHtml (o memoizar
 createSupabaseAdminClient a nivel módulo en src/lib/supabase/admin.ts — es stateless con persistSession:
 false, es seguro).
 3. Verificar que updateApunteAction (o equivalente de edición) use el mismo helper y se beneficie igual.

 Commit: perf(admin): parallelize apunte resource uploads

 ---
 FASE 3 — Bundle (hallazgos 7, 8, 10)

 1. NosotrosModal → next/dynamic dentro de DashboardShell.tsx: const NosotrosModal = dynamic(() =>
 import('@/components/ui/NosotrosModal').then(m => m.NosotrosModal)). Renderizarlo solo cuando isAboutOpen
 || alguna vez abierto (montaje condicional: {isAboutOpen ? <NosotrosModal .../> : null} si el modal no
 necesita animación de salida; si la necesita, mantener montado tras la primera apertura con un estado
 hasOpened).
 2. Mascot → next/dynamic en DashboardShell.tsx (solo se ve en lg:, 526 líneas con animaciones embebidas).
 Sin ssr: false (evitar layout shift); con que salga del chunk principal alcanza.
 3. MobileCalendarLazy: eliminar el wrapper. Hacer que el dynamic() de MobileCalendar se invoque desde el
 server component que lo renderiza (así el ahorro es real), o si el padre es inevitablemente cliente,
 importar MobileCalendar directo y borrar el archivo engañoso.
 4. public/: borrar vercel.svg, next.svg, file.svg, globe.svg, window.svg tras confirmar con rg que nada
 los referencia.

 Commit: perf(bundle): lazy-load shell extras and remove dead assets

 ---
 FASE 4 — Refactor Mapa (hallazgo 9)

 Ya existe dominio compartido (src/lib/domain/mapa/: types, correlativasData, mapaConstants,
 subjectQueries con tests, unlockLogic con tests, visualLayout) y hooks (useMapaProgress,
 useSuggestedYear, useMapaViewport). No re-extraer nada de eso. La duplicación restante son copias inline
 en los tres views.

 4.1 Extender src/lib/domain/mapa/subjectQueries.ts (~+55 líneas, funciones puras)

 - filterSubjects({ searchTerm, statusFilter, yearFilter?, subjectStatuses }) — unifica
 getFilteredSubjects (desktop L186-202) y el memo inline mobile (L116-129). Búsqueda case-insensitive en
 nombre y codigo (unificar a lowercase es neutro: los códigos son numéricos; declararlo en el commit).
 - getSuggestedSubjects(subjectStatuses, limit) — desktop usa 4, mobile 5; el límite es parámetro.
 - resolveSubjectSlugs(slugs) y groupSubjectsByYear(subjects) — mover verbatim desde desktop L215-225.
 - getYearSummaries(subjectStatuses) — mover verbatim desde mobile L140-157 (sin el useMemo; títulos desde
 YEAR_LABELS).
 - canOpenSubjectPage(availableSlugs, slug) — size === 0 || has(slug) (el set vacío significa "sin
 gating", preservar).
 - Import MAPA_YEARS/YEAR_LABELS desde mapaConstants es seguro (sin ciclos: mapaConstants solo importa
 ./types).

 4.2 Nuevo hook src/hooks/useSubjectSelection.ts (~60 líneas)

 Encapsula selección + bundle derivado + toggle compartido por los tres views:
 - Estado selectedSlug (init subjectsData[0]?.slug), derivados selectedSubject/Status/Unlocks/Missing con
 fallback find ?? subjectsData[0] y status ?? 'UNLOCKED' (comportamiento pre-hidratación actual).
 - toggleSubject(subject): ORDEN CRÍTICO — seleccionar primero, luego guard LOCKED, luego
 progress.toggleSubject (tocar una materia LOCKED debe seleccionarla sin togglear). Colapsa la rama
 redundante COMPLETED del mobile (L85-97, ambas ramas llaman lo mismo).
 - resetSelection() → reselecciona subjectsData[0].
 - Export adicional puro getSubjectDetails(slug, subjectStatuses, completed) para el modal de detalle
 mobile (segundo slug independiente).

 4.3 Nuevo src/components/mapa/MapaResetDialog.tsx (~25 líneas)

 Wrapper de AlertDialog con el copy duplicado de reset ("Reiniciar el progreso del mapa", variant
 destructive). Props: { open, onClose, onConfirm }.

 4.4 Adelgazar los tres views (layout intacto, solo lógica)

 - MapaCorrelativas.tsx (~1183→~1060): borrar L186-225 (funciones locales), importar del dominio;
 useMapaDerivedState se mantiene como agregado desktop pero construido sobre las funciones compartidas +
 useSubjectSelection; sugeridas con límite 4; MapaResetDialog; canOpenSubjectPage en L958.
 - MapaCorrelativasMobile.tsx (~1136→~1010): reemplazar memos inline (filteredSubjects,
 recommendedSubjects límite 5, yearSummaries), selección + toggle por el hook, detalle del modal por
 getSubjectDetails, canOpenSubjectPage en L251/L557, MapaResetDialog. Conservar: MobileShell, tabs
 plan/ruta, yearFilter, getSubjectGuidance (copywriting mobile-only, L1094-1136).
 - MapaVisualCorrelativas.tsx (~526→~505): selección + markSubjectProgress por el hook (guard equivalente:
 useMapaProgress.toggleSubject ya no-opea en LOCKED); wrapper local para selectSubject +
 setIsPanelOpen(true); canOpenSubjectPage en L428. Canvas/viewport/edges intactos.

 4.5 Invariantes a preservar (NO negociables)

 1. localStorage: key nextcampus_progreso_materias y evento nextcampus:mapa-progress-updated
 (src/lib/mapaProgress.ts) — no tocar; los slugs de correlativasData.ts NO cambian (renombrar uno borra
 silenciosamente progreso guardado).
 2. Mapas de copy por view (DESKTOP_/MOBILE_/VISUAL_STATUS_*) intencionalmente distintos — no fusionar.
 3. Gate de hidratación: cada view conserva su loading propio mientras !progress.isHydrated.
 4. initialMode: /mapa → 'plan', /mapa/visual → 'ruta'.
 5. Agregar comentario en correlativasData.ts documentando el invariante "slug debe coincidir con el slug
 en DB" (gating de links frágil y no documentado). Migrar correlativas a DB queda FUERA de alcance.

 4.6 Tests

 Extender src/lib/domain/mapa/subjectQueries.test.ts (vitest, estilo existente): filterSubjects
 (nombre/código case-insensitive, filtros de status y año), getSuggestedSubjects (orden por unlocks,
 límite), groupSubjectsByYear, getYearSummaries (conteos), canOpenSubjectPage (set vacío = abierto).

 Commit: refactor(mapa): extract shared selection and filtering domain logic

 ---
 Explícitamente FUERA de alcance

 - NO tocar slugs ni rutas (regla del proyecto — y rompe el progreso guardado del mapa).
 - NO partir DashboardShell (falso positivo verificado) ni fusionar desktop/mobile del mapa en un
 mega-componente con condicionales.
 - NO cambiar la semántica de getLatestApuntes (diseño deliberado y documentado).
 - NO generateStaticParams (PPR + cache por función ya cubre).
 - NO migrar correlativas del mapa a la DB.
 - NO cambiar TTLs de cache existentes en esta pasada.

 Verificación (al final de cada fase + integral)

 1. pnpm typecheck tras cada fase; pnpm build antes de cada commit (la migración a cacheComponents SOLO se
 valida con build — los errores de "uncached data access" salen ahí; iterar agregando
 loading.tsx/Suspense donde el build lo exija).
 2. pnpm test (vitest): suites existentes de mapa + nuevas.
 3. Fase 1: en dev, abrir home/materia/apunte dos veces — la segunda sin query de career (logs de Prisma);
 crear/editar una materia desde admin y confirmar que home y páginas afectadas reflejan el cambio
 (revalidateTag sobre el nuevo cache).
 4. Fase 2: subir un apunte con 2-3 recursos HTML y comparar tiempo contra main (filteredSubjects, recommendedSubjects límite 5, yearSummaries), selección +
 toggle por el hook, detalle del modal por getSubjectDetails,
 canOpenSubjectPage en L251/L557, MapaResetDialog. Conservar: MobileShell,      tabs plan/ruta, yearFilter, getSubjectGuidance (copywriting mobile-only,
 L1094-1136).                                                                   - MapaVisualCorrelativas.tsx (~526→~505): selección + markSubjectProgress por
 el hook (guard equivalente: useMapaProgress.toggleSubject ya no-opea en        LOCKED); wrapper local para selectSubject + setIsPanelOpen(true);
 canOpenSubjectPage en L428. Canvas/viewport/edges intactos.

 4.5 Invariantes a preservar (NO negociables)                                   1. localStorage: key nextcampus_progreso_materias y evento
 nextcampus:mapa-progress-updated (src/lib/mapaProgress.ts) — no tocar; los     slugs de correlativasData.ts NO cambian (renombrar uno borra silenciosamente
 progreso guardado).                                                            2. Mapas de copy por view (DESKTOP_/MOBILE_/VISUAL_STATUS_*) intencionalmente
 distintos — no fusionar.
 3. Gate de hidratación: cada view conserva su loading propio mientras
 !progress.isHydrated.
 4. initialMode: /mapa → 'plan', /mapa/visual → 'ruta'.
 5. Agregar comentario en correlativasData.ts documentando el invariante "slug
 debe coincidir con el slug en DB" (gating de links frágil y no documentado).
 Migrar correlativas a DB queda FUERA de alcance.
                                                                                4.6 Tests

 Extender src/lib/domain/mapa/subjectQueries.test.ts (vitest, estilo
 existente): filterSubjects (nombre/código case-insensitive, filtros de status
 y año), getSuggestedSubjects (orden por unlocks, límite),
 groupSubjectsByYear, getYearSummaries (conteos), canOpenSubjectPage (set
 vacío = abierto).

 Commit: refactor(mapa): extract shared selection and filtering domain logic

 ---
 Explícitamente FUERA de alcance

 - NO tocar slugs ni rutas (regla del proyecto — y rompe el progreso guardado
 del mapa).
 - NO partir DashboardShell (falso positivo verificado) ni fusionar
 desktop/mobile del mapa en un mega-componente con condicionales.
 - NO cambiar la semántica de getLatestApuntes (diseño deliberado y
 documentado).
 - NO generateStaticParams (PPR + cache por función ya cubre).
 - NO migrar correlativas del mapa a la DB.
 - NO cambiar TTLs de cache existentes en esta pasada.

 Verificación (al final de cada fase + integral)

 1. pnpm typecheck tras cada fase; pnpm build antes de cada commit (la
 migración a cacheComponents SOLO se valida con build — los errores de
 "uncached data access" salen ahí; iterar agregando loading.tsx/Suspense donde
 el build lo exija).
 2. pnpm test (vitest): suites existentes de mapa + nuevas.
 3. Fase 1: en dev, abrir home/materia/apunte dos veces — la segunda sin query
 de career (logs de Prisma); crear/editar una materia desde admin y confirmar
 3. Gate de hidratación: cada view conserva su loading propio mientras !progress.isHydrated.
 4. initialMode: /mapa → 'plan', /mapa/visual → 'ruta'.
 5. Agregar comentario en correlativasData.ts documentando el invariante "slug debe coincidir con el slug en DB" (gating de links frágil y no documentado). Migrar correlativas a DB queda
 FUERA de alcance.

 4.6 Tests

 Extender src/lib/domain/mapa/subjectQueries.test.ts (vitest, estilo existente): filterSubjects (nombre/código case-insensitive, filtros de status y año), getSuggestedSubjects (orden por
 unlocks, límite), groupSubjectsByYear, getYearSummaries (conteos), canOpenSubjectPage (set vacío = abierto).

 Commit: refactor(mapa): extract shared selection and filtering domain logic

 ---
 Explícitamente FUERA de alcance

 - NO tocar slugs ni rutas (regla del proyecto — y rompe el progreso guardado del mapa).
 - NO partir DashboardShell (falso positivo verificado) ni fusionar desktop/mobile del mapa en un mega-componente con condicionales.
 - NO cambiar la semántica de getLatestApuntes (diseño deliberado y documentado).
 - NO generateStaticParams (PPR + cache por función ya cubre).
 - NO migrar correlativas del mapa a la DB.
 - NO cambiar TTLs de cache existentes en esta pasada.

 Verificación (al final de cada fase + integral)

 1. pnpm typecheck tras cada fase; pnpm build antes de cada commit (la migración a cacheComponents SOLO se valida con build — los errores de "uncached data access" salen ahí; iterar
 agregando loading.tsx/Suspense donde el build lo exija).
 2. pnpm test (vitest): suites existentes de mapa + nuevas.
 3. Fase 1: en dev, abrir home/materia/apunte dos veces — la segunda sin query de career (logs de Prisma); crear/editar una materia desde admin y confirmar que home y páginas afectadas
 reflejan el cambio (revalidateTag sobre el nuevo cache).
 4. Fase 2: subir un apunte con 2-3 recursos HTML y comparar tiempo contra main; verificar que los recursos quedan con orden correcto.
 5. Fase 3: pnpm build y comparar First Load JS de las rutas en el output del build contra main.
 6. Fase 4: smoke manual en /mapa (desktop y mobile: búsqueda, filtros, selección, toggle, autocompletar año, reset, links "Abrir materia") y /mapa/visual (selección, toggle desde panel,
 zoom/pan); round-trip de localStorage (marcar, recargar, persiste; dos pestañas sincronizan).
 7. Commits convencionales por fase, sin atribución a IA.
