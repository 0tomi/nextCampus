import { getCareer } from '@/lib/queries'
import { ConfigurarForm } from './ConfigurarForm'

export const revalidate = 300

export default async function ConfigurarPage() {
  const career = await getCareer()

  if (!career) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0 px-4">
        <div className="max-w-md rounded-lg bg-surface-1 p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
            Personalización
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Todavía no hay materias para configurar
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            Cuando haya años y materias cargados, vas a poder elegir cuáles ver
            en tu inicio.
          </p>
        </div>
      </div>
    )
  }

  const years = career.years.map((year) => ({
    id: year.id,
    slug: year.slug,
    nombre: year.nombre,
    subjects: year.subjects.map((subject) => ({
      id: subject.id,
      slug: subject.slug,
      nombre: subject.nombre,
    })),
  }))

  return <ConfigurarForm careerName={career.nombre} years={years} />
}
