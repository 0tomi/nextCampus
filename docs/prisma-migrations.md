# Aplicar migraciones de Prisma

Este repo usa Prisma 7 con `prisma.config.ts`. Las migraciones leen la URL desde `DIRECT_URL`:

```ts
// prisma.config.ts
datasource: {
  url: env('DIRECT_URL'),
}
```

La app en runtime usa `DATABASE_URL` desde `src/lib/prisma.ts`, pero los comandos de migración usan `DIRECT_URL`.

## Regla: nunca renombrar una migración ya aplicada

Una migración aplicada queda registrada por NOMBRE en la tabla
`_prisma_migrations`. Si se renombra la carpeta local después de aplicarla,
la base queda con una fila huérfana que apunta a un archivo inexistente:
`migrate status` sigue diciendo "up to date", pero `prisma migrate dev` la
detecta como drift y propone **resetear la base (borra todos los datos)**.

Ya pasó: `20260603120000_add_periodo_academico` se aplicó y después se
renombró a `20260604030000_...` — eso dejó `migrate dev` roto hasta el
2026-06-12, cuando se eliminó la fila huérfana de `_prisma_migrations`
(solo bookkeeping, sin tocar schema ni datos). Si vuelve a aparecer el
mensaje "applied to the database but missing from the local migrations
directory": NO aceptar el reset; identificar la fila huérfana en
`_prisma_migrations`, verificar que su trabajo esté cubierto por una
migración local aplicada, snapshotearla y borrarla.

## Checklist antes de aplicar

1. Estar en el root del proyecto.
2. Tener el último commit con la carpeta `prisma/migrations` actualizada.
3. Tener `DIRECT_URL` configurada en el entorno donde se corre el comando.
4. Confirmar a qué base apunta `DIRECT_URL` antes de ejecutar.

No usar `prisma db push` para producción: saltea el historial de migraciones.

## Ver estado de migraciones

```bash
pnpm exec prisma migrate status
```

También se puede usar el script equivalente si se agrega en el futuro, pero hoy el comando directo es el más claro.

## Aplicar en producción o staging

```bash
pnpm db:deploy
```

Ese script corre:

```bash
prisma migrate deploy
```

`migrate deploy` aplica migraciones pendientes ya commiteadas. No crea migraciones nuevas y es el comando correcto para entornos compartidos.

Después de aplicar, verificar:

```bash
pnpm exec prisma migrate status
```

Debe indicar que no quedan migraciones pendientes.

## Aplicar en local

Si solo querés aplicar migraciones ya existentes:

```bash
pnpm db:deploy
```

Si estás desarrollando cambios nuevos de schema y querés que Prisma cree/aplique una migración nueva:

```bash
pnpm db:migrate
```

Ese script corre `prisma migrate dev` y es para desarrollo, no para producción.

## Deploy en Vercel

El build configurado corre:

```bash
prisma generate && next build
```

Eso genera el cliente y compila la app, pero no aplica migraciones. Antes de desplegar una versión que depende de una tabla nueva, correr:

```bash
pnpm db:deploy
```

contra la base del entorno correspondiente.

Si una feature nueva depende de una tabla que todavía no se migró, sus endpoints van a fallar en runtime: aplicar la migración ANTES de desplegar el código que la usa.

## Si algo falla

1. No correr `db push` como atajo en producción.
2. Revisar `DIRECT_URL` y que apunte a la base correcta.
3. Correr:

   ```bash
   pnpm exec prisma migrate status
   ```

4. Revisar el error puntual de Prisma/Postgres.
5. Si una migración quedó aplicada a medias o hay drift, resolverlo explícitamente antes de volver a intentar.
