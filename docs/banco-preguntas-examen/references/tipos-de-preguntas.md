# Catálogo de tipos de preguntas

Los 6 tipos principales para armar un banco completo. Cada tipo tiene su nicho: usá el que mejor calce con el contenido, no el más fácil de redactar. Regla práctica: un banco de 15 preguntas debería tener al menos 3 tipos distintos.

---

## 1. Opción única

Una pregunta con 4–6 opciones donde solo una es correcta.

**Cuándo usarla:**
- Definiciones precisas con una única formulación correcta.
- Identificación de un concepto, comando o herramienta entre términos parecidos.
- Comparaciones donde solo una alternativa cumple la condición.
- Preguntas sobre código o salida de comandos (con bloque en `Referencia visual`).

**Variante "más completa":** útil cuando varias opciones son parcialmente correctas pero solo una abarca todo lo que pide el enunciado. Usar con cuidado, puede ser ambigua.

**Ejemplo (con distractores terminológicamente cercanos — Patrón 1 de `distractores.md`):**

```markdown
## Pregunta 1

**Tipo:** Opción única

**Enunciado:** Si nos referimos a la estructura de un sistema operativo, podríamos hablar de:

**Opciones:**

- a. Sistemas macrolíticos, Sistemas de capas y Microkernels
- b. Sistemas monolíticos, Sistemas de capas y Microkernels
- c. Sistemas monolíticos, Sistemas macrolíticos y Microkernels
- d. Sistemas monolíticos, Sistemas de capas y Superkernels

**Respuesta correcta:** b

**Explicación:** Las tres arquitecturas canónicas son monolíticos (todo en kernel), de capas (jerarquía estricta) y microkernels (kernel mínimo + servicios en espacio de usuario). "Macrolíticos" y "Superkernels" no son términos de la literatura: son distractores construidos para que el estudiante que recuerda los nombres parcialmente se confunda.
```

---

## 2. Selección múltiple

Varias opciones, N de ellas correctas. **Siempre indicar la cantidad exacta** ("Elija 3", "Seleccione 2 opciones"). Sin esa información, la pregunta es ambigua.

**Cuándo usarla:**
- Características o propiedades múltiples de un concepto.
- Ítems que pertenecen a una categoría (ej: "qué protocolos son de capa de aplicación").
- Enumeraciones cerradas del material.

**Ejemplo:**

```markdown
## Pregunta 2

**Tipo:** Selección múltiple

**Enunciado:** ¿Cuáles son los tres tipos de tramas LCP que se usan con PPP? (Elija tres.)

**Opciones:**

- a. Tramas de acuse de recibo de enlace
- b. Tramas de establecimiento de enlace
- c. Tramas de negociación de enlace
- d. Tramas de mantenimiento de enlace
- e. Tramas de terminación de enlace
- f. Tramas de control de enlace

**Respuesta correcta:** b, d, e

**Explicación:** PPP usa tres categorías de tramas LCP: establecimiento (negociar parámetros al inicio), mantenimiento (gestionar y depurar el enlace activo) y terminación (cerrar la conexión). "Acuse de recibo", "negociación" y "control" suenan plausibles pero no son las categorías formales.
```

---

## 3. Verdadero/Falso

Una afirmación, dos opciones. La afirmación debe ser **inequívocamente verdadera o falsa**, y cuando es falsa, el error tiene que ser real y enseñable.

**Cuándo usarla:**
- Mitos comunes o errores típicos de los estudiantes.
- Definiciones donde un detalle (un número, una atribución, una dirección) cambia todo.
- Relaciones causales o temporales que se puedan invertir.

**Cuándo evitarla:**
- Afirmaciones obvias en cualquier dirección.
- Afirmaciones interpretables (si depende del contexto, no es V/F).

Para construir afirmaciones falsas eficaces, ver los patrones de `distractores.md` (especialmente Patrón 2 — Cruce dentro del dominio, y Patrón 4 — Generalización indebida).

**Ejemplo:**

```markdown
## Pregunta 3

**Tipo:** Verdadero/Falso

**Enunciado:** SSL es un protocolo de seguridad que reemplazó a TLS, por lo que SSL sería la versión más nueva y segura, y se utiliza para cifrar la comunicación en el protocolo HTTPS.

**Opciones:**

- Verdadero
- Falso

**Respuesta correcta:** Falso

**Explicación:** La relación está invertida. TLS es el sucesor de SSL, no al revés. TLS 1.2 y TLS 1.3 son los estándares actuales; las versiones de SSL están deprecadas por vulnerabilidades. La confusión es común porque "SSL" se sigue usando coloquialmente, pero técnicamente lo que se usa hoy es TLS.
```

---

## 4. Relacionar

Dos columnas: ítems a relacionar y conceptos disponibles. El estudiante asocia cada ítem con su concepto.

