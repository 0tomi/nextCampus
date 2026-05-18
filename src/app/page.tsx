import Link from 'next/link'
import { getCareer } from '@/lib/queries'
import { ConstructivistCard } from '@/components/shared/ConstructivistCard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const career = await getCareer()

  if (!career) {
    return (
      <ConstructivistCard>
        <p className="font-semibold">
          No hay datos cargados todavía. Corré{' '}
          <code className="bg-ink/10 px-1">pnpm db:migrate</code> y{' '}
          <code className="bg-ink/10 px-1">pnpm db:seed</code>.
        </p>
      </ConstructivistCard>
    )
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-4xl font-extrabold">
          {career.nombre}
        </h1>
        <p className="mt-2 text-ink/70">{career.descripcion}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {career.years.map((year) => (
          <Link key={year.id} href={`/year/${year.slug}`}>
            <ConstructivistCard className="transition hover:-translate-y-1">
              <h2 className="font-display text-2xl font-bold">
                {year.nombre}
              </h2>
              <p className="mt-1 text-sm text-ink/60">
                {year.subjects.length} materias
              </p>
            </ConstructivistCard>
          </Link>
        ))}
      </section>
    </div>
  )
}
