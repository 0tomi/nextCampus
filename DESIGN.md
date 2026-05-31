---
name: nextCampus
version: "alpha"
description: Un campus estudiantil hecho por estudiantes, para estudiantes.
# Tokens alineados 1:1 con el bloque @theme de src/app/globals.css.
# La app es dark-only: `paper` e `ink` están reservados (heredados, sin uso activo hoy).
colors:
  paper: "#faf8f5"        # reservado (tema claro futuro) — sin uso activo
  ink: "#1a1a1a"          # reservado — sin uso activo
  primary: "#cc0000"      # rojo UADER — CTA principal y estados activos
  primary-light: "#e80000" # hover del CTA rojo
  primary-dark: "#990000"  # variante profunda (gradientes)
  accent: "#003366"       # azul UADER — contraste secundario
  surface-0: "#0f0f0f"    # fondo principal del body
  surface-1: "#1a1a1a"    # tarjetas y contenedores
  surface-2: "#141414"    # superficie neutra (fondos internos)
  surface-3: "#0a0a0a"    # superficie más profunda (botones del calendario)
typography:
  sans:
    fontFamily: "var(--font-jakarta), system-ui, sans-serif"
    weights: [400, 500, 600, 700, 800]
  display:
    fontFamily: "var(--font-sora), system-ui, sans-serif"
    weights: [400, 500, 600, 700, 800]
rounded:
  none: 0px               # radio dominante en cards de contenido y modales
  sm: 6px
  DEFAULT: 8px
  lg: 12px
  xl: 16px
---

## 1. Visual Theme & Atmosphere

nextCampus es un campus alternativo construido por estudiantes, para estudiantes. La interfaz busca seriedad académica —heredando la paleta institucional UADER— pero con un giro digital, denso y funcional.

La atmósfera es **dark-mode profundo con bordes vivos**: una base de grises casi negros, esquinas rectas en las superficies de contenido y una jerarquía construida con líneas finas semitransparentes en lugar de sombras blandas. El resultado se siente más cercano a un panel de control sobrio que a una landing decorativa.

- **Densidad:** media-alta (4–7). Es una herramienta de uso diario (calendario, apuntes, quiz), no una galería; prioriza información por pantalla sobre aire decorativo.
- **Variación:** moderada (4–6). Layouts alineados a la izquierda y asimétricos (sidebar fija + contenido), evitando lo perfectamente centrado.
- **Motion:** fluido pero sobrio (4–6). Entradas escalonadas y micro-interacciones de hover; nada cinematográfico.

## 2. Colors

La paleta se fundamenta en un modo oscuro profundo con tonos institucionales y semánticos:

- **Primary / Rojo UADER (`#cc0000`):** CTA rojo de marca (`bg-primary`), estados activos, indicador de "hoy" en el calendario, anillo de foco y `themeColor` de la PWA. Hover en `primary-light` (`#e80000`); `primary-dark` (`#990000`) para gradientes. Se usa también con opacidad (`bg-primary/10`, `border-primary/35`) para glows y bordes sutiles.
- **Accent / Azul UADER (`#003366`):** contraste secundario institucional.
- **Colores funcionales (semánticos):** además de su rol como tonos de año, ciertos colores tienen significado fijo en la UI:
  - **Cyan (`cyan-300`):** interactivo / seleccionado — pills de categoría activas, toggles de info, recursos interactivos (HTML).
  - **Emerald (`emerald-300/500`):** dato fresco / fecha — badges de "subido el…".
  - **Rose (`rose-300/400`):** error y acción destructiva — bordes de input inválido, mensajes de error, botón de eliminar.
- **Surfaces:** escala de grises muy oscuros, del fondo (`surface-0 #0f0f0f`) a las tarjetas (`surface-1 #1a1a1a`), pasando por superficies internas (`surface-2 #141414`) y la más profunda (`surface-3 #0a0a0a`).
- **Texto y bordes por opacidad de blanco:** la jerarquía de texto y separadores NO usa colores fijos, sino blanco con alpha. Es el sistema real del proyecto:
  - Texto: `white` (títulos/valores) → `white/64` (cuerpo) → `white/45`–`white/40` (labels/eyebrows) → `white/24` (íconos sutiles).
  - Bordes: `white/5` (reposo) → `white/10` (hover) → `white/8` (modales).
  - Rellenos sutiles: `white/5` (chips, tracks de progreso) → `white/[0.03]`.
