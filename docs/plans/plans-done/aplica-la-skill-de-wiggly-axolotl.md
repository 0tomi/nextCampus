# Plan: Subir el score de React Doctor de 84 → >95

## Context

Corrimos `npx react-doctor . --verbose --diff`: **score 84/100, 82 warnings** (0 errores).
Distribución: Bugs 26 · Performance 29 · Accessibility 18 · Maintainability 8 · Security 1.

El objetivo del usuario es pasar de **95**. Analizamos cada familia de reglas con la skill
**Vercel React Best Practices** (obligatoria) y leímos el código real para separar
**true positives** (arreglar) de **false positives** (no romper código correcto).

Hallazgo central: ~18 de los 82 son **falsos positivos** — arreglarlos rompería código que
funciona (ej. quitar `allow-same-origin` rompe el player de YouTube; convertir inputs
independientes a `useReducer` viola la regla del propio proyecto). La propia guía de
react-doctor dice tratar los diagnósticos como *hipótesis* y suprimir solo con evidencia.

**Estrategia (no predecir, MEDIR):** arreglar true positives en lotes por riesgo creciente,
re-corriendo react-doctor después de cada lote para ver el delta real del score. Para el
residuo de falsos positivos, **supresión documentada en `doctor.config`** (decisión del usuario).
Migración a `<dialog>` nativo INCLUIDA (decisión del usuario).

---

## Decisiones del usuario
- **prefer-html-dialog**: migrar Sheet/Modal/AlertDialog a `<dialog>` nativo AHORA, con testing manual de foco/teclado.
- **Falsos positivos**: suprimir en `doctor.config` con comentario justificando cada regla.

---

## Setup previo
Instalar react-doctor como dev dep para tener config + script reproducible:
```bash
npx react-doctor install --yes   # agrega doctor.config, script "doctor", devDep
```
Luego, el loop de cada lote: **fix → `pnpm doctor` (o npx) → leer delta → siguiente lote**.

---

## LOTE 1 — Mecánicos seguros (behavior-preserving, hacer primero)

Cero cambio de comportamiento. Mayor relación valor/riesgo.

| Regla | # | Acción | Archivos representativos |
|-------|---|--------|--------------------------|
| `rerender-memo-with-default-value` | 4 | Hoistear default no-primitivo (`= []`) a const módulo (`const EMPTY: T[] = []`) | `EventModal.tsx:86`, `MapaCorrelativas.tsx:1155`, `MobileEventDetailSheet.tsx:56`, `EventCalendar.tsx:139` |
| `only-export-components` | 4 | Mover helpers no-componente a archivo aparte (`*.utils.ts`) y reimportar | `AdminSidebar.tsx:18`, `HomeYearsGrid.tsx:60`, `HomeGlobalCalendar.tsx:38,48` |
| `prefer-module-scope-pure-function` | 3 | Subir fn pura sin estado a scope de módulo | `[yearSlug]/calendario/page.tsx:32`, `[yearSlug]/page.tsx:52`, `ConfigurarForm.tsx:95` |
| `control-has-associated-label` | 2 | Agregar `aria-label` a botones/inputs de color | `YearModal.tsx:189,207` |
| `no-generic-handler-names` | 1 | Renombrar `handleClick` → `editApunte` | `EditApunteButton.tsx:27` |
| `js-combine-iterations` | 10 | Fusionar `.filter().filter()`/`.map` en una pasada (`reduce`/`for...of`). Mayoría en Server Components: bajo impacto runtime pero cuenta para el score y es seguro | `page.tsx:142,233`, `mapa/page.tsx:68`, `mapa/visual/page.tsx:66`, `[yearSlug]/page.tsx:72`, `HomeSidebar.tsx:25` |

> `label-has-associated-control` (`YearModal.tsx:168,203`): **revisar caso a caso** — 203 ya envuelve el input (FP); 168 es label de grupo → convertir a `<span>`/`<legend>` o `role`. Incluir solo el real.

**Checkpoint: re-correr react-doctor.**

---

