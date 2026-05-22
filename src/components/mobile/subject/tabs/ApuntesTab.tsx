import { ApunteRecursoView } from '@/components/apuntes/ApunteRecursoView'
import type { RecursoTipo } from '@/lib/recursos'
import { AdminControls } from '@/components/admin/AdminControls'
import { DeleteApunteButton } from '@/components/admin/SubjectPageAdminOverlay'
import { Plus, Pencil } from 'lucide-react'

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

export function ApuntesTab({
  apuntes,
  yearId,
  subjectSlug,
}: {
  apuntes: Apunte[]
  yearId: string
  subjectSlug: string
}) {
  const addApunteButton = (
    <AdminControls yearId={yearId} noWrapper>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-new-apunte'))}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-md bg-white/[0.04] border border-white/10 text-sm font-bold text-white cursor-pointer hover:bg-white/10 transition-colors mb-3"
      >
        <Plus size={16} strokeWidth={2.5} />
        Agregar apuntes
      </button>
    </AdminControls>
  )

  if (apuntes.length === 0) {
    return (
      <div className="px-[18px]">
        {addApunteButton}
        <div className="bg-[#1a1a1a] border border-dashed border-white/10 rounded-lg p-6 text-sm text-white/45 text-center">
          Esta materia todavía no tiene apuntes.
        </div>
      </div>
    )
  }

  return (
    <div className="px-[18px] flex flex-col gap-3">
      {addApunteButton}
      {apuntes.map(a => (
        <div key={a.id} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 flex flex-col gap-3 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Apunte</p>
              <h3 className="mt-1 text-base font-black text-white leading-tight">{a.titulo}</h3>
            </div>
            <AdminControls yearId={yearId} noWrapper>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('open-admin-modal-edit-apunte', {
                        detail: { apunte: { ...a, descripcionHtml: a.descripcionHtml ?? '' } },
                      })
                    )
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-white/55 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                  title="Editar apunte"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <DeleteApunteButton
                  apunteId={a.id}
                  subjectSlug={subjectSlug}
                  yearId={yearId}
                />
              </div>
            </AdminControls>
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
