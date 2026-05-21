import Link from 'next/link'
import { ArrowRight, ChevronRight, Calendar, Layers } from 'lucide-react'
import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { YearSwitcherPill } from './YearSwitcherPill'
import { AgendaCard } from '@/components/mobile/agenda/AgendaCard'
import { getYearColorClasses } from '@/lib/yearColors'

interface YearForMobile {
  id: string
  slug: string
  nombre: string
  subjects: Array<{
    id: string
    slug: string
    nombre: string
    agenda: { eventos: Array<{ id: string; titulo: string; fecha: Date | string; tipoEvento: { nombre: string } }> } | null
  }>
  career: { nombre: string }
}

interface AllYear {
  slug: string
  nombre: string
  subjectsCount: number
}

interface NextEvent {
  id: string
  titulo: string
  fecha: Date | string
  tipo: string
  subjectSlug: string
  subjectNombre: string
  descripcionHtml?: string | null
}

export function MobileYear({
  year,
  allYears,
  nextEvents,
  careerName,
}: {
  year: YearForMobile
  allYears: AllYear[]
  nextEvents: NextEvent[]
  careerName: string
}) {
  const colors = getYearColorClasses(year.slug)
  const yearIndex = allYears.findIndex(y => y.slug === year.slug)
  const yearNumber = yearIndex >= 0 ? yearIndex + 1 : 1
  const eventCount = year.subjects.reduce((acc, s) => acc + (s.agenda?.eventos.length ?? 0), 0)

  const drawerYears: MobileShellDrawerYear[] = allYears.map(y => ({
    slug: y.slug,
    nombre: y.nombre,
    subjectsCount: y.subjectsCount,
  }))

  return (
    <MobileShell
      title={year.nombre}
      subtitle={careerName}
      onBack="/"
      drawerYears={drawerYears}
      careerName={careerName}
      currentYearSlug={year.slug}
    >
      <div className="flex flex-col gap-7">
        {/* HERO gradient */}
        <section className="px-[18px] pt-4">
          <div
            className={['relative overflow-hidden rounded-xl px-5 py-5 bg-gradient-to-r', colors.progressClassName].join(' ')}
          >
            <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full bg-white/20 blur-3xl pointer-events-none" />
            <div className="relative">
              <p className={['text-[10px] font-extrabold uppercase tracking-[0.22em]', (colors.name === 'violet' || colors.name === 'rose') ? 'text-white/70' : 'text-black/55'].join(' ')}>
                Año {yearNumber} · {year.subjects.length} {year.subjects.length === 1 ? 'materia' : 'materias'}
              </p>
              <h1 className={['mt-2 text-2xl font-black tracking-tight leading-tight', (colors.name === 'violet' || colors.name === 'rose') ? 'text-white' : 'text-black'].join(' ')}>
                {year.nombre}
              </h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-black/20 text-white text-[11px] font-bold">
                  <Calendar size={12} strokeWidth={2.5} />
                  {eventCount} {eventCount === 1 ? 'evento' : 'eventos'}
                </span>
                <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-black/20 text-white text-[11px] font-bold">
                  <Layers size={12} strokeWidth={2.5} />
                  {year.subjects.length} {year.subjects.length === 1 ? 'materia' : 'materias'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SWITCHER */}
        <YearSwitcherPill years={allYears} currentSlug={year.slug} />

        {/* PRÓXIMOS 3 EVENTOS + CTA calendario */}
        <section className="flex flex-col gap-3">
          <div className="px-[18px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Agenda</p>
            <h2 className="mt-1 text-lg font-black text-white">Próximos eventos</h2>
          </div>
          <div className="px-[18px] flex flex-col gap-2.5">
            {nextEvents.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-dashed border-white/10 rounded-lg p-4 text-sm text-white/45 text-center">
                Por ahora no hay eventos próximos en este año.
              </div>
            ) : (
              nextEvents.map(e => (
                <Link key={e.id} href={`/materia/${e.subjectSlug}`}>
                  <AgendaCard fecha={e.fecha} tipo={e.tipo} titulo={`${e.titulo} · ${e.subjectNombre}`} />
                </Link>
              ))
            )}
          </div>

          <div className="px-[18px]">
            <Link
              href={`/year/${year.slug}/calendario`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-[#1a1a1a] border cursor-pointer hover:bg-[#1f1f1f] transition-colors"
              style={{ borderColor: colors.tone }}
            >
              <div className="flex items-center gap-3">
                <span
                  className={['flex items-center justify-center w-9 h-9 rounded-md bg-gradient-to-br', colors.badgeClassName].join(' ')}
                >
                  <Calendar size={16} strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Calendario</p>
                  <span className="text-sm font-bold text-white">Ver calendario completo</span>
                </div>
              </div>
              <ArrowRight size={18} strokeWidth={2.5} className="text-white/55" />
            </Link>
          </div>
        </section>

        {/* MATERIAS DEL AÑO */}
        <section className="flex flex-col gap-3">
          <div className="px-[18px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Materias</p>
            <h2 className="mt-1 text-lg font-black text-white">Accesos directos del año</h2>
          </div>
          <div className="px-[18px] flex flex-col gap-2.5">
            {year.subjects.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-dashed border-white/10 rounded-lg p-4 text-sm text-white/45 text-center">
                Este año todavía no tiene materias.
              </div>
            ) : (
              year.subjects.map((s, idx) => (
                <Link
                  key={s.id}
                  href={`/materia/${s.slug}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a1a] border border-white/5 cursor-pointer hover:bg-[#1f1f1f] transition-colors"
                >
                  <span
                    className={['flex items-center justify-center w-10 h-10 shrink-0 rounded-md bg-gradient-to-br text-[13px] font-black', colors.badgeClassName].join(' ')}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                      Materia {String(idx + 1).padStart(2, '0')}
                    </p>
                    <span className="block text-sm font-bold text-white leading-snug truncate">{s.nombre}</span>
                    <span className="block text-[11px] font-semibold text-white/45 mt-0.5">
                      {s.agenda?.eventos.length ?? 0} eventos
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-white/30 shrink-0" />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </MobileShell>
  )
}
