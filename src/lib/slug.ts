/**
 * Slug helpers.
 *
 * Fuente única de generación de slugs en todo el proyecto.
 *
 *  - `slugify(text, options?)`: convierte texto libre en slug seguro para URL.
 *    Defaults: truncado a 80 chars, fallback `'apunte'` si queda vacío.
 *    Para usos donde el fallback no aplica (IDs de eventos, etc.) pasar
 *    `{ fallback: '', maxLength: Infinity }`.
 *  - `ensureUniqueSlug` / `uniqueSlug`: resuelven colisiones agregando sufijo
 *    `-2`, `-3`, ... `uniqueSlug` se mantiene como alias por compatibilidad
 *    con código existente (admin ABM de años/materias).
 *  - `yearSlugFromNumber`: helper canónico para slugs de años académicos
 *    (consumido por seed, mapa, etc).
 */

const DEFAULT_MAX_SLUG_LENGTH = 80
const DEFAULT_FALLBACK_SLUG = 'apunte'

export interface SlugifyOptions {
  /** Largo máximo del slug resultante. Por defecto 80. Usar `Infinity` para no truncar. */
  maxLength?: number
  /** Valor a devolver si la normalización deja un string vacío. Por defecto `'apunte'`. Pasar `''` para no aplicar fallback. */
  fallback?: string
}

/**
 * Convierte un texto cualquiera en un slug seguro para URL.
 *
 *  - NFD normalize + strip diacritics (acentos, tildes, eñe, etc).
 *  - Lowercase.
 *  - Reemplaza cualquier secuencia que no sea [a-z0-9]+ por `-`.
 *  - Recorta guiones al inicio y al final.
 *  - Trunca a `maxLength` caracteres.
 *  - Si el resultado queda vacío, devuelve `fallback`.
 */
export function slugify(text: string, options: SlugifyOptions = {}): string {
  const maxLength = options.maxLength ?? DEFAULT_MAX_SLUG_LENGTH
  const fallback = options.fallback ?? DEFAULT_FALLBACK_SLUG

  const sliced = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/^-+|-+$/g, '')

  if (sliced.length === 0) return fallback
  return sliced
}

/**
 * Garantiza que el slug sea único dentro de un conjunto de slugs ya tomados.
 * Si `base` ya existe, prueba `base-2`, `base-3`, etc. hasta encontrar uno libre.
 *
 * @param base    Slug candidato (idealmente ya pasado por `slugify`).
 * @param existing Set/ReadonlySet de slugs en uso.
 */
export function ensureUniqueSlug(
  base: string,
  existing: Set<string> | ReadonlySet<string>,
): string {
  if (!existing.has(base)) return base
  let suffix = 2
  while (existing.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}

/**
 * Alias retro-compatible de `ensureUniqueSlug`.
 * Usado por el admin ABM de años/materias.
 */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  return ensureUniqueSlug(base, taken)
}

/**
 * Devuelve el slug canónico de un año académico a partir de su número.
 * Single source of truth: si la fórmula del slug cambia, este es el único lugar
 * que hay que tocar (seed, mapa y demás consumidores la importan).
 */
export function yearSlugFromNumber(n: number): string {
  return `anio-${n}`
}
