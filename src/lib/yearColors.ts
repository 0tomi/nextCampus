export type YearColorName = 'amber' | 'emerald' | 'violet' | 'rose' | 'cyan'

export interface YearColorClasses {
  name: YearColorName
  badgeClassName: string
  chipClassName: string
  progressClassName: string
  textClassName: string
  tone: string
}

export type YearColorInput =
  | number
  | string
  | {
      orden?: number | null
      slug?: string | null
    }
  | null
  | undefined

export const YEAR_COLOR_PALETTE = [
  {
    name: 'amber',
    badgeClassName: 'from-amber-400 to-orange-500 text-black',
    chipClassName:
      'border-amber-400/20 bg-amber-500/10 text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.08)]',
    progressClassName: 'bg-gradient-to-r from-amber-400 to-orange-500',
    textClassName: 'text-amber-300',
    tone: '#fbbf24',
  },
  {
    name: 'emerald',
    badgeClassName: 'from-emerald-400 to-teal-500 text-black',
    chipClassName:
      'border-emerald-400/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.08)]',
    progressClassName: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    textClassName: 'text-emerald-300',
    tone: '#34d399',
  },
  {
    name: 'violet',
    badgeClassName: 'from-violet-400 to-purple-500 text-white',
    chipClassName:
      'border-violet-400/20 bg-violet-500/10 text-violet-300 shadow-[0_0_24px_rgba(167,139,250,0.08)]',
    progressClassName: 'bg-gradient-to-r from-violet-400 to-purple-500',
    textClassName: 'text-violet-300',
    tone: '#a78bfa',
  },
  {
    name: 'rose',
    badgeClassName: 'from-rose-400 to-pink-500 text-white',
    chipClassName:
      'border-rose-400/20 bg-rose-500/10 text-rose-300 shadow-[0_0_24px_rgba(251,113,133,0.08)]',
    progressClassName: 'bg-gradient-to-r from-rose-400 to-pink-500',
    textClassName: 'text-rose-300',
    tone: '#fb7185',
  },
  {
    name: 'cyan',
    badgeClassName: 'from-cyan-400 to-blue-500 text-black',
    chipClassName:
      'border-cyan-400/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.08)]',
    progressClassName: 'bg-gradient-to-r from-cyan-400 to-blue-500',
    textClassName: 'text-cyan-300',
    tone: '#22d3ee',
  },
] as const satisfies readonly YearColorClasses[]

function normalizeIndex(index: number): number {
  return ((index % YEAR_COLOR_PALETTE.length) + YEAR_COLOR_PALETTE.length) %
    YEAR_COLOR_PALETTE.length
}

function hashString(value: string): number {
  let hash = 0

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0
  }

  return Math.abs(hash)
}

export function getYearColorIndex(input: YearColorInput): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return normalizeIndex(Math.trunc(input) - 1)
  }

  if (typeof input === 'string') {
    return normalizeIndex(hashString(input))
  }

  if (input && typeof input === 'object') {
    if (typeof input.orden === 'number' && Number.isFinite(input.orden)) {
      return normalizeIndex(Math.trunc(input.orden) - 1)
    }

    if (typeof input.slug === 'string' && input.slug.length > 0) {
      return normalizeIndex(hashString(input.slug))
    }
  }

  return 0
}

export function getYearColorClasses(input: YearColorInput): YearColorClasses {
  return YEAR_COLOR_PALETTE[getYearColorIndex(input)]
}

export function getYearGradientClassName(input: YearColorInput): string {
  return getYearColorClasses(input).badgeClassName
}

export function getYearChipClassName(input: YearColorInput): string {
  return getYearColorClasses(input).chipClassName
}

export function getYearProgressClassName(input: YearColorInput): string {
  return getYearColorClasses(input).progressClassName
}

export function getYearTextClassName(input: YearColorInput): string {
  return getYearColorClasses(input).textClassName
}

export function getYearTone(input: YearColorInput): string {
  return getYearColorClasses(input).tone
}
