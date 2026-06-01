const RESERVED_YEAR_SLUG_LIST = [
  'admin',
  'api',
  'configurar',
  'mapa',
  'materia',
  'year',
] as const

export function isReservedYearSlug(slug: string): boolean {
  return RESERVED_YEAR_SLUG_LIST.includes(slug as (typeof RESERVED_YEAR_SLUG_LIST)[number])
}

export function reservedYearSlugSet(): ReadonlySet<string> {
  return new Set(RESERVED_YEAR_SLUG_LIST)
}
