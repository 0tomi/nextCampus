import { UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Línea de autoría: muestra quién subió un apunte, evento o banco de preguntas.
 * Token neutro (white/40) a propósito — el verde esmeralda está reservado para
 * fechas ("subido el…"), no para personas. Se omite por completo si no hay autor
 * conocido (relación borrada o contenido viejo sin registro).
 */
export function UploaderByline({
  nombre,
  className,
}: {
  nombre?: string | null
  className?: string
}) {
  if (!nombre) return null

  return (
    <span
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-1.5 text-[11px] font-semibold text-white/40',
        className,
      )}
    >
      <UserRound className="size-3.5 shrink-0 text-white/30" aria-hidden="true" />
      <span className="shrink-0">Subido por</span> <span className="min-w-0 truncate font-bold text-white/64">{nombre}</span>
    </span>
  )
}
