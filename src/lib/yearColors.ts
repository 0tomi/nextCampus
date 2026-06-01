import type { CSSProperties } from 'react'

export type YearColorName =
  | 'amber'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'cyan'
  | 'sky'
  | 'fuchsia'
  | 'lime'
  | 'orange'
  | 'indigo'
  | 'custom'

export interface YearColorClasses {
  name: YearColorName
  badgeClassName: string
  chipClassName: string
  progressClassName: string
  textClassName: string
  /** Hex del tono base (para borderColor, dots, etc.). */
  tone: string
  /**
   * Variables CSS inline para los colores personalizados. `undefined` en los
   * tonos predefinidos (que ya usan clases Tailwind curadas). Los consumidores
   * lo aplican siempre con `style={colors.style}`: queda sin efecto en presets
   * y activa el tono custom cuando corresponde.
   */
  style?: CSSProperties
}

export type YearColorInput =
  | number
  | string
  | {
      orden?: number | null
      slug?: string | null
      /** Color elegido y guardado del año (hex `#rrggbb`). null = automático. */
      color?: string | null
    }
  | null
  | undefined

/** Entrada de paleta sin el campo `style` (se agrega al resolver). */
type YearPaletteEntry = Omit<YearColorClasses, 'style'>

export const YEAR_COLOR_PALETTE = [
  {
    name: 'amber',
    badgeClassName: 'from-amber-400 to-orange-500 text-white',
    chipClassName:
      'border-amber-400/20 bg-amber-500/10 text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.08)]',
    progressClassName: 'bg-gradient-to-r from-amber-400 to-orange-500',
    textClassName: 'text-amber-300',
    tone: '#fbbf24',
  },
  {
    name: 'emerald',
    badgeClassName: 'from-emerald-400 to-teal-500 text-white',
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
    badgeClassName: 'from-cyan-400 to-blue-500 text-white',
    chipClassName:
      'border-cyan-400/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.08)]',
    progressClassName: 'bg-gradient-to-r from-cyan-400 to-blue-500',
    textClassName: 'text-cyan-300',
    tone: '#22d3ee',
  },
  {
    name: 'sky',
    badgeClassName: 'from-sky-400 to-indigo-500 text-white',
    chipClassName:
      'border-sky-400/20 bg-sky-500/10 text-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.08)]',
    progressClassName: 'bg-gradient-to-r from-sky-400 to-indigo-500',
    textClassName: 'text-sky-300',
    tone: '#38bdf8',
  },
  {
    name: 'fuchsia',
    badgeClassName: 'from-fuchsia-400 to-pink-600 text-white',
    chipClassName:
      'border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-300 shadow-[0_0_24px_rgba(232,121,249,0.08)]',
    progressClassName: 'bg-gradient-to-r from-fuchsia-400 to-pink-600',
    textClassName: 'text-fuchsia-300',
    tone: '#e879f9',
  },
  {
    name: 'lime',
    badgeClassName: 'from-lime-400 to-emerald-500 text-white',
    chipClassName:
      'border-lime-400/20 bg-lime-500/10 text-lime-300 shadow-[0_0_24px_rgba(163,230,53,0.08)]',
    progressClassName: 'bg-gradient-to-r from-lime-400 to-emerald-500',
    textClassName: 'text-lime-300',
    tone: '#a3e635',
  },
  {
    name: 'orange',
    badgeClassName: 'from-orange-400 to-red-500 text-white',
    chipClassName:
      'border-orange-400/20 bg-orange-500/10 text-orange-300 shadow-[0_0_24px_rgba(251,146,60,0.08)]',
    progressClassName: 'bg-gradient-to-r from-orange-400 to-red-500',
    textClassName: 'text-orange-300',
    tone: '#fb923c',
  },
  {
    name: 'indigo',
    badgeClassName: 'from-indigo-400 to-violet-600 text-white',
    chipClassName:
      'border-indigo-400/20 bg-indigo-500/10 text-indigo-300 shadow-[0_0_24px_rgba(129,140,248,0.08)]',
    progressClassName: 'bg-gradient-to-r from-indigo-400 to-violet-600',
    textClassName: 'text-indigo-300',
    tone: '#818cf8',
  },
] as const satisfies readonly YearPaletteEntry[]

/** Tonos predefinidos para el selector de color del modal. */
export const YEAR_COLOR_PRESETS: readonly { name: YearColorName; tone: string }[] =
  YEAR_COLOR_PALETTE.map((entry) => ({ name: entry.name, tone: entry.tone }))

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i

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

function getYearColorIndex(input: YearColorInput): number {
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

/** Devuelve el color guardado del año si la entrada lo trae, si no `null`. */
function getStoredColor(input: YearColorInput): string | null {
  if (input && typeof input === 'object' && typeof input.color === 'string') {
    const value = input.color.trim()
    return value.length > 0 ? value : null
  }
  return null
}

function findPresetByTone(hex: string): YearPaletteEntry | undefined {
  const normalized = hex.toLowerCase()
  return YEAR_COLOR_PALETTE.find((entry) => entry.tone.toLowerCase() === normalized)
}

/** Color custom: clases reales (definidas en globals.css) + variable CSS inline. */
function buildCustomColorClasses(hex: string): YearColorClasses {
  return {
    name: 'custom',
    badgeClassName: 'year-badge',
    chipClassName: 'year-chip',
    progressClassName: 'year-progress',
    textClassName: 'year-text',
    tone: hex,
    style: { ['--year-tone']: hex } as CSSProperties,
  }
}

export function getYearColorClasses(input: YearColorInput): YearColorClasses {
  const storedColor = getStoredColor(input)

  if (storedColor && HEX_COLOR_REGEX.test(storedColor)) {
    const preset = findPresetByTone(storedColor)
    if (preset) return { ...preset }
    return buildCustomColorClasses(storedColor)
  }

  return { ...YEAR_COLOR_PALETTE[getYearColorIndex(input)] }
}

export function getYearTone(input: YearColorInput): string {
  return getYearColorClasses(input).tone
}
