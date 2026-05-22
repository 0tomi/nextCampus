'use client'

import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { SubjectTabs } from './SubjectTabs'
import { getYearColorClasses } from '@/lib/yearColors'
import { CirclePlay, Pencil, Plus } from 'lucide-react'
import { AdminControls } from '@/components/admin/AdminControls'
import { formatDescription } from '@/lib/text'

interface SubjectForMobile {
  id: string
  slug: string
  nombre: string
  descripcion: string | null
  driveUrl: string | null
  playlistUrl: string | null
  playlistEnabled: boolean
  year: { id: string; slug: string; nombre: string; career: { nombre: string } }
  agenda: { id: string; eventos: Array<{ id: string; titulo: string; descripcionHtml: string | null; fecha: Date | string; tipoEvento: { nombre: string } }> } | null
  apuntes: Array<{ id: string; titulo: string; descripcionHtml: string | null; recursos: Array<{ id: string; tipo: 'YOUTUBE' | 'DRIVE'; url: string; orden: number }> }>
}

interface AllYear { slug: string; nombre: string; subjectsCount: number }

function GoogleDriveIcon({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/resources/google_drive_logo_icon_159334.png" alt="" aria-hidden="true" className={className} />
}

export function MobileSubject({
  subject,
  allYears,
}: {
  subject: SubjectForMobile
  allYears: AllYear[]
}) {
  const colors = getYearColorClasses(subject.year.slug)
  const eventos = subject.agenda?.eventos ?? []
  const drawerYears: MobileShellDrawerYear[] = allYears

  return (
    <MobileShell
      title={subject.nombre}
      subtitle={subject.year.nombre}
      onBack={`/year/${subject.year.slug}`}
      drawerYears={drawerYears}
      careerName={subject.year.career.nombre}
      currentYearSlug={subject.year.slug}
    >
      <div className="flex flex-col gap-6">
        {/* HERO */}
        <section className="px-[18px] pt-4">
          <div className="rounded-xl bg-[#1a1a1a] border border-white/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <span
                className={['inline-flex px-3 py-1 border text-[10px] font-bold uppercase tracking-[0.2em] rounded', colors.chipClassName].join(' ')}
              >
                {subject.year.nombre}
              </span>
              <AdminControls yearId={subject.year.id} noWrapper>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-edit-subject'))}
                  className="p-2 rounded bg-black/20 text-white/70 hover:bg-black/35 transition-colors cursor-pointer"
                  title="Editar materia"
                >
                  <Pencil size={14} />
                </button>
              </AdminControls>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-white leading-tight">
              {subject.nombre}
            </h1>
            {subject.descripcion ? (
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                {formatDescription(subject.descripcion)}
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Agenda, unidades y apuntes organizados para que puedas estudiar y practicar en una sola vista.
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              {subject.driveUrl ? (
                <div className="flex gap-2 w-full">
                  <a
                    href={subject.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-md bg-white/[0.04] border border-white/10 text-sm font-bold text-white cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <GoogleDriveIcon className="h-5 w-5" />
                    Drive con contenido
                  </a>
                  <AdminControls yearId={subject.year.id} noWrapper>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-edit-drive'))}
                      className="flex items-center justify-center w-11 h-11 shrink-0 rounded-md bg-white/[0.04] border border-white/10 text-white cursor-pointer hover:bg-white/10 transition-colors"
                      title="Editar link de Drive"
                    >
                      <Pencil className="h-4 w-4 text-white/70" />
                    </button>
                  </AdminControls>
                </div>
              ) : (
                <AdminControls yearId={subject.year.id} noWrapper>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal-edit-drive'))}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-md bg-white/[0.04] border border-white/10 text-sm font-bold text-white cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <Plus className="h-4 w-4 text-white/70" />
                    Vincular carpeta de Google Drive
                  </button>
                </AdminControls>
              )}

              {/* Playlist - solo si tiene enlace puesto (independiente de playlistEnabled) */}
              {subject.playlistUrl && (
                <a
                  href={subject.playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-md bg-white/[0.04] border border-white/10 text-sm font-bold text-white cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <CirclePlay className="h-5 w-5 text-red-400" />
                  Playlist de clases
                </a>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 divide-x divide-white/5">
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Eventos</span>
                <span className="text-lg font-black text-white">{eventos.length}</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Apuntes</span>
                <span className="text-lg font-black text-white">{subject.apuntes.length}</span>
              </div>
            </div>
          </div>
        </section>

        {/* TABS */}
        <SubjectTabs
          subjectSlug={subject.slug}
          subjectName={subject.nombre}
          yearSlug={subject.year.slug}
          yearId={subject.year.id}
          events={eventos.map(e => ({ id: e.id, titulo: e.titulo, fecha: e.fecha, tipo: e.tipoEvento.nombre }))}
          apuntes={subject.apuntes}
        />
      </div>
    </MobileShell>
  )
}
