# Diseño: búsqueda global de apuntes

Fecha: 2026-06-15
Estado: spike validado, listo para decidir si se implementa

## 1. Problema y usuario

Hoy un estudiante necesita saber de antemano en qué año y materia está un
material. Los apuntes solo se descubren entrando a cada materia y recorriendo
su feed. La propuesta agrega una búsqueda pública que atraviesa todas las
materias y encuentra contenido por:

- título del apunte;
- materia y año;
- texto de la descripción;
- categorías;
- nombre de los recursos.

El objetivo no es reemplazar la navegación por materia, sino resolver
búsquedas concretas como “punteros”, “parcial” o “bases distribuidas”.

## 2. Corpus, extensiones y comportamiento existente

### Inventario real

Medido contra la base conectada el 2026-06-15:

| Dato | Cantidad |
|---|---:|
| Apuntes | 52 |
| Largo mínimo/promedio/máximo del título | 4 / 27,8 / 48 caracteres |
| Mediana del título | 29,5 caracteres |
| Apuntes con descripción textual | 6 |
| Categorías | 8 |
| Relaciones apunte-categoría | 62 |
| Recursos | 61 |
| Recursos con nombre | 30 |
| Apuntes con al menos un recurso nombrado | 22 |

El corpus es pequeño. La diferencia de tiempo entre motores no será visible
para el usuario hoy; la decisión debe priorizar calidad de resultados y
simplicidad.

### Extensiones de Supabase Postgres

| Extensión | Disponible | Habilitada |
|---|---:|---:|
| `unaccent` 1.1 | Sí | Sí |
| `pg_trgm` 1.6 | Sí | No |

No se habilitó ninguna extensión durante el spike. Por esa razón, trigram se
evalúa como alternativa futura, pero no se ejecutó contra la base.

### Búsqueda existente

- `src/app/api/admin/apuntes/search/route.ts:7-57` es exclusiva para admins,
  busca solo en `titulo`, limita a 12 y aplica el alcance de años del usuario.
- `src/hooks/useApunteSearch.ts:6-50` está acoplado a esa ruta, exige
  `subjectId` y devuelve el shape usado para relacionar eventos.

No conviene generalizar ese hook en el spike ni reutilizar la ruta admin. La
búsqueda pública tiene permisos, campos, navegación y estados distintos. Si
la implementación futura repite una abstracción concreta de debounce y
cancelación, recién entonces se puede extraer una utilidad pequeña.

## 3. Comparación de motores

Las pruebas combinaron título, materia, año, descripción sin etiquetas HTML,
categorías y nombres de recursos.

### Calidad con cinco búsquedas reales

| Búsqueda | `ILIKE` | FTS español | Hallazgo |
|---|---:|---:|---|
| `parcial` | 10 | 10 | Ambos encuentran coincidencias directas. |
| `punteros` | 1 | 1 | Ambos encuentran el nombre de un recurso. |
| `calcular` | 0 | 4 | FTS relaciona “calcular” con “cálculo” y “calculadora”. |
| `distribuir` | 0 | 2 | FTS encuentra apuntes de bases distribuidas. |
| `organizar` | 0 | 3 | FTS encuentra “organizaciones”. |

Con `unaccent`, tanto `algoritmo` como `algorítmo` devolvieron los mismos cinco
resultados en ambos motores. `unaccent` resuelve tildes, no errores de tipeo
generales.

### Variante A — `ILIKE` sobre todos los campos

Forma prototipada:

