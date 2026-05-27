# Plan: Adaptar el estilo visual de nextCampus al SPA de referencia

## Context

El frontend actual de **nextCampus** debía replicar el estilo visual del repo
`tomygiordev/plataforma-academica-spa`. El agente que lo implementó portó solo
la **capa de tokens** (Tailwind config: paleta UADER, `ConstructivistCard`,
sombras duras, `bg-paper`) y construyó páginas claras simples con header/footer
`max-w-5xl`. Pero esa capa brutalista clara es **minoritaria** en el SPA: solo
se usa dentro del modo focus/estudio.

La identidad **dominante y real** del SPA es un **dark dashboard**:
- Fondos `#0f0f0f` (página), `#1a1a1a` (nav + cards), `#141414` (sidebar), `#0a0a0a` (inputs)
- Nav superior sticky + sidebar fijo `w-72`
- Bordes hairline `border border-white/5`, esquinas `rounded-none`
- Acentos por año con gradiente (amber→orange, emerald→teal, violet→purple, rose→pink, cyan→blue)
- Íconos `lucide-react`, badges numerados con gradiente, tipografía `font-black`
- Micro-labels uppercase `tracking-[0.2em]`, animaciones de entrada (`animate-in`, `stagger-children`)

**Objetivo:** adoptar el dark dashboard como identidad base (home/año/materia/admin),
mantener el brutalist claro **solo** para quiz/estudio (focus), y reemplazar el
calendario por **FullCalendar**. Solo cambia lo **visual**: la lógica funcional
(Server Components, Prisma, server actions, rutas) se conserva.

Decisión confirmada por el usuario: *Dark dashboard como base + focus claro*.

---

## Cambios de dependencias (explícito, no es efecto colateral)

1. **Re-agregar `lucide-react`** — fue removida deliberadamente antes. El dark
   dashboard es icon-heavy (GraduationCap, ChevronRight, Layers, ArrowLeft,
   Upload, Shield, BookOpen, CalendarDays, etc.). Es necesaria.
2. **Agregar FullCalendar** — `@fullcalendar/react`, `@fullcalendar/daygrid`
   (y `@fullcalendar/interaction` solo si se requiere click en eventos). Pedido
   explícito del usuario: el calendario actual es una lista propia; se reemplaza
   por FullCalendar estilado al dark theme.
3. NO se re-agrega `zustand` (es estado funcional del SPA; nextCampus usa Server
   Components + Prisma — fuera de alcance visual).

---

## Sistema visual a portar

### Tokens (en `src/app/globals.css`, bloque `@theme` de Tailwind v4)
Agregar superficies dark — NO migrar a `tailwind.config.ts`:
```
--color-surface-0: #0f0f0f;   /* página */
--color-surface-1: #1a1a1a;   /* nav + cards */
--color-surface-2: #141414;   /* sidebar */
--color-surface-3: #0a0a0a;   /* inputs */
```
Mantener tokens UADER/brand existentes (los usa el focus claro).
`body` cambia a fondo `#0f0f0f` + texto blanco; el shell focus reaplica `bg-paper`.

### Animaciones (portar a `globals.css`)
Copiar de `src/index.css` del SPA: keyframes `elementIn`/`slideUp`/`slideIn`,
clases `.animate-in`, `.stagger-children > *:nth-child(n)`, scrollbar custom y
`*:focus-visible { outline: 2px solid #CC0000 }`.

### Fuentes
Mantener `next/font` (Plus Jakarta Sans + Sora) ya configurado. El SPA usa
mayormente `font-black` sobre sans; los headings grandes pasan a `font-black`
en lugar de `font-display`. Sin cambio de dependencia de fuentes.

---

## Arquitectura de componentes (nueva)

Crear en `src/components/`:

- **`shell/DashboardShell.tsx`** (client wrapper liviano): nav superior sticky
  `h-16 bg-[#1a1a1a] border-b border-white/5` + `<aside class="w-72 bg-[#141414]">`
  + `<main class="flex-1 p-8 bg-[#0f0f0f]">`. Recibe `sidebar` y `children` como props.
- **`shell/Sidebar.tsx`**: lista navegable (años / materias / unidades) con el
  patrón de botones del SPA (badge gradiente + `truncate` + hover `bg-white/5`).
- **`ui/DarkCard.tsx`**: reemplazo dark de `ConstructivistCard`
  (`bg-[#1a1a1a] border border-white/5 rounded-none hover:border-white/10`).
  Variantes: `default`, `interactive` (hover -translate-y-1).
- **`ui/StatCard.tsx`**: card con chip de ícono coloreado + valor `font-black` +
  barra de progreso (para dashboards de materia/unidad).
- **`ui/AnimateIn.tsx`** (client): wrapper `'use client'` que aplica
  `animate-in` / mount-fade. **Las páginas siguen siendo Server Components**;
  la animación de entrada se aísla aquí para no arrastrar `useState/useEffect`
  al server. Para listas, usar la clase CSS `stagger-children` (sin JS).
- **`lib/yearColors.ts`**: mapeo **estable** de color por año. El SPA indexa por
  posición de array; nextCampus lee de Prisma → mapear por `year.orden` (o
  `slug`) con módulo sobre la paleta de 5 gradientes, para que el color no se
  reordene si cambian datos.

`ConstructivistCard` + `GeometricDeco` se conservan **solo** para el modo
focus/quiz (theme claro).

---

## Restyle por página (solo visual; data flow intacto)

