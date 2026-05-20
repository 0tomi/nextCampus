import Link from 'next/link'
import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { SubjectTabs } from './SubjectTabs'
import { getYearColorClasses } from '@/lib/yearColors'

interface SubjectForMobile {
  id: string
  slug: string
  nombre: string
  descripcion: string | null
  driveUrl: string | null
  year: { slug: string; nombre: string; career: { nombre: string } }
  agenda: { id: string; eventos: Array<{ id: string; titulo: string; descripcionHtml: string | null; fecha: Date | string; tipoEvento: { nombre: string } }> } | null
  apuntes: Array<{ id: string; titulo: string; descripcionHtml: string | null; hasPdf: boolean }>
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
  const driveUrl = subject.driveUrl ||
    `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(subject.nombre)}`

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
            <span
              className={['inline-flex px-3 py-1 border text-[10px] font-bold uppercase tracking-[0.2em] rounded', colors.chipClassName].join(' ')}
            >
              {subject.year.nombre}
            </span>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-white leading-tight">
              {subject.nombre}
            </h1>
            {subject.descripcion ? (
              <p className="mt-2 text-sm leading-relaxed text-white/55">{subject.descripcion}</p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Agenda, unidades y apuntes organizados para que puedas estudiar y practicar en una sola vista.
              </p>
            )}
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full h-11 rounded-md bg-white/[0.04] border border-white/10 text-sm font-bold text-white cursor-pointer hover:bg-white/10 transition-colors"
            >
              <GoogleDriveIcon className="h-5 w-5" />
              Drive con contenido
            </a>
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
          events={eventos.map(e => ({ id: e.id, titulo: e.titulo, fecha: e.fecha, tipo: e.tipoEvento.nombre }))}
          apuntes={subject.apuntes}
        />
      </div>
    </MobileShell>
  )
}
