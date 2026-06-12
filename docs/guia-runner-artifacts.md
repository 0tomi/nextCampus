# Guía técnica: un runner de "artifacts" para tu campus

Cómo funciona el sistema de artifacts de Claude.ai a nivel arquitectura, y cómo replicarlo en una web propia para renderizar apuntes TSX interactivos. Nota honesta: el código interno de Anthropic no es público; lo que sigue es la arquitectura observable desde afuera (comportamiento, restricciones, mensajes de error) más las técnicas estándar con las que se construye este tipo de sistema. Es suficiente para clonar la experiencia completa.

## 1. La arquitectura en una frase

Un artifact es **código fuente que viaja como texto, se transpila en el navegador y se monta dentro de un iframe sandboxeado**, con un conjunto de librerías pre-resueltas y un canal `postMessage` hacia el host para todo lo que el sandbox no puede hacer solo (persistencia, reporte de errores).

```
┌─ Tu campus (host) ──────────────────────────────┐
│  guarda el .tsx          ┌─ iframe sandbox ───┐ │
│  lo manda como string ──→│ transpila (Babel)  │ │
│  escucha postMessage ←───│ resuelve imports   │ │
│  persiste storage        │ monta con ReactDOM │ │
└──────────────────────────└────────────────────┘─┘
```

Las cuatro piezas: (1) el sandbox de seguridad, (2) el pipeline de transpilación, (3) la resolución de dependencias, (4) el puente host↔sandbox. Van en ese orden porque la seguridad condiciona todo lo demás.

## 2. El sandbox (la pieza que no podés saltear)

Tus apuntes son código arbitrario escrito por una IA (y eventualmente editado por estudiantes). Tiene que correr **en un origen distinto al del campus**, para que un apunte malicioso o roto no pueda leer cookies de sesión, tokens ni hacer requests autenticadas en nombre del usuario.

Dos formas de lograrlo:

**Opción simple — iframe con `srcdoc` y sandbox sin same-origin:**

```html
<iframe
  sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
  allow="clipboard-write"
  srcdoc="...html del runner..."
></iframe>
```

La clave es **NO incluir `allow-same-origin`**: así el contenido corre en un "origen opaco" sin acceso a cookies, localStorage del campus ni al DOM padre. Es exactamente por esto que en los artifacts de Claude `localStorage` está prohibido — en origen opaco directamente tira excepción.

**Opción robusta — dominio aparte para el runner:** servís el HTML del runner desde `apuntes-sandbox.tudominio.com` (otro dominio u otro subdominio sin cookies compartidas) y el iframe apunta ahí. Es lo que hacen CodeSandbox, StackBlitz y compañía. Ventaja: podés mandar headers CSP reales desde el servidor y usar Service Workers si algún día querés cachear. Para un campus open-source, arrancá con `srcdoc` y migrá a dominio aparte cuando puedas.

**CSP dentro del runner.** Acá nace tu allowlist de 3 CDNs — no es una convención, es una política que el navegador hace cumplir:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com;
  style-src 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com;
  font-src https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com data:;
  img-src * data: blob:;
  connect-src 'none';
