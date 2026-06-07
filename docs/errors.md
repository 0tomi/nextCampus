# Registro de errores conocidos

Documento de seguimiento para decidir más adelante si vale la pena corregir o no.

---

## Errores de `pnpm typecheck` en entorno limpio (cliente Prisma sin generar)

**Fecha de detección:** 2026-06-07
**Severidad:** Baja (ambiental, no son bugs del código)
**Estado:** No requiere acción inmediata.

### Síntoma

Al correr `pnpm typecheck` en un clon nuevo del repo (sin un paso previo de
generación del cliente Prisma), aparecen ~125 errores de TypeScript repartidos
en muchos archivos. Los códigos más frecuentes:

| Código | Cantidad aprox. | Significado |
|---|---|---|
| `TS7006` | ~85 | Parámetro con tipo `any` implícito (callbacks de `.map`/`.filter` sobre resultados Prisma) |
| `TS18046` | ~16 | Variable de tipo `unknown` |
| `TS2307` | ~8 | No se encuentra el módulo `./generated/client/client` |
| `TS2339` | ~6 | Propiedad inexistente sobre el tipo `{}` |
| `TS2345` | ~5 | Tipo de argumento incompatible |
| `TS7031` | ~4 | Elemento de binding con `any` implícito |
| `TS2698` | ~1 | Spread sobre tipo no objeto |

Archivos más afectados: `src/lib/queries.ts`, `src/app/admin/actions.ts`,
`src/lib/domain/year-page-adapters.ts`, `prisma/backfill-*.ts`, `src/app/mapa/*`.

### Causa raíz

El cliente de Prisma está configurado con salida en una ruta custom
(`prisma/schema.prisma`):

```prisma
generator client {
  provider = "prisma-client"
  output   = "./generated/client"
}
```

y se importa desde `src/lib/prisma.ts` como
`'../../prisma/generated/client/client'`.

Si esa carpeta no fue generada, TypeScript no encuentra los tipos del cliente
y todo lo que depende de modelos Prisma cae a `any` / `{}`, lo que dispara la
cascada de errores. La generación (`pnpm prisma generate`) necesita las
variables de entorno `DATABASE_URL` y `DIRECT_URL` (las lee `prisma.config.ts`);
en un contenedor efímero sin esas variables, `prisma generate` aborta antes de
generar.

### Verificación

Tras generar el cliente, los errores desaparecen por completo:

```bash
DATABASE_URL="postgresql://u:p@localhost:5432/db" \
DIRECT_URL="postgresql://u:p@localhost:5432/db" \
pnpm prisma generate
pnpm typecheck   # -> 0 errores
```

(Las credenciales pueden ser dummy: `generate` no se conecta a la base, solo
necesita que las variables existan para resolver la config.)

### Conclusión

No son errores reales del código. El build de Vercel corre
`prisma generate && next build` con sus variables de entorno configuradas, por
lo que **no afectan el deploy**. Solo aparecen al correr `typecheck` "en seco"
sobre un checkout nuevo.

### Recomendación (a evaluar)

Para que `pnpm typecheck` funcione directo en un clon fresco, opciones:

1. Asegurar que `pnpm install` dispare `prisma generate` vía un script
   `postinstall` (verificar si ya existe y por qué no corre sin env vars).
2. Hacer que el script `typecheck` corra `prisma generate` antes (más lento).
3. Dejarlo como está y documentar que hay que generar el cliente primero
   (este documento).
