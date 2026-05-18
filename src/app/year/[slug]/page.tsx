import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getYearBySlug } from '@/lib/queries'
import { ConstructivistCard } from '@/components/shared/ConstructivistCard'

export const revalidate = 300

export default async function YearPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const year = await getYearBySlug(slug)
  if (!year) notFound()

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink/60">
        <Link href="/" className="hover:underline">
          {year.career.nombre}
        </Link>{' '}
        / <span className="font-semibold">{year.nombre}</span>
      </nav>

      <h1 className="font-display text-3xl font-extrabold">{year.nombre}</h1>

      <section className="grid gap-4 sm:grid-cols-2">
        {year.subjects.map((subject) => (
          <Link key={subject.id} href={`/materia/${subject.slug}`}>
            <ConstructivistCard className="transition hover:-translate-y-1">
              <h2 className="font-display text-xl font-bold">
                {subject.nombre}
              </h2>
            </ConstructivistCard>
          </Link>
        ))}
      </section>
    </div>
  )
}