**Cuándo usarla:**
- Términos con sus definiciones.
- Comandos con sus acciones.
- Categorías conceptuales con ejemplos.

**Ejemplo:**

```markdown
## Pregunta 4

**Tipo:** Relacionar

**Enunciado:** Relacionar los conceptos del Triángulo CIA (Confidencialidad, Integridad, Disponibilidad) con el tipo de ataque que los compromete principalmente.

**Conceptos disponibles:**

- Confidencialidad
- Integridad
- Disponibilidad

**Ítems a relacionar:**

- DoS o DDoS
- Defacement
- Robo de credenciales

**Respuesta correcta:**

- DoS o DDoS → Disponibilidad
- Defacement → Integridad
- Robo de credenciales → Confidencialidad

**Explicación:** Un DoS/DDoS satura recursos para que el servicio no esté disponible. Un defacement (alteración visual de un sitio) compromete la integridad del contenido. El robo de credenciales expone información restringida, atacando la confidencialidad. Cada ataque puede afectar más de un eje, pero el principal es el indicado.
```

---

## 5. Práctica con referencia visual

Requiere interpretar una imagen, captura, diagrama, esquema o salida de comando. **Siempre describir la referencia visual en texto** en el campo `**Referencia visual:**`: muchas plataformas no preservan imágenes, y la descripción textual fuerza a que la información relevante esté en palabras.

**Cuándo usarla:**
- Interpretación de salida de comandos (`lscpu`, `df -h`, `ip a`).
- Lectura de diagramas (RAID, topologías, particionado).
- Análisis de capturas (Wireshark, htop, gestor de tareas).

**Ejemplo:**

```markdown
## Pregunta 5

**Tipo:** Selección múltiple — Práctica con referencia visual

**Enunciado:** Seleccione las opciones correctas utilizando la siguiente salida del comando `lscpu`. (Seleccione 2 opciones)

**Referencia visual:**

```text
Arquitectura: x86_64
CPU(s): 12
Hilo(s) de procesamiento por núcleo: 2
Núcleo(s) por socket: 6
Socket(s): 1
ID de fabricante: GenuineIntel
Nombre del modelo: Intel(R) Core(TM) i5-10400F CPU @ 2.90GHz
Caché L1d: 192 KiB
Caché L3: 12 MiB
```

**Opciones:**

- a. El CPU tiene 12 núcleos y 24 hilos.
- b. El CPU es AMD.
- c. La memoria caché L3 es 12 MiB.
- d. La memoria caché L1d es de 32 KiB por núcleo.
- e. El CPU tiene 6 núcleos y 12 hilos.

**Respuesta correcta:** c, e

**Explicación:** Son 6 núcleos físicos con 2 hilos cada uno = 12 hilos lógicos (descarta a, confirma e). La L3 se reporta literalmente como 12 MiB. El fabricante es Intel, no AMD. La L1d total es 192 KiB / 6 núcleos = 32 KiB por núcleo: la opción d es verdadera pero solo se piden 2 opciones — esto ilustra por qué especificar la cantidad importa.
```

---

## 6. Opción única con opciones compuestas

Cada opción es un bloque con varias afirmaciones. El estudiante elige el bloque cuyas afirmaciones son todas correctas.

**Cuándo usarla:**
- Definiciones complejas con múltiples atributos (creador, año, características).
- Comparación de frameworks, lenguajes o tecnologías.

**Cuidado:** consume mucho espacio y puede agotar al estudiante. Máximo 1–2 por banco.

**Ejemplo:**

```markdown
## Pregunta 6

**Tipo:** Opción única con opciones compuestas

**Enunciado:** Indique la opción que describe correctamente a Laravel.

**Opciones:**

- a.
  - Framework basado en Python.
  - Creado en 2005 por Guido van Rossum.
  - No es modular ni extensible.

- b.
  - Framework basado en PHP.
  - Creado en 2011 por Taylor Otwell.
  - Arquitectura MVC, código modular y extensible.
  - Posee un derivado llamado Lumen para APIs y microservicios.

- c.
  - Framework de JavaScript creado en 1998.
  - Pensado solo para sitios estáticos.
  - Código cerrado.

**Respuesta correcta:** b

**Explicación:** Laravel es un framework PHP creado por Taylor Otwell en 2011, con arquitectura MVC. La opción (a) describe rasgos de Python/Django mezclados con datos falsos. La (c) inventa fechas y características que no corresponden a ningún framework real.
```

---

## Mezcla recomendada por banco

Para un banco de práctica de 15 preguntas, una distribución que funciona bien:

- 6–8 de opción única (mezclando conceptual, terminológica y con código si aplica)
- 2–3 de selección múltiple
- 2–3 de Verdadero/Falso
- 1–2 de relacionar
- 1–2 de práctica con referencia visual (si el material lo permite)

No es rígido. Si el material es 100% conceptual sin diagramas ni código, ajustá. Si es 100% práctica de comandos, también.
