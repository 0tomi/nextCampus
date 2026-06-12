# Plan 004: Endurecer el rate limit de login admin — fail-closed en producción

> **Instrucciones para el ejecutor**: Seguí este plan paso a paso. Corré cada
> comando de verificación y confirmá el resultado esperado antes de pasar al
> siguiente paso. Si ocurre algo de la sección "Condiciones de STOP", frená y
> reportá — no improvises. Al terminar, actualizá la fila de este plan en
> `plans/improve-plans/README.md`.
>
> **Chequeo de drift (correr primero)**: `git diff --stat 473caa9..HEAD -- src/lib/admin-login-rate-limit.ts src/lib/ratelimit.ts src/proxy.ts src/app/api/admin/login/route.ts src/lib/admin-login-rate-limit.test.ts`
> Si alguno cambió, compará los extractos de "Estado actual" contra el código
> vivo; si no coinciden, tratalo como condición de STOP.

## Status

- **Prioridad**: P1
- **Esfuerzo**: S
- **Riesgo**: MED (un error acá puede dejar el login admin bloqueado en producción — por eso los tests son obligatorios)
- **Depende de**: 001 (recomendado)
- **Categoría**: security
- **Planificado en**: commit `473caa9`, 2026-06-11

## Por qué importa

Todo el rate limiting del repo (login admin, `/api`, `/admin`) depende de que
las variables de Upstash Redis estén configuradas. Si faltan — por un deploy a
otro entorno, una rotación de credenciales mal hecha, o un typo en Vercel —
**todo falla abierto en silencio**: el login admin acepta intentos ilimitados
de fuerza bruta y nadie se entera, porque no se loguea nada. Las credenciales
admin son la única puerta al panel. La política correcta: el login admin falla
**cerrado** en producción sin Redis; el rate limit general de API falla
abierto pero **avisando fuerte** (cerrarlo tiraría abajo todo el sitio
público, que es peor que el riesgo que mitiga).

## Estado actual

- El fail-open silencioso del login:

```ts
// src/lib/admin-login-rate-limit.ts:51-58
function enabledStatus(): AdminLoginAttemptStatus {
  return {
    allowed: true,
    remaining: ADMIN_LOGIN_MAX_ATTEMPTS,
    retryAfterSeconds: 0,
    rateLimitEnabled: false,
  }
}
```

  Se devuelve cuando `store` es `null` en tres lugares: `readBlockedStatus`
  (línea 64), `getAdminLoginAttemptStatusWithStore` (línea 111) y
  `registerAdminLoginFailureWithStore` (línea 132). `store` es `null` cuando
  faltan las env vars de Upstash:

```ts
// src/lib/ratelimit.ts:6-14
const enabled =
  Boolean(env.UPSTASH_REDIS_REST_URL) && Boolean(env.UPSTASH_REDIS_REST_TOKEN)

const redis = enabled
  ? new Redis({ url: env.UPSTASH_REDIS_REST_URL!, token: env.UPSTASH_REDIS_REST_TOKEN! })
  : null
```

- El consumidor del lado del login es `src/app/api/admin/login/route.ts`:
  llama `getAdminLoginAttemptStatus(email, ip)` antes de autenticar (línea 44)
  y `registerAdminLoginFailure(email, ip)` ante credenciales inválidas
  (línea 81). Cuando `allowed === false` responde 429 con
  `buildRateLimitMessage(retryAfterSeconds)`.
- El rate limit general también falla abierto en silencio:

```ts
// src/proxy.ts:31-32 (extracto)
const limiter = isLoginPath ? loginRatelimit : apiRatelimit
if (limiter) { ... }   // si limiter es null, no hay límite y no se loguea nada
```

- Patrón de test existente: `src/lib/admin-login-rate-limit.test.ts` testea
  las funciones `*WithStore` pasando un store fake — las funciones ya están
  diseñadas para inyección del store, lo que hace este cambio muy testeable.