- **Gradientes académicos:** se usan gradientes de Tailwind para distinguir años/materias y destacar elementos "premium". El acento dominante es **amber → orange** (badges, botón de Correlativas). La paleta de tonos disponible es: `amber`, `orange`, `emerald`, `violet`, `rose`, `cyan`, `sky`, `yellow`, `red` y `slate` (este último como tono neutro de evento).
- **No usar negro puro (`#000000`)** como superficie: la base es `#0f0f0f`. Los overlays sí usan negro con alpha (`bg-black/70`).

## 3. Typography

Dos familias de Google Fonts, cargadas vía `next/font` con `display: swap`:

- **Sans — Plus Jakarta Sans (`--font-jakarta`):** cuerpo de texto, botones, metadata y la mayoría de la UI. Limpia y geométrica.
- **Display — Sora (`--font-sora`):** títulos del calendario, encabezados de popover y elementos de gran jerarquía.

Patrones tipográficos característicos (firma del diseño):

- **Títulos y valores:** `font-black` (800) + `tracking-tight`. Ej: `text-4xl font-black tracking-tight` para cifras de `StatCard`, `text-3xl/5xl` para títulos de página.
- **Eyebrows / labels:** texto chico en **mayúsculas con tracking ancho** y baja opacidad. Patrón omnipresente: `text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40`. Se usa para etiquetar secciones, columnas y metadata.
- **Cuerpo:** `text-sm`/`text-base` con `leading-6`/`leading-relaxed` y color secundario `text-white/55`–`white/64`.
- **Escala fluida:** títulos del calendario via `clamp()`.

## 4. Components

Primitivos reales en `src/components/ui/` y `src/components/shell/`:

- **`DarkCard`** (tarjeta base): `rounded-none` + `border border-white/5` + `bg-surface-1`, con `hover:border-white/10`. Variante `interactive` añade `hover:-translate-y-1` (lift por transform). Es el contenedor de contenido por defecto y es **de esquinas rectas**, no redondeado.
- **`StatCard`** (métrica): compone `DarkCard` con un chip de ícono cuadrado (`h-12 w-12 rounded-none border-white/10 bg-white/5`), un eyebrow en mayúsculas, un valor `text-4xl font-black`, y una barra de progreso plana (`h-1.5 bg-white/5` con relleno `bg-white/80`).
- **`Modal`** (diálogo): overlay `bg-black/70 backdrop-blur-sm`, diálogo `rounded-none border-white/8 bg-surface-1` con **sombra difusa profunda** `shadow-[0_24px_64px_rgba(0,0,0,0.72)]`. Incluye lock de scroll, cierre con Escape, focus trap y `aria-modal`. Header con borde inferior `white/6` y botón de cierre con `hover:bg-white/5`.
- **`Sidebar`** (navegación): items con `rounded-md`, `hover:bg-white/5` y `bg-white/5` para el activo (`aria-current="page"`). Cada item lleva un badge cuadrado con gradiente (`rounded-sm bg-gradient-to-br`, default amber→orange) y un chevron que se desplaza en hover (`group-hover:translate-x-0.5`). Al pie, CTA "premium" de Correlativas con gradiente amber/orange y glow muy sutil.
- **Botones — conviven dos estilos primarios (observado en el código, no es regla rígida):**
  - **Rojo de marca:** `bg-primary text-white hover:bg-primary-light` (a veces `rounded-md`, a veces recto) — es el primario más común: CTAs de onboarding ("Configurar") y la mayoría de submits/acciones (Quiz, modales de admin como `QuizBankModal`).
  - **Blanco sobre negro:** `rounded bg-white px-4 py-2 text-black font-semibold` (`disabled:opacity-50`) — usado puntualmente como confirmación en el modal de apuntes ("Crear apunte"). No es la norma de todos los modales.
