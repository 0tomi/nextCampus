export const RANKED_NAME_STORAGE_KEY = 'nextcampus:quiz-ranked:name'
export const RANKED_MIN_QUESTIONS = 10
export const RANKED_PERCENTAGE = 0.2
export const RANKED_TOP_LIMIT = 10

export type RankedInvalidationReason =
  | 'fullscreen_exit'
  | 'tab_hidden'
  | 'page_unload'
  | 'manual_exit'

export function getRankedQuestionCount(totalPreguntas: number): number {
  if (!Number.isFinite(totalPreguntas) || totalPreguntas <= 0) return 0
  return Math.ceil(totalPreguntas * RANKED_PERCENTAGE)
}

export function isRankedBankEligible(totalPreguntas: number): boolean {
  return getRankedQuestionCount(totalPreguntas) >= RANKED_MIN_QUESTIONS
}

export function cleanParticipantName(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

const LEET_REPLACEMENTS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '!': 'i',
  '|': 'i',
  '3': 'e',
  '4': 'a',
  '@': 'a',
  '5': 's',
  '$': 's',
  '7': 't',
  '+': 't',
  '8': 'b',
}

function normalizeForModeration(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[0134@!|5$7+8]/g, (char) => LEET_REPLACEMENTS[char] ?? char)
    .replace(/ñ/g, 'n')
    .replace(/(.)\1{2,}/g, '$1$1')
}

function compactForModeration(value: string): string {
  return normalizeForModeration(value).replace(/[^a-z0-9]+/g, '')
}

function tokensForModeration(value: string): string[] {
  return normalizeForModeration(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

// Patrones backend: cubren insultos frecuentes en español con separadores,
// tildes, repeticiones y leetspeak normalizados antes de evaluar.
const OFFENSIVE_TOKEN_PATTERNS: RegExp[] = [
  /^bolud[oa]s?$/,
  /^pelotud[oa]s?$/,
  /^tarad[oa]s?$/,
  /^idiot[ao]s?$/,
  /^imbecil(?:es)?$/,
  /^gil(?:es)?$/,
  /^gark[ao]s?$/,
  /^garc[ao]s?$/,
  /^forr[oa]s?$/,
  /^soret(?:e|es)$/,
  /^mierd[ao]s?$/,
  /^cagad[oa]s?$/,
  /^cagon(?:es|as)?$/,
  /^cagones$/,
  /^cornud[oa]s?$/,
  /^mamert[oa]s?$/,
  /^bobo?s?$/,
  /^bob[ao]s?$/,
  /^brut[oa]s?$/,
  /^burro?s?$/,
  /^burra?s?$/,
  /^pajer[oa]s?$/,
  /^babos[oa]s?$/,
  /^asqueros[oa]s?$/,
  /^ratas?$/,
  /^lacras?$/,
  /^basuras?$/,
  /^inutil(?:es)?$/,
  /^inservibles?$/,
  /^estupid[oa]s?$/,
  /^subnormal(?:es)?$/,
  /^mongol(?:es)?$/,
  /^mogolic[oa]s?$/,
  /^nazi?s?$/,
  /^fach[oa]s?$/,
  /^ortiv[ao]s?$/,
  /^chot[oa]s?$/,
  /^vergas?$/,
  /^pij[ao]s?$/,
  /^pijud[oa]s?$/,
  /^conchud[oa]s?$/,
  /^put[ao]s?$/,
  /^putit[ao]s?$/,
  /^zorr[ao]s?$/,
  /^trol[ao]s?$/,
  /^culiad[oa]s?$/,
  /^culer[oa]s?$/,
  /^maric[ao]s?$/,
  /^pendej[oa]s?$/,
  /^malparid[oa]s?$/,
  /^cabron(?:es|as)?$/,
  /^bolas?$/,
  /^salames?$/,
  /^giles?$/,
  /^muert[oa]s?$/,
  /^fracasad[oa]s?$/,
  /^payas[oa]s?$/,
  /^caretas?$/,
]

const OFFENSIVE_COMPACT_PATTERNS: RegExp[] = [
  /hij[oa]deput[ao]/,
  /hij[oa]sdeput[ao]/,
  /hdp/,
  /laputamadre/,
  /andatealaconcha/,
  /conchadetumadre/,
  /laconchadetumadre/,
  /chupapija/,
  /chupaverga/,
  /chupala/,
  /mamahuevo/,
  /rompebolas/,
  /pelotud[oa]/,
  /bolud[oa]/,
  /forr[oa]/,
  /pajer[oa]/,
  /sorete/,
  /mierd[ao]/,
  /idiot[ao]/,
  /imbecil/,
  /tarad[oa]/,
  /estupid[oa]/,
  /malparid[oa]/,
  /conchud[oa]/,
  /culiad[oa]/,
  /put[ao]/,
  /putit[ao]/,
  /zorr[ao]/,
  /trol[ao]/,
  /maric[ao]/,
  /cabron/,
  /cornud[oa]/,
  /cagon/,
  /garc[ao]/,
  /gark[ao]/,
  /ortiv[ao]/,
  /chot[ao]/,
  /pij[ao]/,
  /verga/,
  /nazi/,
  /fach[oa]/,
  /mogolic[oa]/,
  /mongol/,
  /lacra/,
  /basura/,
  /inutil/,
  /inservible/,
]

export const OFFENSIVE_NAME_VARIATION_COUNT =
  OFFENSIVE_TOKEN_PATTERNS.length * 2 + OFFENSIVE_COMPACT_PATTERNS.length * 2

export function getNormalizedParticipantName(value: string): string {
  return compactForModeration(cleanParticipantName(value))
}

export function isOffensiveParticipantName(value: string): boolean {
  const cleaned = cleanParticipantName(value)
  const compact = compactForModeration(cleaned)
  if (!compact) return false

  const tokenHit = tokensForModeration(cleaned).some((token) =>
    OFFENSIVE_TOKEN_PATTERNS.some((pattern) => pattern.test(token)),
  )
  if (tokenHit) return true

  return OFFENSIVE_COMPACT_PATTERNS.some((pattern) => pattern.test(compact))
}

export type ParticipantNameValidation =
  | { ok: true; name: string; normalizedName: string }
  | { ok: false; error: string }

export function validateParticipantName(value: string): ParticipantNameValidation {
  const name = cleanParticipantName(value)
  if (name.length < 2) return { ok: false, error: 'Ingresá un nombre para participar.' }
  if (name.length > 32) return { ok: false, error: 'El nombre puede tener hasta 32 caracteres.' }
  if (!/^[\p{L}\p{N} _.-]+$/u.test(name)) {
    return { ok: false, error: 'Usá letras, números, espacios, puntos o guiones.' }
  }
  if (isOffensiveParticipantName(name)) {
    return { ok: false, error: 'Elegí otro nombre para participar.' }
  }

  return { ok: true, name, normalizedName: getNormalizedParticipantName(name) }
}