```sql
SELECT a.id, a.titulo, s.nombre AS materia, y.nombre AS anio
FROM "Apunte" a
JOIN "Subject" s ON s.id = a."subjectId"
JOIN "AcademicYear" y ON y.id = s."yearId"
WHERE unaccent(lower(concat_ws(
        ' ',
        a.titulo,
        regexp_replace(a."descripcionHtml", '<[^>]+>', ' ', 'g'),
        s.nombre,
        y.nombre
      ))) LIKE '%' || unaccent(lower($1)) || '%'
   OR EXISTS (
      SELECT 1
      FROM "ApunteCategoria" ac
      JOIN "Categoria" c ON c.id = ac."categoriaId"
      WHERE ac."apunteId" = a.id
        AND unaccent(lower(c.nombre)) LIKE '%' || unaccent(lower($1)) || '%'
   )
   OR EXISTS (
      SELECT 1
      FROM "ApunteRecurso" r
      WHERE r."apunteId" = a.id
        AND unaccent(lower(coalesce(r.nombre, '')))
          LIKE '%' || unaccent(lower($1)) || '%'
   )
ORDER BY a."createdAt" DESC
LIMIT 20;
```

`EXPLAIN ANALYZE` real para `parcial`:

```text
Seq Scan on "Apunte"
Rows returned: 10 of 52
Execution Time: 0.704 ms
```

Es simple y rápido con el corpus actual, pero no entiende variaciones
lingüísticas. En las pruebas perdió 9 resultados útiles distribuidos entre
`calcular`, `distribuir` y `organizar`.

### Variante B — FTS dinámico en español

Forma prototipada:

```sql
WITH documents AS (
  SELECT
    a.id,
    a.titulo,
    a."createdAt",
    s.nombre AS materia,
    y.nombre AS anio,
    setweight(
      to_tsvector('spanish', unaccent(coalesce(a.titulo, ''))),
      'A'
    )
    || setweight(
      to_tsvector('spanish', unaccent(coalesce(s.nombre, ''))),
      'B'
    )
    || setweight(
      to_tsvector(
        'spanish',
        unaccent(
          coalesce(string_agg(DISTINCT c.nombre, ' '), '')
          || ' '
          || coalesce(string_agg(DISTINCT r.nombre, ' '), '')
        )
      ),
      'B'
    )
    || setweight(
      to_tsvector(
        'spanish',
        unaccent(
          regexp_replace(
            coalesce(a."descripcionHtml", ''),
            '<[^>]+>',
            ' ',
            'g'
          )
        )
      ),
      'C'
    ) AS document
  FROM "Apunte" a
  JOIN "Subject" s ON s.id = a."subjectId"
  JOIN "AcademicYear" y ON y.id = s."yearId"
  LEFT JOIN "ApunteCategoria" ac ON ac."apunteId" = a.id
  LEFT JOIN "Categoria" c ON c.id = ac."categoriaId"
  LEFT JOIN "ApunteRecurso" r ON r."apunteId" = a.id
  GROUP BY
    a.id,
    a.titulo,
    a."createdAt",
    a."descripcionHtml",
    s.nombre,
    y.nombre
),
query AS (
  SELECT websearch_to_tsquery('spanish', unaccent($1)) AS value
)
SELECT
  d.id,
  d.titulo,
  d.materia,
  d.anio,
  ts_rank(d.document, q.value) AS rank
FROM documents d
CROSS JOIN query q
WHERE d.document @@ q.value
ORDER BY rank DESC, d."createdAt" DESC
LIMIT 20;
```

`EXPLAIN ANALYZE` real para `parcial`:

```text
GroupAggregate over the 52 notes and their relations
Rows returned: 10
Execution Time: 2.435 ms
```

La consulta calcula el documento al buscar, por eso no usa GIN. Aun así, el
costo actual es de pocos milisegundos y evita una migración, triggers y
sincronización de campos derivados.

La descripción se convierte a texto con `regexp_replace`. Es suficiente para
el HTML sanitizado actual; no se propone guardar una segunda versión de la
descripción en v1.

### Variante C — trigram

`pg_trgm` permitiría coincidencias ante errores de tipeo y un índice GIN para
`ILIKE` o similitud. No está habilitado y no se modificó la base para probarlo.
Además, trigram no reemplaza el stemming en español: resuelve otro problema.
Solo debería sumarse si el feedback muestra que los errores de tipeo son
frecuentes.

