export interface TipoEventoLike {
  id: string
  nombre: string
}

const EVENT_TYPE_PATTERNS = [
  { keyword: 'examen', regex: /exam|parc|fin|evalu|quiz|test|recup/i },
  { keyword: 'exposicion', regex: /expo|presen|coloq|defen/i },
  { keyword: 'trabajo practico', regex: /\btp\b|trab|prac|entre/i },
]

function normalizeEventText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function detectEventType(text: string, tiposEvento: readonly TipoEventoLike[]): string | null {
  if (!text.trim()) return null

  const normalizedText = normalizeEventText(text)
  const match = EVENT_TYPE_PATTERNS.find((pattern) => pattern.regex.test(normalizedText))
  if (!match) return null

  const matchedTipo = tiposEvento.find((tipo) => {
    const normalizedName = normalizeEventText(tipo.nombre)
    return normalizedName.includes(match.keyword) || match.keyword.includes(normalizedName)
  })

  return matchedTipo?.id ?? null
}
