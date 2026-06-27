import type { RankedHistory } from './quizTypes'

// Cliente único para consultar el progreso. Lo comparten la carga automática
// del provider (identidad guardada) y la consulta puntual del modal (otro
// nombre), para no duplicar la construcción de la URL ni el manejo de errores.
export async function fetchRankedHistory(subject: string, bankId: string, name: string): Promise<RankedHistory> {
  const res = await fetch(
    `/api/quiz/ranked/history?subject=${encodeURIComponent(subject)}&bank=${encodeURIComponent(bankId)}&name=${encodeURIComponent(name)}`,
  )
  if (!res.ok) throw new Error('No se pudo cargar el progreso.')
  return res.json()
}