- **Botones secundarios / ghost:** `rounded(-md) border border-white/10 bg-transparent` (o `bg-surface-0`) + `hover:bg-white/5 hover:text-white`. Texto en `white/60`–`white/70`.
- **Inputs / campos de formulario:** label arriba como eyebrow (`text-xs font-semibold uppercase tracking-widest text-white/40`); campo `rounded border border-white/10 bg-surface-0 px-3 py-2 text-sm` con `placeholder:text-white/30` y foco `focus:border-white/20 focus:outline-none`. Estado de error: `border-rose-400/50` + texto de ayuda `text-rose-400` debajo.
- **Pills seleccionables (chips):** `rounded-full border px-3 py-1.5 text-xs font-bold`. Inactivo `border-white/10 bg-white/[0.03] text-white/50`; activo en cyan `border-cyan-300/50 bg-cyan-300/15 text-cyan-100`. Al autoseleccionarse pulsan con glow (`scale-105 shadow-[0_0_22px_rgba(103,232,249,0.25)]`).
- **Control segmentado (tabs):** contenedor `rounded border border-white/8 bg-surface-0 p-1` con botones internos; el activo `bg-white/10 text-white`, inactivos `text-white/45 hover:bg-white/5`.
- **Mensajes de error / validación:** bloque `rounded border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300`.
- **Cursor:** `button` y `[role="button"]` tienen `cursor: pointer` global; `:disabled` → `not-allowed`.
- **Estados de foco:** `*:focus-visible` (fuera de inputs) recibe `outline: 2px solid #cc0000` con `outline-offset: 2px`. Las tarjetas-link usan `focus-visible:ring-2 ring-white/40`.

## 5. Layout & Spacing

- **Arquitectura de doble shell:** la app monta árboles distintos para escritorio y mobile, no solo CSS responsive.
  - Escritorio (`hidden lg:block`): `DashboardShell` = topbar + sidebar fija (~332px) + contenido principal.
  - Mobile (`lg:hidden`): `MobileShell` / `MobileHome` con drawer y navegación táctil propias.
- **Ritmo vertical:** las secciones de contenido respiran con `space-y-10` / `space-y-12`; agrupaciones internas con `space-y-5`.
- **Grillas:** mobile-first con colapso a una columna. Ej: `HomeYearsGrid` va `grid-cols-1/2` → `lg:grid-cols-3`. Sin overflow horizontal en mobile.
- **Contención:** anchos máximos para bloques de contenido (`max-w-2xl`, `max-w-xl`, `max-w-4xl`).
- **Hero / encabezado de página:** alineado a la izquierda, asimétrico (mascota superpuesta), título `text-4xl sm:text-5xl font-black tracking-tight` con subtítulo `text-white/50`. Sin layouts centrados de marketing.
- Se aprovechan los espacios negativos para una interfaz limpia y enfocada en el estudio.

## 6. Elevation & Depth

La elevación NO se basa en sombras blandas tipo Material. El modelo real es:

- **Superficies + bordes + opacidad:** las tarjetas se separan del fondo con `bg-surface-1` y un borde fino `border-white/5` que se aclara a `white/10` en hover. La profundidad se comunica subiendo el nivel de superficie y la opacidad del borde, no con drop-shadows.
- **Sombras difusas solo en overlays:** modales y popovers sí usan sombras profundas y difusas (`shadow-[0_24px_64px_rgba(0,0,0,0.72)]`, popover `0 24px 80px rgba(0,0,0,0.45)`) para despegarse del contenido.
- **Lift por transform:** las tarjetas interactivas se elevan con `hover:-translate-y-1`, no con cambio de sombra.

> Nota: existen tokens `--shadow-hard` / `--shadow-hard-sm` (offset duro 4–6px) heredados de la SPA original, pero **no se usan** en la app actual. No son un patrón vivo; no introducirlos en pantallas nuevas.

## 7. Shapes

El radio NO es uniforme: hay un **split deliberado** entre superficies rectas y controles suaves.

