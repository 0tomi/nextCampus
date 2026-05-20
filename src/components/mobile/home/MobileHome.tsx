import Link from 'next/link'
import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { YearCarousel } from './YearCarousel'
import { AgendaCard } from '@/components/mobile/agenda/AgendaCard'

interface CareerForMobile {
  nombre: string
  descripcion: string | null
  years: Array<{
    id: string
    slug: string
    nombre: string
    subjects: Array<{ id: string; slug: string; nombre: string }>
  }>
}

interface UpcomingEvent {
  id: string
  titulo: string
  fecha: Date | string
  tipo: string
  subjectSlug: string
  subjectNombre: string
}

export function MobileHome({
  career,
  upcomingEvents,
}: {
  career: CareerForMobile
  upcomingEvents: UpcomingEvent[]
}) {
  const totalSubjects = career.years.reduce((acc, y) => acc + y.subjects.length, 0)
  const drawerYears: MobileShellDrawerYear[] = career.years.map((y) => ({
    slug: y.slug,
    nombre: y.nombre,
    subjectsCount: y.subjects.length,
  }))

  return (
    <MobileShell
      title="NextCampus"
      subtitle={career.nombre}
      drawerYears={drawerYears}
      careerName={career.nombre}
    >
      <div className="flex flex-col gap-7">
        {/* HERO */}
        <section className="px-[18px] pt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">CARRERA</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white leading-tight">{career.nombre}</h1>
          {career.descripcion && (
            <p className="mt-3 text-sm leading-relaxed text-white/55">{career.descripcion}</p>
          )}
        </section>

        {/* STATS — 3 cards 1fr */}
        <section className="px-[18px] grid grid-cols-3 gap-2">
          <StatTile label="Años" value={career.years.length} />
          <StatTile label="Materias" value={totalSubjects} />
          <StatTile label="Próximos" value={upcomingEvents.length} />
        </section>

        {/* CAROUSEL */}
        <section>
          <YearCarousel years={career.years} />
        </section>

        {/* PRÓXIMOS EVENTOS */}
        <section className="flex flex-col gap-3">
          <div className="px-[18px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Agenda</p>
            <h2 className="mt-1 text-lg font-black text-white">Próximos eventos</h2>
          </div>
          <div className="px-[18px] flex flex-col gap-2.5">
            {upcomingEvents.length === 0 ? (
              <EmptyAgenda />
            ) : (
              upcomingEvents.map((e) => (
                <Link key={e.id} href={`/materia/${e.subjectSlug}`}>
                  <AgendaCard
                    fecha={e.fecha}
                    tipo={e.tipo}
                    titulo={`${e.titulo} · ${e.subjectNombre}`}
                  />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </MobileShell>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-lg p-3 flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{label}</span>
      <span className="text-xl font-black text-white">{value}</span>
    </div>
  )
}

function EmptyAgenda() {
  return (
    <div className="bg-[#1a1a1a] border border-dashed border-white/10 rounded-lg p-4 text-sm text-white/45 text-center">
      Por ahora no hay eventos próximos.
    </div>
  )
}
