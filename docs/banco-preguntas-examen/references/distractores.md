# Cómo construir distractores plausibles

El distractor (cada opción incorrecta) es el corazón del diseño de una pregunta de opción múltiple. La pregunta clave para auditar cada uno: **¿podría un estudiante que estudió a medias caer en este distractor?** Si la respuesta es no, es relleno y hay que rehacerlo.

---

## 6 patrones que funcionan

### Patrón 1: Variación tipográfica casi imperceptible

Cambiar 1–2 letras de un término técnico por otras parecidas. El estudiante que recuerda el término "más o menos" cae.

- **monolítico** vs **macrolítico** (sufijo cambiado)
- **kernel** vs **superkernel** (prefijo agregado)
- **mediación completa** vs **mediación imparcial**

Aplicación: identificá los términos técnicos centrales y construí variantes que cambien sufijos, prefijos o una letra interna. La variante debe sonar real para alguien que vio el tema una vez.

---

### Patrón 2: Cruce dentro del dominio (inversión, atribución, capas)

Tomar una relación del material —causal, temporal, jerárquica, o de autoría— e invertirla o cruzarla con un par del mismo dominio.

- Inversión: "SSL reemplazó a TLS" (es al revés). "TCP es no orientado a conexión y UDP es orientado a conexión" (al revés).
- Atribución cruzada: "Laravel fue creado por Rasmus Lerdorf" (Lerdorf creó PHP, no Laravel). "El IETF mantiene ECMAScript" (es ECMA International).
- Capa o categoría cambiada: "La capa física determina la mejor ruta" (es capa de red). "La capa de aplicación hace control de flujo" (es transporte).

Aplicación: cualquier mapeo `X → Y` del material (X creó Y, X contiene a Y, X usa Y, X está antes que Y) se puede cruzar con otro par para generar distractores. Especialmente eficaz en V/F.

---

### Patrón 3: Mezcla parcial — la mitad correcta, la mitad cambiada

Útil cuando la respuesta correcta es una lista de varios elementos. El distractor copia 2 de 3 elementos correctos y cambia uno por algo plausible.

Ejemplo (condiciones de Coffman para interbloqueo):
- Correcta: "Exclusión mutua, contención y espera, no apropiativa, espera circular"
- Distractor: "Exclusión mutua, contención y espera, no apropiativa, **espera triangular**"
- Otro: "**Búsqueda mutua**, contención y espera, no apropiativa, espera circular"

Aplicación: en preguntas con respuesta-lista, fabricá distractores cambiando un solo elemento por un término plausible del mismo campo semántico. Combinado con el Patrón 1 da el clásico "combinación cruzada" que usan mucho los exámenes universitarios.

---

### Patrón 4: Generalización indebida

Tomar una afirmación verdadera y agregarle un cuantificador absoluto que la vuelve falsa.

- "Un IDE **siempre** se instala localmente con GUI" (existen IDEs web).
- "La fibra óptica **nunca** necesita repetidores" (los necesita en largas distancias).
- "TCP garantiza **siempre** el orden de los paquetes" (no garantiza entrega si la conexión falla).

Aplicación: buscá afirmaciones del material que tengan excepciones o matices, y construí distractores que las extremen. Funciona muy bien en V/F.

---

### Patrón 5: Plausible pero técnicamente falso

Una opción que un estudiante con sentido común podría aceptar, pero que técnicamente está mal.

Pregunta: ventajas del láser sobre LED en fibra óptica.
- Distractor: "Es más barato y duradero" (suena razonable; el láser justamente es más caro).
- Distractor: "Funciona mejor en frío extremo" (no hay razón técnica; afirmación que suena posible pero es inventada).

Aplicación: pensá qué creería por intuición un estudiante que no estudió. Esa intuición incorrecta es un distractor de oro.

---

### Patrón 6: Datos numéricos cercanos pero incorrectos

Para preguntas con números (años, tamaños, cantidades), usar valores cercanos al correcto.

- "Laravel fue creado en **2009**" (correcto: 2011).
- "RAID 5 necesita **2 discos mínimo**" (correcto: 3).
- "La caché L1d es **64 KiB** por núcleo" (correcto: 32 KiB, si la pregunta requiere dividir el total entre núcleos).

Aplicación: si el material tiene un dato numérico, generá 2–3 valores cercanos. Especialmente útil cuando la pregunta requiere cálculo.

---

## Errores frecuentes al armar distractores

- **Opciones absurdas** ("TCP es un postre típico italiano"): no evalúan nada.
- **"Ninguna/Todas las anteriores" como relleno**: solo usar si es genuinamente la correcta o un distractor lógico, no para tapar un agujero.
- **La correcta es siempre la más larga y detallada**: el estudiante aprende a marcar la más larga. Mantené longitudes similares.
- **Opciones que se contradicen entre sí**: si dos opciones dicen exactamente lo contrario, una de las dos es necesariamente la correcta y el estudiante avispado lo nota.
- **Distractor que repite la correcta reformulada**: si parafraseás la correcta, técnicamente hay dos respuestas válidas.