- **`rounded-none` (0px):** superficies de contenido y diálogos — `DarkCard`, `StatCard`, `Modal` — más los botones y eventos del calendario (FullCalendar: `.fc-button`/`.fc-event` con `border-radius: 0`). Es la firma "borde vivo" del producto. Ojo: esto aplica a esas superficies y al calendario; los botones e inputs propios de la app NO son 0px (ver abajo).
- **`sm` (6px) / `DEFAULT` (8px):** la mayoría de controles — botones (`rounded`/`rounded-md`), inputs, items de sidebar, badges (`rounded-sm`), chips, contenedores anidados (`rounded-lg`).
- **`lg` (12px) / `xl` (16px) / `2xl`:** contenedores envolventes mayores y tarjetas mobile más amigables al tacto.
- **`full` (pill):** chips/pills seleccionables (categorías) y badges redondeados.

Regla práctica: contenido y modales → recto; navegación, badges y pills → suave/pill.

## 8. Motion & Interaction

El sistema de movimiento vive en `globals.css` y respeta `prefers-reduced-motion`.

- **Entradas:** `.animate-in` (fade + translateY 12px, `cubic-bezier(0.16,1,0.3,1)`, 0.4s) para montar bloques; el wrapper `AnimateIn` la aplica a secciones.
- **Cascada escalonada:** `.stagger-children` revela hijos con delays incrementales de 50ms (hasta 12 elementos) — listas y grillas no aparecen de golpe.
- **Micro-interacciones de hover:** lift de tarjetas (`-translate-y-1`), desplazamiento de chevrons (`translate-x-0.5`), transiciones de borde/fondo de 120–300ms.
- **Motion temático del Mapa de Correlativas:** nodos con `clip-path` poligonal y entrada con escala, trazos SVG animados (`stroke-dashoffset`), pulso y flujo continuo — estética "mapa interactivo".
- **Marquee en eventos del calendario:** títulos largos se desplazan en hover/focus (`fc-event-marquee`).
- **Secciones plegables (collapse):** patrón de altura animada con grilla — `grid-rows-[1fr]` ↔ `grid-rows-[0fr]` + `opacity`, con el hijo en `overflow-hidden`, y chevron que rota 180°. Es la forma estándar de mostrar/ocultar campos opcionales (link compartible, descripción, panel de info). Respeta `motion-reduce:transition-none`.
- **Loading — skeletons:** estados de carga con `animate-pulse bg-white/[0.06]` que replican las dimensiones reales del layout (tarjetas, líneas de texto). Nunca spinners genéricos.
- **Empty states compuestos:** borde discontinuo (`border-dashed border-white/10`) + ícono + título + texto + CTA. Nunca un "No hay datos" pelado.
- **Performance:** animar solo `transform` y `opacity`. Todas las animaciones se desactivan bajo `prefers-reduced-motion: reduce`.

## 9. Do's and Don'ts

- **Do:** comunicación directa y amigable, "de estudiante a estudiante", sin formalidades innecesarias.
- **Do:** construir jerarquía con niveles de superficie (`surface-0`→`surface-3`) + bordes `white/5–white/10` + opacidad de texto, en lugar de sombras blandas.
- **Do:** mantener el split de radios — contenido/modales rectos, navegación/badges suaves.
- **Do:** respetar `prefers-reduced-motion` y los estados de foco visibles (`outline` rojo) en todo elemento interactivo.
- **Do:** `cursor-pointer` en todo lo clickeable.
- **Don't:** anotar ni exponer cuestiones técnicas o de infraestructura en el frontend. Frases como "renderiza en el servidor", "Client Component" o alusiones al framework son inaceptables para el usuario final.
- **Don't:** usar negro puro (`#000000`) como superficie ni sombras blandas tipo Material en tarjetas.
- **Do:** para el CTA rojo usar `primary` / `primary-light` (hover) / `primary-dark` (gradiente). Las clases `uader-*` fueron migradas y eliminadas — no volver a usarlas.
- **Don't:** reintroducir los tokens `--shadow-hard*` (muertos) ni las clases `uader-*` (ya no existen en el tema).
- **Don't:** emojis en la UI.
