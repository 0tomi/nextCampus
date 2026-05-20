import { getEventTone } from '@/components/mobile/shared/tokens'

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

interface AgendaCardProps {
  fecha: Date | string
  tipo: string
  titulo: string
}

export function AgendaCard({ fecha, tipo, titulo }: AgendaCardProps) {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  const tone = getEventTone(tipo)
  const weekday = WEEKDAYS[d.getDay()]
  const day = d.getDate()
  const month = MONTHS[d.getMonth()]
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-[10px] flex items-stretch gap-3.5 px-3.5 py-3 cursor-pointer hover:bg-[#1f1f1f] transition-colors">
      <div className="w-12 min-w-12 flex flex-col items-center justify-center border-r border-white/[0.06] pr-2">
        <span className="text-[9px] font-extrabold tracking-[0.15em] uppercase text-white/50">{weekday}</span>
        <span className="text-[22px] font-black text-white leading-none">{day}</span>
        <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-white/40 mt-0.5">{month}</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        <span
          className="inline-flex self-start px-2 py-0.5 rounded text-[9px] font-extrabold tracking-[0.14em] uppercase border"
          style={{ background: tone.bg, borderColor: tone.border, color: tone.text }}
        >
          {tipo}
        </span>
        <span className="text-sm font-bold text-white leading-snug">{titulo}</span>
        <span className="text-[11px] font-semibold text-white/45">{time} hs</span>
      </div>
    </div>
  )
}
