/**
 * Slug helpers.
 *
 * `slugify` is re-exported from lib/utils for backwards compatibility.
 * This module adds the uniqueness-suffix helper needed by admin ABM flows.
 */
export { slugify } from '@/lib/utils'

/**
 * Returns a slug that doesn't clash with the provided set.
 * If `base` is free, returns it as-is. Otherwise appends -2, -3, … until
 * a free slot is found.
 *
 * @param base    Already-slugified candidate (use slugify() first).
 * @param taken   Set of slugs currently in use (from DB or memory).
 */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