### Benchmark de crecimiento

Para comparar escalabilidad sin persistir fixtures, se creó una tabla
temporal de 52.000 filas repitiendo el corpus real 1.000 veces. También se
creó un índice GIN temporal.

| Variante | Plan principal | Tiempo |
|---|---|---:|
| `ILIKE` sin índice | `Seq Scan` | 185,966 ms |
| FTS con `tsvector` persistido + GIN | `Bitmap Index Scan` + `Bitmap Heap Scan` | 15,097 ms |

Las tablas e índices fueron temporales y desaparecieron al cerrar la sesión.

## 4. Motor recomendado

### V1: FTS español dinámico, sin migración

Es la mejor relación entre calidad y complejidad:

- encuentra variaciones útiles en español que `ILIKE` pierde;
- aprovecha `unaccent`, ya habilitado;
- tarda aproximadamente 2,4 ms con el corpus actual;
- no agrega columnas derivadas, triggers ni extensiones;
- permite validar demanda y calidad antes de optimizar.

La búsqueda debería revisarse cuando ocurra cualquiera de estas condiciones:

- más de 500 apuntes;
- tiempo p95 de la ruta superior a 100 ms;
- feedback repetido por resultados ausentes o errores de tipeo.

En ese punto, el siguiente paso es persistir un `tsvector`, mantenerlo al
cambiar apunte/categorías/recursos y agregar GIN. Trigram sigue siendo
opcional y guiado por evidencia.

## 5. Superficie de UI

### Acceso

- Botón con texto accesible “Buscar apuntes” en el centro del shell de escritorio.
- Acción equivalente en mobile, ubicada junto a la campana de notificaciones.
- La búsqueda se despliega desde la propia barra superior, sin página exclusiva.

No cambia ningún slug existente. La UI comparte la misma lógica de resultados
en desktop y mobile, ajustando solo el punto de entrada del shell.

### Wireframe

```text
Navbar
                [ 🔎 Buscar apuntes ]

Overlay de búsqueda
[ Buscar apuntes por tema o materia             ]

10 resultados

Segundo año
  Algoritmos y Estructuras de Datos
  ┌──────────────────────────────────────────────┐
  │ Resumen Primer Parcial                       │
  │ Documento · Otro                             │
  │ Abrir apunte                                 │
  └──────────────────────────────────────────────┘

Cuarto año
  Bases de Datos Avanzadas
  ┌──────────────────────────────────────────────┐
  │ Resumen para el parcial 1                    │
  │ Documento                                    │
  │ Abrir apunte                                 │
  └──────────────────────────────────────────────┘
```

Cada resultado muestra título, materia, año, categorías y un fragmento breve
cuando hay descripción. Toda la tarjeta navega al apunte usando sus slugs
actuales.

### Estados

- Inicial: **Buscá por tema, materia o tipo de material.**
- Sin resultados: **No encontramos apuntes con esas palabras. Probá con una
  búsqueda más corta.**
- Error: **No pudimos buscar ahora. Probá de nuevo en unos segundos.**
- Consulta demasiado corta: **Escribí al menos 2 caracteres.**

Los resultados se agrupan visualmente por año y materia, pero mantienen el
orden de relevancia dentro de cada grupo.

## 6. API, límites y cache

### Ruta pública

`GET /api/apuntes/search?q=<texto>`

Validación propuesta con Zod:

- `trim()`;
- mínimo 2 caracteres;
- máximo 120 caracteres;
- respuesta vacía o error 400 para entradas inválidas, según el patrón final
  elegido para la UI.

La ruta devuelve como máximo 20 resultados:

