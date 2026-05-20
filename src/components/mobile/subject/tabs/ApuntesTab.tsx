import { Download } from 'lucide-react'
import { getYearColorClasses } from '@/lib/yearColors'
import { sanitizeRichHtml } from '@/lib/sanitize'

interface Apunte {
  id: string
  titulo: string
  descripcionHtml: string | null
  hasPdf: boolean
}

export function ApuntesTab({ apuntes, yearSlug }: { apuntes: Apunte[]; yearSlug: string }) {
  const colors = getYearColorClasses(yearSlug)
  if (apuntes.length === 0) {
    return (
      <div className="px-[18px]">
        <div className="bg-[#1a1a1a] border border-dashed border-white/10 rounded-lg p-6 text-sm text-white/45 text-center">
          Esta materia todavía no tiene apuntes.
        </div>
      </div>
    )
  }
  return (
    <div className="px-[18px] flex flex-col gap-3">
      {apuntes.map(a => (
        <div key={a.id} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Apunte</p>
              <h3 className="mt-1 text-base font-black text-white leading-tight">{a.titulo}</h3>
            </div>
            {a.hasPdf && (
              <a
                href={`/api/apuntes/${a.id}/pdf`}
                className={['inline-flex items-center gap-1.5 h-9 px-3 border rounded text-[10px] font-bold uppercase tracking-[0.18em] cursor-pointer transition-colors hover:bg-white/5', colors.chipClassName].join(' ')}
              >
                <Download size={14} strokeWidth={2.4} />
                PDF
              </a>
            )}
          </div>
          {a.descripcionHtml && (
            <div
              className="text-sm leading-6 text-white/60 [&_a]:text-white [&_a]:underline [&_p]:m-0 [&_strong]:text-white"
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(a.descripcionHtml) }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