## LOTE 2 — Cluster de primitivos UI compartidos (alto payoff, ~17 hallazgos)

Concentrado en `Sheet.tsx`, `Modal.tsx`, `AlertDialog.tsx`, `NosotrosModal.tsx`, `InstallPWA.tsx`.

1. **`prefer-tag-over-role` (8)** — reemplazar `role="button"` + `tabIndex`/`onKeyDown` por `<button type="button">` real, preservando estilos (Tailwind) y handlers. Archivos: `AgendaCard.tsx:60`, `MapaCorrelativas.tsx:961`, `CommissionSelectField.tsx:34`, `MapaCorrelativasMobile.tsx:911`, `InstallPWA.tsx:17`, `Sheet.tsx:119`, `Modal.tsx:123`, `NosotrosModal.tsx:182`.
2. **`prefer-use-effect-event` (3)** — envolver el handler usado dentro de `addEventListener` con `useEffectEvent` (React 19) para que el effect no se re-suscriba al cambiar `onClose`. Archivos: `AlertDialog.tsx:54`, `Sheet.tsx:58`, `Modal.tsx:61`. (Vercel: `advanced-use-latest` / `rerender-move-effect-to-event`.)
3. **`prefer-html-dialog` (6) — workstream sensible al comportamiento.** Migrar los primitivos modales a `<dialog>` nativo (focus-trapping + Esc nativos), eliminando el atrapado manual de foco. Archivos: `MobileShell.tsx:363`, `InstallPWA.tsx:17`, `AlertDialog.tsx:101`, `Sheet.tsx:119`, `Modal.tsx:123`, `NosotrosModal.tsx:182`.
   - **Testing obligatorio post-cambio**: abrir/cerrar, foco al abrir, Tab/Shift+Tab atrapado dentro, Esc cierra, click backdrop cierra, scroll-lock, en mobile (`MobileShell`, `Sheet`). No dar por terminado sin probar cada modal.

**Checkpoint: re-correr react-doctor + verificación manual de modales.**

---

## LOTE 3 — Bugs de comportamiento en modales admin (reales, verificar cada uno)

State-sensitive: leer el componente completo antes de tocar.

| Regla | # | Acción | Archivos |
|-------|---|--------|----------|
| `no-prop-callback-in-effect` | 5 | Mover `onSuccess?.()`/`onClose()` fuera del effect, al flujo de éxito de la server action | `EventModal.tsx:142,143`, `SubjectModal.tsx:69,70`, `CommissionModal.tsx:40` |
| `no-event-handler` | 4 | Eliminar el patrón prop+useEffect que simula handler; llamarlo en el evento real | `EventModal.tsx:89`, `YearModal.tsx:34`, `SubjectModal.tsx:39`, `ApunteModal.tsx:76` |
| `no-fetch-in-effect` | 2 | Reemplazar `fetch` en effect por carga server-side o SWR (Vercel `client-swr-dedup`) | `HistorialList.tsx:219`, `NosotrosModal.tsx:138` |
| `exhaustive-deps` | 2 | Copiar `ref.current` a variable local dentro del effect para el cleanup | `ApunteRecursoView.tsx:265`, `NosotrosModal.tsx:100` |
| `no-cascading-set-state` | 1 | Consolidar los 4 `setState` del effect (derivar en render o un solo set) | `NosotrosModal.tsx:84` |
| `nextjs-no-client-side-redirect` | 1 | Mover redirect de `useEffect`+`router.replace` a server action / `redirect()` | `SubjectModal.tsx:67` |
| `no-pass-data-to-parent` | 1 | No devolver data al padre vía effect; pasarla en el callback del evento | `ApunteModal.tsx:117` |
| `prefer-useReducer` (los reales) | ~3-4 | Consolidar SOLO grupos de estado interdependientes (flujo form/fetch), respetando la regla del proyecto | `EventCalendarAdmin.tsx:88`, `EventModal.tsx:88`, `SubjectPageAdminOverlay.tsx:68`, `MapaCorrelativasMobile.tsx:51` |

**Checkpoint: re-correr react-doctor + `pnpm typecheck`.**

