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

  return parts.map((part, index) => {
    // Si la parte coincide con una URL, la envolvemos en un enlace clickeable
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
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

    return (
      <React.Fragment key={index}>
        {boldParts.map((subPart, subIndex) => {
          // Los índices impares corresponden al texto capturado dentro de **
          const isBold = subIndex % 2 === 1

          // Dividimos por saltos de línea para renderizar elementos <br />
          const lineParts = subPart.split('\n')
          const renderedText = lineParts.map((line, lineIndex) => (
            <React.Fragment key={lineIndex}>
              {lineIndex > 0 && <br />}
              {line}
            </React.Fragment>
          ))

          if (isBold) {
            return (
              <strong key={subIndex} className="font-bold text-white">
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