- Diseño intencional a preservar: en desarrollo local sin Upstash el login
  debe seguir funcionando sin límite (no todo dev configura Redis).

## Comandos que vas a necesitar

| Propósito | Comando | Esperado en éxito |
|-----------|---------|-------------------|
| Tests del módulo | `pnpm test src/lib/admin-login-rate-limit.test.ts` | todos pasan, incluidos los nuevos |
| Suite completa | `pnpm test` | todos pasan |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |

## Toolkit sugerido para el ejecutor

- Skill `next-best-practices` (`.agents/skills/next-best-practices/SKILL.md`):
  route handlers son endpoints públicos — validación y authz adentro.
- Regla del repo (AGENTS.md): los mensajes que ve el usuario en el frontend
  deben ser user-friendly, sin detalles de infraestructura. NO mencionar
  "Redis" ni "rate limit" en el mensaje del 503/429.

## Alcance

**En alcance**:
- `src/lib/admin-login-rate-limit.ts` — la lógica fail-closed.
- `src/lib/admin-login-rate-limit.test.ts` — tests nuevos.
- `src/proxy.ts` — solo agregar el warn cuando el limiter está deshabilitado.

**Fuera de alcance** (NO tocar):
- `src/app/api/admin/login/route.ts` — ya maneja `allowed === false` con 429;
  no necesita cambios.
- `src/lib/ratelimit.ts` — la construcción condicional de los limiters queda
  igual (es el comportamiento correcto para dev).
- `src/lib/env.ts` — NO volver obligatorias las vars de Upstash: rompería
  `pnpm build` local y el CI del plan 001.
- Manejo de outage de Upstash en runtime (vars presentes, servicio caído) —
  diferido, ver Notas de mantenimiento.

## Workflow de git

- Branch: `security/login-rate-limit-fail-closed`
- Conventional Commits sin atribución a IA. Sugerido:
  `fix(security): cerrar el login admin en producción si el rate limit no está configurado`
- NO pushear ni abrir PR salvo indicación del operador.

## Pasos

### Paso 1: Hacer testeable la decisión producción/dev

En `src/lib/admin-login-rate-limit.ts`, reemplazar `enabledStatus()` por una
función que reciba el modo como parámetro con default leído del entorno:

```ts
const IS_PRODUCTION_DEFAULT = process.env.NODE_ENV === 'production'

// Sin store configurado: en producción el login falla CERRADO (un atacante
// no puede aprovechar una mala configuración); en dev queda abierto para no
// exigir Redis local.
function disabledStoreStatus(isProduction: boolean): AdminLoginAttemptStatus {
  if (isProduction) {
    console.error(
      '[admin-login] Rate limit sin configurar en producción: bloqueando login. Configurar UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.',
    )
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: ADMIN_LOGIN_BLOCK_SECONDS,
      rateLimitEnabled: false,
    }
  }
  console.warn('[admin-login] Rate limit deshabilitado (sin Redis). Solo aceptable en desarrollo.')
  return {
    allowed: true,
    remaining: ADMIN_LOGIN_MAX_ATTEMPTS,
    retryAfterSeconds: 0,
    rateLimitEnabled: false,
  }
}
```

Propagar un parámetro opcional `isProduction = IS_PRODUCTION_DEFAULT` por las
funciones `*WithStore` (son la costura de testeo existente) y usarlo en los
tres puntos donde hoy se devuelve `enabledStatus()` (líneas 64, 111 y 132 en
`473caa9`). Las wrappers públicas (`getAdminLoginAttemptStatus`,
`registerAdminLoginFailure`) no cambian de firma.

**Verificar**: `pnpm typecheck` → exit 0.

### Paso 2: Warn en el proxy cuando el limiter general está apagado

En `src/proxy.ts`, dentro del bloque `if (shouldRateLimit)` (línea 28),
agregar la rama else del `if (limiter)`:

```ts
if (limiter) {
  // ... código existente sin cambios
} else if (process.env.NODE_ENV === 'production') {
  console.warn('[ratelimit] Sin Redis configurado: /api y /admin quedan sin rate limit.')
}
```

NO bloquear tráfico acá: cerrar `/api` sin Redis tiraría abajo el sitio
público entero. El warn aparece en los logs de Vercel y es accionable.

**Verificar**: `pnpm typecheck && pnpm lint` → exit 0.

### Paso 3: Tests

En `src/lib/admin-login-rate-limit.test.ts`, siguiendo el patrón existente del
archivo (tests sobre las funciones `*WithStore` con store fake/null), agregar:

1. `getAdminLoginAttemptStatusWithStore(null, email, ip, /* isProduction */ true)`
   → `allowed: false` y `retryAfterSeconds === ADMIN_LOGIN_BLOCK_SECONDS`.
2. `getAdminLoginAttemptStatusWithStore(null, email, ip, false)`
   → `allowed: true`, `rateLimitEnabled: false` (comportamiento dev intacto).
3. `registerAdminLoginFailureWithStore(null, email, ip, true)` → `allowed: false`.
4. `registerAdminLoginFailureWithStore(null, email, ip, false)` → `allowed: true`.
5. Con store fake presente y `isProduction: true` → el flujo normal de
   conteo/bloqueo NO cambia (regresión: producción CON Redis sigue igual).

**Verificar**: `pnpm test src/lib/admin-login-rate-limit.test.ts` → todos
pasan, incluidos los 5 nuevos.

### Paso 4: Regresión completa

```bash
pnpm typecheck && pnpm lint && pnpm test
```

**Verificar**: exit 0 en todo.

## Plan de tests

Los del paso 3, en `src/lib/admin-login-rate-limit.test.ts`, modelados sobre
los tests existentes de ese mismo archivo (store inyectado, sin mocks de
red). Cobertura: fail-closed en producción sin store, fail-open en dev sin
store, comportamiento idéntico con store presente.

## Criterios de done

- [ ] Sin store y `isProduction=true` → login bloqueado (testeado)
- [ ] Sin store y `isProduction=false` → comportamiento actual (testeado)
- [ ] Con store → cero cambios de comportamiento (testeado)
- [ ] `src/proxy.ts` loguea warn en producción sin Redis, sin bloquear
- [ ] `pnpm typecheck && pnpm lint && pnpm test` → exit 0
- [ ] Ningún mensaje visible al usuario menciona Redis/rate limit/infra
- [ ] `git status`: solo los 3 archivos en alcance
- [ ] Fila actualizada en `plans/improve-plans/README.md`

## Condiciones de STOP

- El test existente del archivo usa una estructura incompatible con agregar el
  parámetro `isProduction` sin romper llamadas — reportá el conflicto en vez
  de refactorizar el módulo entero.
- Descubrís que producción real HOY no tiene las vars de Upstash configuradas
  (preguntale al operador antes de mergear: si es así, mergear esto bloquearía
  el login admin de producción hasta configurarlas — el operador decide el
  orden).
- El cambio parece requerir tocar `src/app/api/admin/login/route.ts` — no
  debería; si pasa, reportá.

## Notas de mantenimiento

- **Diferido a propósito**: si Upstash está configurado pero el servicio está
  caído, `limiter.limit()` / las llamadas al store van a tirar excepción en
  runtime (hoy no hay try/catch en `proxy.ts:33`). Decidir esa política
  (fail-open con catch + warn es lo razonable para `/api`) es un cambio
  aparte.
- Si algún día se agrega un entorno de staging sin Redis, el login admin de
  staging va a quedar bloqueado por diseño — configurar Upstash ahí o setear
  la decisión por una env var explícita en ese momento.
- Revisor: verificar que el caso 5 (producción CON Redis) está testeado — es
  el camino que protege contra un lockout accidental.