">
```

Notas: `'unsafe-eval'` es necesario si transpilás con Babel en el navegador (usa `new Function`). `connect-src 'none'` bloquea fetch/XHR — decisión tuya; los artifacts de Claude sí permiten `api.anthropic.com` para apps con IA. Cualquier `<script src>` fuera de la lista falla con error de CSP en consola: ese es el mensaje "dominio bloqueado" que ven tus apuntes hoy.

## 3. El pipeline de transpilación

El TSX llega como string. En el navegador no existe TypeScript ni JSX, así que hay que transpilar. Dos candidatos:

**Babel standalone** (`@babel/standalone` por CDN, ~2.5 MB): el clásico, presets `react` + `typescript`, soporta todo. **Sucrase** (~200 KB): mucho más rápido y liviano, hace solo el strip de tipos y la transformación JSX, que es exactamente lo que necesitás. Recomendación: Sucrase.

```js
// dentro del runner, con Sucrase cargado por CDN
const { code } = window.sucrase.transform(tsxSource, {
  transforms: ['typescript', 'jsx'],
  jsxRuntime: 'classic',   // genera React.createElement(...)
  production: true,
});
```

Con `jsxRuntime: 'classic'` el output solo necesita un `React` en scope — no hace falta resolver `react/jsx-runtime`, lo que simplifica el paso siguiente.

## 4. Resolución de imports (acá está la magia de los artifacts)

El código transpilado todavía tiene `import React from 'react'` e `import { LineChart } from 'recharts'`. Hay que convertir esos nombres en módulos reales. Así es como los artifacts logran que recharts, lucide, d3, etc. "simplemente funcionen": el host trae esas librerías **pre-bundleadas contra una única instancia de React**, y un paso de resolución conecta cada import con el bundle. Dos estrategias para replicarlo:

### Estrategia A — Registro de módulos (la más parecida a artifacts)

Tu runner carga React, ReactDOM y las librerías que decidas soportar (por CDN UMD o un bundle propio), las registra en un mapa, y un mini-transform reescribe los imports a lecturas de ese mapa:

```js
const MODULES = {
  'react': window.React,
  'react-dom/client': window.ReactDOM,
  'recharts': window.Recharts,   // build UMD compilado contra ESE React
  'lodash': window._,
  'd3': window.d3,
};
```

Reescribir imports es un transform sintáctico simple (regex cuidadosa o plugin de Babel): `import X, { a, b } from 'lib'` → `const X = __require('lib'); const { a, b } = X;`. Después envolvés el código en `new Function('__require', 'React', codigo + '; return exports.default')` y lo ejecutás. Importante: las libs del ecosistema React (recharts, framer-motion) **deben** ser builds UMD que tomen React de `window.React` — por eso un UMD cualquiera de recharts anda acá pero no como `<script>` suelto en tu esquema actual, donde no hay React global compartido.

### Estrategia B — Import maps + ESM nativo (la moderna, menos código tuyo)

Los navegadores actuales resuelven imports bare con un import map. jsdelivr expone builds ESM en `esm.run`, que vive bajo `cdn.jsdelivr.net` — o sea, **ya está dentro de tu allowlist**:

```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.run/react@18",
    "react-dom/client": "https://esm.run/react-dom@18/client",
    "recharts": "https://esm.run/recharts@2?deps=react@18",
    "d3": "https://esm.run/d3@7",
    "lucide-react": "https://esm.run/lucide-react?deps=react@18"
  }
}
</script>
```

Transpilás con Sucrase **sin tocar los imports**, creás un `Blob` de tipo `text/javascript`, y hacés `import(URL.createObjectURL(blob))`. El navegador resuelve todo solo. El detalle crítico es `?deps=react@18` en cada lib React: garantiza que todas compartan la misma instancia (dos Reacts = el clásico error de hooks inválidos). Es menos código que la Estrategia A; el costo es depender de que esm.run sirva bien cada lib y un primer load algo más lento (sin bundle, muchas requests).

Mi recomendación para tu campus: **B para arrancar** (lo tenés andando en una tarde), y si después querés cargas instantáneas y control total, migrás las 5–6 libs más usadas a un bundle propio estilo A.

## 5. Tailwind y estilos

Los artifacts no corren el compilador de Tailwind: sirven un **stylesheet precompilado** con las utilidades core, por eso clases dinámicas raras no funcionan ahí. Para tu campus:

- **Camino fácil:** `@tailwindcss/browser` v4 por CDN (`https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4`) dentro del runner — compila en runtime, soporta todo, pesa un poco más.
- **Camino artifacts:** generás una vez un CSS con safelist amplia de utilidades (`npx tailwindcss` con un safelist generoso) y lo servís estático desde el runner. Más rápido en runtime, pero clases fuera del safelist no existen.

Sumale al runner los `<link>` que hoy cada apunte repite: KaTeX CSS, tus fuentes. Menos boilerplate por apunte generado.

## 6. El puente postMessage (persistencia y errores)

Como el sandbox no tiene storage ni red, todo lo "con estado" pasa por mensajes al host. Es como los artifacts implementan su `window.storage`. Protocolo mínimo:

```js
// --- en el runner (sandbox) ---
let seq = 0; const pending = {};
window.storage = {
  get: (k) => rpc('storage:get', { k }),
  set: (k, v) => rpc('storage:set', { k, v }),
};
function rpc(type, payload) {
  return new Promise((res) => {
    const id = ++seq; pending[id] = res;
    parent.postMessage({ id, type, payload }, '*');
  });
}
window.addEventListener('message', (e) => {
  if (e.data?.id && pending[e.data.id]) { pending[e.data.id](e.data.result); delete pending[e.data.id]; }
});