---

## Falsos positivos → supresión documentada en `doctor.config`

NO se tocan en código. Se apagan a nivel regla SOLO cuando una regla está dominada por FPs,
con comentario justificando. Verificar que apagarlas mueve el número (re-correr).

| Regla a `"off"` | # FP | Justificación (comentario en config) |
|-----------------|------|--------------------------------------|
| `jsx-no-jsx-as-prop` | 12 | Server Components no re-renderizan; la regla `rerender-*` aplica a client components. (Excepción real: `YearCalendarView.tsx:115` es cliente → si querés, arreglar ese uno y NO apagar la regla) |
| `iframe-missing-sandbox` | 1 | Embed cross-origin de YouTube: `allow-same-origin` lo exige el player; la SOP impide tocar el DOM. Ya documentado en `ApunteRecursoView.tsx:151-153` |
| `no-array-index-as-key` / `no-array-index-key` | 3 | `text.tsx`: lista derivada de `split()` de texto estático; el orden nunca cambia ni se filtra → index key es correcto |
| `server-sequential-independent-await` | 1 | `users/edit/[id]/page.tsx`: el `await requireGeneralAdmin()` previo es un **gate de autorización** intencional; paralelizar fetchearía datos para no-autorizados |
| `prefer-useReducer` (parcial) | 1 | `LoginForm.tsx`: `email`/`password` son inputs controlados independientes → la regla del proyecto prohíbe consolidarlos. (OJO: `loading`/`error`/`blockedSeconds` SÍ son consolidables — eso va en Lote 3, no se suprime) |

> Nota: `jsx-no-jsx-as-prop` no permite excluir un solo archivo por config (es por regla). Decisión: arreglar el único caso cliente (`YearCalendarView.tsx:115`) primero; si el resto sigue contando, apagar la regla con la justificación de arriba.

---

## Archivos críticos
- **Config nuevo**: `doctor.config.ts` (o `.json`) — supresiones documentadas.
- **Primitivos UI** (Lote 2, mayor impacto): `src/components/ui/Sheet.tsx`, `Modal.tsx`, `AlertDialog.tsx`, `NosotrosModal.tsx`.
- **Modales admin** (Lote 3): `src/components/admin/EventModal.tsx`, `SubjectModal.tsx`, `CommissionModal.tsx`, `ApunteModal.tsx`, `YearModal.tsx`.
- **Server Components** (Lote 1, combine-iterations): `src/app/page.tsx`, `src/app/mapa/page.tsx`, `src/app/[yearSlug]/page.tsx`.

## Reglas del proyecto a respetar
- `prefer-useReducer`: SOLO estado interdependiente; nunca inputs controlados sueltos (CLAUDE.md).
- Frontend user-friendly: nada de jerga técnica en UI.
- Botones: `cursor-pointer`.
- Commits: Conventional Commits, sin atribución a IA. Commit por lote/feature.

## Verificación end-to-end
1. **Por lote**: `npx react-doctor . --verbose` → confirmar que el score sube y bajan los hallazgos de ese lote. Parar cuando supere 95.
2. **Tras Lote 2 (modales)**: prueba manual de cada modal — foco al abrir, Tab atrapado, Esc, backdrop, scroll-lock, mobile.
3. **Antes de terminar (rápido)**: `pnpm typecheck` (identificadores duplicados, imports rotos por mover helpers).
4. **Antes de pushear a main (autoritativo)**: `pnpm build` (RSC, boundaries client/server).
5. **Score final**: `npx react-doctor .` debe dar **>95**.

## Riesgos
- **`<dialog>` nativo** reescribe focus-trapping de primitivos core → mayor riesgo; testing manual no negociable.
- Mover helpers (`only-export-components`) puede romper imports → `pnpm typecheck` lo agarra.
- `no-fetch-in-effect` y `nextjs-no-client-side-redirect` cambian el flujo de datos/navegación → verificar comportamiento, no solo que compile.
- Supresión: confirmar empíricamente que apagar la regla efectivamente re-puntúa; si no, el residuo de FPs limita el techo.