```json
{
  "query": "calcular",
  "items": [
    {
      "id": "apunte-id",
      "title": "Apuntes 2026 Recorridos 1 Y 2",
      "excerpt": null,
      "categories": ["Otro"],
      "subject": {
        "name": "Cálculo Diferencial e Integral",
        "slug": "calculo-diferencial-e-integral"
      },
      "year": {
        "name": "Primer año",
        "slug": "primer-anio"
      },
      "slug": "apuntes-2026-recorridos-1-y-2"
    }
  ]
}
```

El proxy ya aplica el rate limit general a todas las rutas `/api`
(`src/proxy.ts:26-49` y `src/proxy.ts:145-157`). No hace falta un segundo
limitador para v1.

La búsqueda es dinámica y depende de un parámetro arbitrario. **No debe usar
`use cache`, `cacheTag` ni una matriz de invalidación por consulta.** La ruta
puede responder con `Cache-Control: no-store`.

## 7. Migraciones, estimación y alcance de v1

### Migraciones

V1 no requiere migraciones.

Una optimización futura con índice necesita:

1. un campo `tsvector` o una tabla de documento de búsqueda;
2. sincronización al cambiar título, descripción, materia, categorías o
   recursos;
3. índice GIN;
4. backfill y `EXPLAIN ANALYZE` posterior al deploy.

No se recomienda una columna generada simple porque categorías y recursos
viven en tablas relacionadas. Un trigger o una tabla denormalizada sería más
correcto, pero no se justifica con 52 apuntes.

### Estimación

| Pieza | Tamaño | Trabajo |
|---|---:|---|
| Query de dominio + route handler | M | SQL, validación, shape y errores |
| Página responsive de resultados | M | input, estados, grupos y tarjetas |
| Acceso en shell desktop | S | trigger y navegación |
| Acceso en navegación mobile | S | trigger equivalente |
| Tests y smoke | M | route, calidad, desktop/mobile |
| Migración FTS indexada futura | M | documento, sincronización, GIN y backfill |

Feature v1 completa: **M**.

### Qué no hacer en v1

- Autocomplete o sugerencias mientras se escribe.
- Buscar dentro de PDFs, Drive, videos o apuntes interactivos.
- Historial de búsquedas.
- Filtros avanzados.
- Habilitar `pg_trgm` sin evidencia de typos.
- Unificar preventivamente el hook admin con la búsqueda pública.

## 8. Plan de tests y preguntas abiertas

### Tests de la feature futura

**Dominio/query**

- `parcial` encuentra título y nombre de recurso.
- `calcular` encuentra contenido relacionado con “cálculo”.
- Singular/plural y formas verbales relevantes en español.
- `algoritmo` y `algorítmo` producen los mismos resultados.
- Los pesos priorizan título sobre descripción.
- No se duplican apuntes con varias categorías o recursos.

**Route handler**

- Rechaza consultas vacías, de un carácter y mayores a 120.
- Limita a 20 y devuelve el shape público esperado.
- Incluye materia, año, categorías y href construible.
- No requiere sesión admin.
- Devuelve estado controlado ante error de base.
- Mantiene orden estable ante igual relevancia.

**UI**

- Sin consulta, carga, resultados, vacío y error.
- Envío con teclado y botón.
- Navegación completa de la tarjeta.
- Agrupación legible en desktop y mobile.
- Foco visible, nombre accesible y botones con cursor clickeable.

Patrón sugerido para la ruta:
`src/app/api/admin/historial/route.test.ts`, adaptado a una API pública.

### Preguntas abiertas para el operador

1. ¿El acceso principal debe estar siempre visible en el shell o solo dentro
   de las vistas de materias?
2. ¿Los resultados se agrupan por año/materia o se muestran en una única
   lista estrictamente ordenada por relevancia?
3. ¿La consulta mínima debe ser de 2 o 3 caracteres?

## Recomendación final

**Construir la v1 con FTS español dinámico.** El corpus actual permite ganar
calidad lingüística sin pagar todavía el costo de una arquitectura indexada.
