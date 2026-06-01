'use client'

import { useState } from 'react'
import { Check, Link2 } from 'lucide-react'

interface CopyApunteLinkButtonProps {
  yearSlug: string
  subjectSlug: string
  apunteSlug: string
  /** Estilo opcional para alinear con cards mobile vs desktop. */
  className?: string
}

export function CopyApunteLinkButton({
  yearSlug,
  subjectSlug,
  apunteSlug,
  className,
}: CopyApunteLinkButtonProps) {
  const [copiado, setCopiado] = useState(false)

  const handleCopiar = async () => {
    try {
      const url = new URL(
        `/${yearSlug}/${subjectSlug}/apuntes/${apunteSlug}`,
        window.location.origin,
      ).toString()
      if (!navigator.clipboard) {
        console.error('Clipboard API no disponible')
        return
      }
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1500)
    } catch (err) {
      console.error('No se pudo copiar el link', err)
    }
  }

  const base =
    'inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors'
  const state = copiado
    ? 'bg-white/10 text-white'
    : 'bg-white/[0.03] text-white/60 hover:bg-white/10 hover:text-white'

  return (
    <button
      type="button"
      onClick={handleCopiar}
      className={[base, state, className ?? ''].join(' ').trim()}
      aria-live="polite"
    >
      {copiado ? (
        <>
          <Check className="size-3.5" />
          Link copiado
        </>
      ) : (
        <>
          <Link2 className="size-3.5" />
          Copiar link
        </>
      )}
    </button>
  )
}
