---
name: nextCampus · Mobile
version: "alpha"
description: Pautas de rediseño mobile para nextCampus. Extiende DESIGN.md — los tokens (colores, tipografía, radii) son los mismos. Esto define los patrones de layout/interacción específicos para viewport < 768px.
breakpoints:
  mobile: "< 640px"     # diseño base de este documento
  tablet: "640 - 1024px" # interpolar entre mobile y desktop
  desktop: "≥ 1024px"   # ver DESIGN.md
target-device: iPhone 15 (393×852)
---

## Resumen

El desktop usa **shell de 2 columnas** (sidebar fijo a la izquierda + main). En mobile esa estructura no cabe, así que:

- El sidebar **colapsa a un drawer** disparado desde un hamburger en el topbar.
- La grilla horizontal de años (5 columnas) **se vuelve un carrusel paginado por año** con scroll-snap horizontal.
- Las secciones largas de la página de materia (Calendario / Quiz / Apuntes) **se condensan en tabs** para evitar scroll infinito.
- El `FullCalendar` mensual **se reemplaza por una vista de calendario propia** (grid 7×6 + dots + listado debajo) optimizada para touch.

Mantenemos paleta, tipografía, radii y tonos por año del design system original.

---

## Shell

### Topbar
- Altura: **56px**, sticky, `background: rgba(20,20,20,0.92)` con `backdrop-filter: saturate(180%) blur(14px)`.
- Borde inferior: `1px solid rgba(255,255,255,0.05)`.
- 3 zonas: botón izq (hamburger o back chevron) · brand compacto + subtítulo · botón Admin a la derecha.
- Hit-targets: 40×40 mínimo, `border-radius: 10`.
- El brand muestra:
  - Logo 30×30 con gradient amber→orange y el ícono GraduationCap.
  - Título principal `font-weight: 800, font-size: 14`.
  - Subtítulo en eyebrow `font-size: 9, letter-spacing: 0.18em, color: rgba(255,255,255,0.40)`.
- Cuando hay back: el hamburger se reemplaza por chevron izquierdo (mismo hit area).

### Drawer (sidebar móvil)
- Slide desde la izquierda, ancho **304px**, `background: #141414`.
- Backdrop: `rgba(0,0,0,0.6)`, fade 240ms.
- Panel: transición 320ms `cubic-bezier(0.16,1,0.3,1)`, `box-shadow: 24px 0 60px rgba(0,0,0,0.5)`.
- Estructura idéntica al sidebar desktop:
  - Header con eyebrow "CARRERA" + nombre + botón close.
  - Body: eyebrow "AÑOS ACADÉMICOS" + lista de años con badge gradient (mismos colores que desktop) + meta "N materias".
  - Footer: "FCYT · UADER" + versión.

---

## Patrones específicos

### Year carousel (Home)
**Reemplaza** la grilla `grid-cols-3 xl:grid-cols-5` del desktop.

- Contenedor: `display: flex; overflow-x: auto; scroll-snap-type: x mandatory`.
- Cada card: `flex: 0 0 100%`, `scroll-snap-align: center`, padding lateral 18px.
- **Pill row arriba**: chips de "Año 1..5" con dot del color del año. La pill activa lleva borde del color (`tone`) + fondo `rgba(255,255,255,0.04)`.
- **Dots abajo**: 5 puntos. El activo se expande a `width: 22px` con el `tone` del año; los demás son `rgba(255,255,255,0.18)`, 6×6.
- Card interna:
  - `border-radius: 12px`, `background: #1a1a1a`, `border: 1px solid rgba(255,255,255,0.05)`.
  - Header gradient (clickable → year page) con padding 18px, muestra "AÑO N · M materias" + nombre del año + flecha en chip oscuro.
  - Lista de materias: `<button>` con ícono Layers + nombre + chevron, separadas por `border-top: 1px solid rgba(255,255,255,0.05)`.

### Year switcher pill (vista de año)
Para "rotar entre años sin volver al home". Pill row scrollable horizontal, fija debajo del hero del año.

### Subject row (vista de año)
Cards apiladas verticalmente, gap 10px. Layout:
- Badge cuadrado 40×40 con gradient del año + número 01/02/03.
- Columna central: eyebrow "Materia 0N" + nombre + meta inline (N eventos · N apuntes).
- Chevron a la derecha.

### Materia tabs
3 tabs segmented control en `<div role="tablist">`:
- Container: `padding: 4; background: #0f0f0f; border-radius: 10`.
- Tab activo: `background: #1f1f1f` + `box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06)`.
- Cada tab: ícono Lucide 13px + label `font-weight: 700`.
- Las 3 tabs: **Agenda** (calendario), **Quiz**, **Apuntes**.

### Calendario mobile
Component `MobileCalendar` — reemplaza FullCalendar mensual.

- Header: nombre del mes en `font-size: 22, font-weight: 900` + chevrons prev/next en `navCircle` (36×36, circular, `#1a1a1a`).
- DoW strip: D L M M J V S, días de semana con `rgba(255,255,255,0.48)`; fines de semana atenuados a `0.32`.
- Grid: `grid-template-columns: repeat(7, 1fr); gap: 2`. Cada celda `aspect-ratio: 1/1`, `border-radius: 8`.
- Día normal: `color: rgba(255,255,255,0.85), font-weight: 600`.
- Día actual: `color: <tone-del-año>, font-weight: 900`.
- Día seleccionado: `background: <tone>, color: #0a0a0a, font-weight: 900`.
- Días de mes anterior/siguiente: `color: rgba(255,255,255,0.18)`, no clickeables.
- Dots por evento debajo del número: máx 3, 4×4, redondeados, color según `EVENT_TONES[tipo].text`. Cuando el día está seleccionado, los dots pasan a `rgba(0,0,0,0.55)` para contrastar contra el fill.
- Legend al pie del card del calendario: dot color + label de cada tipo (Examen / Trabajo Práctico / Exposición).

