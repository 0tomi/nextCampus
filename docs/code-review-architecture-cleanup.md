# Hallazgos del code review — rama `refactor/architecture-cleanup`

> Review multi-ángulo (8 finders) sobre `git diff main...HEAD` (73 archivos), corrido como
> cierre de la Fase 8 del plan `docs/plans/improve-codebase.md`. Los hallazgos ya fueron
> verificados contra el código y contra `main`. Este documento existe para que otro agente
> los retome. Al terminar cada fix: `pnpm typecheck && pnpm test`, y commit Conventional
> Commits sin atribución a IA. Antes de mergear a main: `pnpm build`.

## Prioridad 1 — Corregir (hardening de auth)

### 1. Validación Zod corre antes del check de auth en 5 server actions

**Qué pasó:** la Fase 2 quitó el `await requireAuth()` inicial asumiendo que el
`requireYearAdminFor*` siguiente cubría el check. En estos 5 sitios NO es inmediato:
hay parsing de input del atacante en el medio. En `main`, una request no autenticada
siempre redirigía a login antes de tocar el input; ahora, con input inválido, la action
procesa y responde sin que corra ningún check de auth.

| Sitio | Problema |
|---|---|
| `src/app/admin/actions/apuntes.ts:321` (`createApunteAction`) | `safeParse` de `subjectId` y early-return pre-auth |
| `src/app/admin/actions/apuntes.ts:465` (`updateApunteAction`) | ídem con `apunteId` |
| `src/app/admin/actions/apuntes.ts:618` (`deleteApunteAction`) | `z.string().min(1).parse()` **lanza ZodError crudo** pre-auth |
| `src/app/admin/actions/quiz.ts:34` (`uploadQuizBankAction`) | `uploadBankSchema.safeParse` (incluye el JSON completo subido) pre-auth |
| `src/app/admin/actions/quiz.ts:96` (`deleteQuizBankAction`) | parse que lanza, pre-auth |

**Impacto real:** no hay lectura/escritura sin auth (todo acceso a DB sigue detrás del
scope guard). Es defensa en profundidad: (a) un anónimo puede hacer parsear su payload
(en `uploadQuizBankAction`, el JSON entero) sin sesión; (b) en las dos actions de delete
un anónimo puede provocar una excepción no manejada.

**Fix:** restaurar una línea `await requireAnyAdmin()` como primera sentencia de esas 5
actions (es el mismo check que el scope guard hace después — el resolver lo cachea via
`React.cache`/`getAdminUser`, así que no duplica query). NO revertir los otros sitios de
la Fase 2 donde el `requireYearAdminFor*` sí es la primera sentencia: esos están bien.

**Verificación:** los tests de `src/app/admin/actions.test.ts` deben seguir en verde;
agregar un caso "sin sesión + input inválido → rechaza por auth, no por validación" si
el patrón de mocking lo permite barato.

## Prioridad 2 — Consistencia contra el objetivo del plan (media-migración)

### 2. `updateSubjectAction` / `deleteSubjectAction` no usan `revalidateSubjectContent`

`src/app/admin/actions/subjects.ts:254-262` y `380-387` componen tags/paths a mano
(idéntico a `main`, no es regresión), mientras `createSubjectAction`/`createCommissionAction`
del mismo archivo ya usan el helper de `shared.ts`. Además la versión manual **no** hace el
loop de `revalidatePath` por comisión que el helper sí hace: renombrar el slug de una materia
deja potencialmente stale las páginas `/{year}/{subject}/{commission}`. Rutear ambas por
`revalidateSubjectContent` (+ los tags extra que hoy agregan: `career`, `quizBanks`, `/`).

### 3. Actions de `subjects.ts` y `years.ts` sin `try/catch` + `actionError`

Todo error runtime inesperado (constraint de Prisma, timeout) sale como excepción cruda al
`useActionState` del form, en vez del shape `{ ok:false, message }` amigable que todas las
demás actions devuelven vía `actionError` (Fase 2). Pre-existente en `main`, pero contradice
el objetivo "error shape único". Envolver el cuerpo de cada action pública de esos 2 archivos
igual que en `eventos.ts`/`periodos.ts`.

## Prioridad 3 — Cleanups menores (deduplicación en código nuevo)

4. **`EventModal.tsx:148-175`** — `ADD_APUNTE` y `ADD_APUNTE_IF_NEW` hacen el mismo append;
   la variante con dedup es superset segura. Dejar solo `ADD_APUNTE` con el guard de dedup
   y borrar la otra (2 call sites: líneas ~351 y ~378).
5. **Ícono de GitHub duplicado** — `src/components/apuntes/apunte-recurso/GithubIcon.tsx` y
   la función local `Github` en `src/components/admin/apunte/ResourceInputControl.tsx:7-23`
   son el mismo SVG. Compartir uno solo (ej: mover `GithubIcon` a `src/components/ui/` o
   importar el existente desde ambos árboles).
6. **Tarjeta de fallback duplicada** — `DriveFallback` (`DriveEmbed.tsx:123-161`) y
   `GithubResourcePreview.tsx` son casi copias (badge + título + descripción + CTA con
   className byte-idéntico). Extraer una `UnavailablePreviewCard` compartida en
   `apunte-recurso/`.
7. **`cn()` vs `join(' ')`** — `ResourceKindSelector.tsx`, `ResourceInfoPanel.tsx` y
   `HtmlResource.tsx` arman clases condicionales con array-join en vez del util `cn()`
   que las primitivas nuevas de `src/components/ui/` ya usan. Unificar en `cn()`.
8. **Inputs que bypassean la primitiva `Input`** — `ResourceNameField.tsx:23` y
   `ResourceInputControl.tsx:74` copian a mano el className base de `src/components/ui/input.tsx`
   (difieren solo en `py-1.5` vs `py-2`). Usar `<Input className="py-1.5" />` (verificar
   pixel-igual: twMerge debe resolver el override de padding).

## Notas (no accionar sin decisión del usuario)

- Los labels crudos de los sub-forms de links (`SubjectModal.tsx:225,243`,
  `YearModal.tsx:187,203`) tienen un estilo deliberadamente distinto al de la primitiva
  `Label` (sin uppercase). Preservados pixel-igual de `main`; migrarlos cambiaría visual
  salvo override explícito.
- `mapPasswordUpdateError` (`perfil/actions.ts:34`) matchea substrings de mensajes de
  Supabase Auth (frágil ante updates de la lib) y no tiene test del camino de error.
  Pre-existente; considerar test + fallback documentado.
- `toSubjectEvents`/`toMobileEvents` (`event-adapters.ts`) comparten ~10 campos con 1 de
  diferencia cada uno; un base-mapper compartido evitaría drift desktop/mobile. Bajo valor,
  bajo riesgo.
- **Ya corregido en la rama:** aria-labels de botones icon-only (`5ed0b63`) y comentario
  guard del barrel `'use server'` (`15649d9`).

## Riesgo residual del plan (fuera del review)

- Smoke manual de CRUD admin (modales) pendiente **del usuario**: requiere login admin y
  escribe contra la DB de producción (dev ES prod), por eso no se automatizó.
