import { getEventTone } from '@/components/mobile/shared/tokens'
import { cn, formatAgendaTime } from '@/lib/utils'

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

interface AgendaCardProps {
  fecha: Date | string
  tipo: string
  titulo: string
  materia?: string
  onClick?: () => void
  className?: string
}

export function AgendaCard({ fecha, tipo, titulo, materia, onClick, className }: AgendaCardProps) {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  const tone = getEventTone(tipo)
  const weekday = WEEKDAYS[d.getDay()]
  const day = d.getDate()
  const month = MONTHS[d.getMonth()]
  const time = formatAgendaTime(d)

  const content = (
    <>
      <div className="flex w-12 min-w-12 flex-col items-center justify-center border-r border-white/[0.06] pr-2">
        <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-white/50">{weekday}</span>
        <span className="text-[22px] font-black leading-none text-white">{day}</span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">{month}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 text-left">
        <span
          className="inline-flex self-start rounded border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em]"
          style={{ background: tone.bg, borderColor: tone.border, color: tone.text }}
        >
          {tipo}
        </span>
        <span className="text-sm font-bold leading-snug text-white">{titulo}</span>
        <span className="text-[11px] font-semibold text-white/45">
          {materia ? `${materia} · ` : ''}{time} hs
        </span>
      </div>
    </>
  )

  const baseClassName = cn(
    'flex w-full items-stretch gap-3.5 rounded-[10px] border border-white/5 bg-[#1a1a1a] px-3.5 py-3 transition-colors hover:bg-[#1f1f1f] active:scale-[0.99]',
    onClick ? 'cursor-pointer' : 'cursor-default',
    className,
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClassName}>
        {content}
      </button>
    )
  }

  return <div className={baseClassName}>{content}</div>
}
