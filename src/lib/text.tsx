import React from 'react'

/**
 * Formatea un texto plano que contiene saltos de línea (\n), enlaces (http/https)
 * y texto en negrita (formato **negrita**), retornando nodos de React seguros contra XSS.
 */
export function formatDescription(text: string | null | undefined): React.ReactNode[] {
  if (!text) return []

  // Expresión regular para detectar URLs que comiencen con http:// o https://
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)

  let partCounter = 0

  return parts.map((part) => {
    // Cada parte obtiene una key estable derivada de un contador local;
    // la posición y el contenido no cambian entre renders.
    const partKey = `part-${partCounter++}`

    // Si la parte coincide con una URL, la envolvemos en un enlace clickeable
    if (part.match(urlRegex)) {
      return (
        <a
          key={partKey}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-300 underline hover:text-violet-200 transition-colors"
        >
          {part}
        </a>
      )
    }

    // Dividimos por la sintaxis de markdown bold **
    const boldParts = part.split(/\*\*([^*]+)\*\*/g)
    let boldCounter = 0

    return (
      <React.Fragment key={partKey}>
        {boldParts.map((subPart, subIndex) => {
          // Los índices impares corresponden al texto capturado dentro de **
          const isBold = subIndex % 2 === 1
          const boldKey = `bold-${boldCounter++}`

          // Dividimos por saltos de línea para renderizar elementos <br />
          const lineParts = subPart.split('\n')
          let lineCounter = 0
          const renderedText = lineParts.map((line) => {
            const isFirstLine = lineCounter === 0
            const lineKey = `line-${lineCounter++}`
            return (
              <React.Fragment key={lineKey}>
                {!isFirstLine && <br />}
                {line}
              </React.Fragment>
            )
          })

          if (isBold) {
            return (
              <strong key={boldKey} className="font-bold text-white">
                {renderedText}
              </strong>
            )
          }
          return renderedText
        })}
      </React.Fragment>
    )
  })
}