| Archivo | Cambio visual |
|---|---|
| `src/app/layout.tsx` | Reescribir: quitar header/footer `max-w-5xl`. Body dark `#0f0f0f`. El layout raíz solo provee fondo + fuentes; el shell (nav+sidebar) se compone por sección. Decidir footer: **eliminarlo** (el SPA no tiene). |
| `src/app/page.tsx` (home) | Estilo **LobbyPage**: nav `h-20` con logo gradiente + GraduationCap, sidebar de años, grid `grid-cols-5` de cards por año con header gradiente y lista de materias. Mantener `getCareer()` server-side. |
| `src/app/year/[slug]/page.tsx` | Estilo **YearPage**: nav + sidebar de materias + área principal con **FullCalendar** (ver abajo). |
| `src/app/materia/[slug]/page.tsx` | Estilo **SubjectPage**: header con label año, `h1 font-black`, grid `grid-cols-2` de unidades/secciones con `DarkCard` + badge gradiente + ArrowRight. Calendario de eventos → FullCalendar dark. Apuntes → `DarkCard` lista con descarga PDF. |
| `src/app/materia/[slug]/quiz/page.tsx` + `QuizRunner.tsx` | **Mantener brutalist claro** (FocusShell): `bg-paper`, `border-4 border-ink`, `shadow-hard`. Solo asegurar consistencia con `ConstructivistCard`. |
| `src/app/admin/page.tsx` | Estilo **AdminShell**: nav dark con Shield + sidebar de menú + main dark. |
| `src/app/admin/login/LoginForm.tsx` | Estilo **AdminLoginPage**: dark minimal, cajas geométricas decorativas, acentos violeta, inputs `bg-[#0a0a0a] border-white/5`, glow blur. Cliente (ya lo es). |
| `src/app/admin/materia/[slug]/page.tsx` | Forms admin en dark: inputs `bg-[#0a0a0a] border border-white/5 text-white`, botones `bg-white/5 hover:bg-white/10`. |

---

## Calendario → FullCalendar

- Crear **`src/components/calendar/EventCalendar.tsx`** (`'use client'`):
  `@fullcalendar/react` + `dayGridPlugin`, vista `dayGridMonth`, locale `es`.
- Recibe `events` como prop desde el Server Component (los eventos vienen de
  Prisma vía las queries existentes — sin cambio de data layer). Mapear cada
  evento a `{ title, date, classNames }` con color por `tipo`.
- **Estilado dark**: override de CSS de FullCalendar en `globals.css` (o CSS
  module) — fondo `#1a1a1a`, bordes `white/5`, header/toolbar dark,
  `rounded-none`, tipografía del proyecto. FullCalendar permite theming vía
  variables CSS `--fc-*` (border-color, page-bg-color, neutral-bg-color,
  today-bg-color) — preferir esa vía sobre overrides frágiles.
- Reemplaza la lista propia de eventos en `materia/[slug]` y el grid manual
  `grid-cols-7` en `year/[slug]`.

---

## Restricciones (cumplir)

- **NO** correr el dev server de Next bajo ninguna circunstancia (congela la PC).
  Verificación = análisis estático + typecheck + build NO (regla del proyecto:
  "Never build after changes"). Validación visual real la hace el usuario.
- Páginas públicas/admin son **Server Components** con Prisma: el restyle no
  debe introducir `useState/useEffect` en ellas. Animaciones de entrada van en
  wrappers client (`AnimateIn`) o vía clase CSS `stagger-children`.
- Solo cambia presentación: rutas, server actions, queries Prisma, API routes
  y el modelo de datos quedan **intactos**.
- nextCampus tiene diferencias funcionales con el SPA (features distintas): se
  adopta el **lenguaje visual**, no se copian features ni stores del SPA.

---

## Archivos a crear / modificar

**Crear:**
- `src/components/shell/DashboardShell.tsx`
- `src/components/shell/Sidebar.tsx`
- `src/components/ui/DarkCard.tsx`
- `src/components/ui/StatCard.tsx`
- `src/components/ui/AnimateIn.tsx`
- `src/components/calendar/EventCalendar.tsx`
- `src/lib/yearColors.ts`

**Modificar:**
- `package.json` (deps: `lucide-react`, `@fullcalendar/react`, `@fullcalendar/daygrid`)
- `src/app/globals.css` (tokens dark + animaciones + overrides FullCalendar)
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/year/[slug]/page.tsx`
- `src/app/materia/[slug]/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/login/LoginForm.tsx`
- `src/app/admin/materia/[slug]/page.tsx`

**Conservar (focus claro):**
- `src/components/shared/ConstructivistCard.tsx`
- `src/app/materia/[slug]/quiz/page.tsx`, `QuizRunner.tsx`

---

## Verificación (sin dev server)

1. `pnpm install` para registrar nuevas deps (lucide-react, FullCalendar).
2. `pnpm tsc --noEmit` (o `next typecheck` si está configurado) — sin errores de tipos.
3. `pnpm lint` — sin errores nuevos.
4. Revisión estática página por página contra la tabla de restyle:
   confirmar superficies dark, sidebar `w-72`, `rounded-none`, gradientes por
   año estables, íconos lucide presentes, focus/quiz sigue claro.
5. **El usuario** arranca el dev server y valida visualmente (golden path:
   home → año → materia → quiz → admin/login → admin), incluido FullCalendar
   renderizando eventos reales de Prisma en dark.
