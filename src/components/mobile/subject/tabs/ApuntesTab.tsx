'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ApunteRecursoView } from '@/components/apuntes/ApunteRecursoView'
import { CopyApunteLinkButton } from '@/components/apuntes/CopyApunteLinkButton'
import type { RecursoTipo } from '@/lib/recursos'
import { AdminControls } from '@/components/admin/AdminControls'
import { DeleteApunteButton } from '@/components/admin/SubjectPageAdminOverlay'
import { Plus, Pencil } from 'lucide-react'

interface Recurso {
  id: string
  tipo: RecursoTipo
  url: string
  orden: number
  nombre: string | null
  storageKey?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
}

interface Apunte {
  id: string
  titulo: string
  slug: string
  descripcionHtml: string | null
  recursos: Recurso[]
}

export function ApuntesTab({
  apuntes,
  yearId,
  yearSlug,
  subjectSlug,
  focusApunteSlug,
}: {
  apuntes: Apunte[]
  yearId: string
  yearSlug: string
  subjectSlug: string
  focusApunteSlug?: string
}) {
  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

  useEffect(() => {
    if (!focusApunteSlug) return
    const handle = window.requestAnimationFrame(() => {
      const node = cardRefs.current.get(focusApunteSlug)
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
    return () => window.cancelAnimationFrame(handle)
  }, [focusApunteSlug])

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
      {apuntes.map(a => {
        const enfocado = focusApunteSlug === a.slug
        const apunteHref = `/${yearSlug}/${subjectSlug}/apuntes/${a.slug}`
        return (
          <div
            key={a.id}
            ref={(node) => {
              if (node) cardRefs.current.set(a.slug, node)
              else cardRefs.current.delete(a.slug)
            }}
            className={[
              'bg-[#1a1a1a] border rounded-xl p-5 flex flex-col gap-3 relative transition-colors',
              enfocado ? 'border-white/20' : 'border-white/5',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Apunte</p>
                <h3 className="mt-1 text-base font-black text-white leading-tight hover:underline transition-all">
                  <Link href={apunteHref}>
                    {a.titulo}
                  </Link>
                </h3>
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
                {a.recursos.slice(0, 3).map(r => (
                  <ApunteRecursoView key={r.id} recurso={r} apunteHref={apunteHref} />
                ))}
                {a.recursos.length > 3 && (
                  <Link
                    href={apunteHref}
                    className="mt-1 text-center text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer transition-colors block py-1"
                  >
                    Y otros {a.recursos.length - 3} recursos. Abrí el apunte para verlos todos.
                  </Link>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <CopyApunteLinkButton
                yearSlug={yearSlug}
                subjectSlug={subjectSlug}
                apunteSlug={a.slug}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
