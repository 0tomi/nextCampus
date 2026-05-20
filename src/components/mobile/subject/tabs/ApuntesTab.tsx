import { ApunteRecursoView } from '@/components/apuntes/ApunteRecursoView'
import type { RecursoTipo } from '@/lib/recursos'

interface Recurso {
  id: string
  tipo: RecursoTipo
  url: string
  orden: number
}

interface Apunte {
  id: string
  titulo: string
  descripcionHtml: string | null
  recursos: Recurso[]
}

export function ApuntesTab({ apuntes }: { apuntes: Apunte[] }) {
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
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Apunte</p>
            <h3 className="mt-1 text-base font-black text-white leading-tight">{a.titulo}</h3>
          </div>
          {a.descripcionHtml && (
            <div
              className="text-sm leading-6 text-white/60 [&_a]:text-white [&_a]:underline [&_p]:m-0 [&_strong]:text-white"
              dangerouslySetInnerHTML={{ __html: a.descripcionHtml }}
            />
          )}
          {a.recursos.length > 0 && (
            <div className="flex flex-col gap-3">
              {a.recursos.map(r => (
                <ApunteRecursoView key={r.id} recurso={r} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