// --- en el campus (host) ---
iframe.addEventListener('load', () => { /* ... */ });
window.addEventListener('message', async (e) => {
  if (e.source !== iframe.contentWindow) return;   // ¡validar SIEMPRE la fuente!
  const { id, type, payload } = e.data;
  const result = await manejarRPC(type, payload);  // guarda en tu backend, namespaced por apunte+usuario
  iframe.contentWindow.postMessage({ id, result }, '*');
});
```

El `'*'` como targetOrigin es inevitable con `srcdoc` (origen opaco); la validación de `e.source` del lado del host es lo que te protege. Por el mismo canal mandá errores: un `window.onerror` + un ErrorBoundary de React en el runner que reportan al host, para que el campus muestre "este apunte falló en la línea X" en vez de un iframe blanco.

## 7. El runner completo, esqueleto

```html
<!DOCTYPE html><html><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- CSP de la sección 2 -->
  <!-- import map de la sección 4B -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/sucrase@3/dist/sucrase.min.js"></script>
</head><body>
  <div id="root"></div>
  <script type="module">
    // 1. puente storage + captura de errores (sección 6)
    // 2. recibir el TSX: por postMessage inicial desde el host
    window.addEventListener('message', async (e) => {
      if (e.data?.type !== 'render') return;
      try {
        const { code } = sucrase.transform(e.data.tsx, { transforms: ['typescript','jsx'], jsxRuntime: 'classic' });
        const prelude = "import React from 'react';\n";
        const blob = new Blob([prelude + code], { type: 'text/javascript' });
        const mod = await import(URL.createObjectURL(blob));
        const { createRoot } = await import('react-dom/client');
        createRoot(document.getElementById('root')).render(React.createElement(mod.default));
      } catch (err) {
        parent.postMessage({ type: 'render-error', message: String(err) }, '*');
      }
    });
    parent.postMessage({ type: 'ready' }, '*');
  </script>
</body></html>
```

Flujo: el host crea el iframe → espera `ready` → manda `{type:'render', tsx}` → el runner transpila, importa y monta → errores y storage viajan de vuelta. Para "editar y ver en vivo", el host simplemente re-manda `render` (o recrea el iframe, que es más limpio para resetear estado).

## 8. Checklist de paridad con artifacts

Con todo lo anterior cubrís: imports directos de librerías React-friendly, Tailwind por className, una sola instancia de React, persistencia tipo `window.storage`, errores visibles, y sandbox que protege la sesión del campus. Diferencias que quedan a tu favor: 3 CDNs en vez de 1, allowlist de libs que decidís vos, y todo open-source. Lo que los artifacts tienen y vos quizá no quieras: acceso a una API de IA desde adentro del artifact (podrías exponerlo después por el mismo puente postMessage, con rate limit del lado del host).

Último consejo de mantenimiento: cuando esto funcione, el contrato técnico del prompt/skill cambia — los apuntes pasan de "script-injection UMD" a "imports permitidos: [tu lista]". Eso achica cada TSX generado y reduce las fallas de carga, así que actualizá la skill `apunte-interactivo` en el mismo PR.