**Comportamiento:**
- Estado inicial: **sin día seleccionado** → listado debajo muestra todos los eventos del mes ordenados, header dice "Todos los eventos · [mes]".
- Tap en un día: ese día queda relleno, listado filtra a sólo sus eventos, header pasa a "lunes 23 de mayo", aparece pill "Ver mes" para deseleccionar.
- Tap en el mismo día seleccionado: deselecciona (vuelve al estado mes).

### Agenda card (compact)
Cuando se listan eventos verticalmente (en home, año, día seleccionado):
- Container: `background: #1a1a1a`, `border-radius: 10`, padding `12px 14px`.
- Columna izquierda 48px: separador vertical hacia la derecha. Muestra:
  - Día de semana (3 letras, `font-size: 9, letter-spacing: 0.15em`).
  - Número de día grande (`font-size: 22, font-weight: 900`).
  - Mes (3 letras, `font-size: 9`).
- Columna derecha: chip del tipo (con `EVENT_TONES`) + título + hora.

---

## Vistas

### 1 · Home (`/`)
1. Topbar.
2. Hero: eyebrow CARRERA, nombre, descripción.
3. Stats inline (Años · Materias · Próximos eventos), 3 cards de 1fr.
4. Year carousel (pieza central).
5. "Próximos eventos" — agenda compacta cross-año, top 6 eventos.

### 2 · Drawer
Igual al sidebar desktop. La diferencia es el chrome (slide-in + backdrop + close button).

### 3 · Vista de año (`/year/[slug]`)
1. Topbar con back.
2. Hero gradient: `padding: 20px 18px 18px`, `border-radius: 12`, fondo con el `gradient` del año + blob radial difuminado. Muestra: "AÑO N · M MATERIAS" + nombre + dos pills oscuros ("N eventos", "N materias").
3. Year switcher (pill row).
4. **Próximos 3 eventos** (no toda la agenda) + CTA grande "Ver calendario completo" con borde `1px solid <tone>` y badge gradient pequeño con ícono calendar → abre vista calendario.
5. "Accesos directos del año" → lista vertical de SubjectRow.

### 4 · Vista de materia · tab Agenda (`/materia/[slug]`)
1. Topbar con back.
2. Hero card: chip del año (con `chipClassName`), título grande, descripción, botón Drive full-width, summary stats (Eventos · Apuntes · Quizzes) separados por dividers verticales.
3. Tabs Agenda / Quiz / Apuntes.
4. **Tab activa: Agenda** — `MobileCalendar` con eventos de la materia (initialDate = primer evento).

### 5 · Vista de materia · tab Quiz
Tab body: bancos seleccionables (cards con ícono Sparkles + título + N preguntas + checkbox tintado con `tone` del año) + CTA grande con gradient del año "Empezar quiz".

### 6 · Vista de materia · tab Apuntes
Tab body: cards apilados con eyebrow APUNTE + título + botón PDF (con `chipClassName` del año) o Link (neutro) + descripción rich-text debajo.

### 7 · Calendario del año (`/year/[slug]/calendario`)
1. Topbar con back, subtítulo = nombre del año.
2. `MobileCalendar` con TODOS los eventos del año, sin día preseleccionado → lista debajo muestra todos los eventos del mes corriente.

### 8 · Calendario · día seleccionado
Mismo `MobileCalendar` pero con un día tocado: queda relleno con el `tone` del año, lista filtra a ese día, pill "Ver mes" arriba a la derecha.

---

## Tokens nuevos (no estaban en DESIGN.md)

| Token | Valor |
|---|---|
| `mobile-topbar-h` | 56px |
| `mobile-drawer-w` | 304px |
| `mobile-page-px` | 18px (padding lateral default) |
| `agenda-card-day-col` | 48px |
| `mobile-hit-min` | 40px |
| `pill-h` | 30–32px |

### EVENT_TONES
Mapeo de `tipoEvento.nombre` → tono. Se usa en chips de agenda y dots del calendario.

```
Examen           → bg rgba(239,68,68,0.16)  border rgba(239,68,68,0.36)  text #fecaca
Trabajo Práctico → bg rgba(251,191,36,0.16) border rgba(251,191,36,0.36) text #fde68a
Exposición       → bg rgba(167,139,250,0.16) border rgba(167,139,250,0.36) text #ddd6fe
Aviso            → bg rgba(255,255,255,0.08) border rgba(255,255,255,0.14) text #fff
```

---

## Do's and Don'ts (mobile)

- **Do:** Mantener hit-targets ≥ 40×40. Cualquier botón menor a eso es bug.
- **Do:** Reusar gradients y `chipClassName` por año del `yearColors.ts` original — no inventar tonos nuevos en mobile.
- **Do:** Animar transiciones con `cubic-bezier(0.16, 1, 0.3, 1)` (ya usado en el desktop para `elementIn`).
- **Don't:** Renderizar `FullCalendar` en mobile — usar `MobileCalendar` propio. El layout grid de FC no es touch-friendly y sus controles son demasiado chicos.
- **Don't:** Forzar drawer permanente sobre el contenido. Es modal y debe poder cerrarse tanto con tap en el backdrop como con el botón close.
- **Don't:** Apilar más de 3 secciones largas en una página — usar tabs (caso materia) o paginar (caso carrusel de años).
