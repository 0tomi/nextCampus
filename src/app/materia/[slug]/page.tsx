import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSubjectPageBySlug } from '@/lib/queries'
import { ConstructivistCard } from '@/components/shared/ConstructivistCard'
import { formatDate } from '@/lib/utils'

export const revalidate = 300

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const subject = await getSubjectPageBySlug(slug)
  if (!subject) notFound()

  const eventos = subject.agenda?.eventos ?? []

  return (
    <div className="space-y-8">
      <nav className="text-sm text-ink/60">
        <Link href="/" className="hover:underline">
          {subject.year.career.nombre}
        </Link>{' '}
        /{' '}
        <Link
          href={`/year/${subject.year.slug}`}
          className="hover:underline"
        >
          {subject.year.nombre}
        </Link>{' '}
        / <span className="font-semibold">{subject.nombre}</span>
      </nav>

      <h1 className="font-display text-3xl font-extrabold">
        {subject.nombre}
      </h1>

      {/* Calendario por materia */}
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">Calendario</h2>
        {eventos.length === 0 ? (
          <p className="text-ink/60">Sin eventos cargados.</p>
        ) : (
          <ul className="space-y-3">
            {eventos.map((evento) => (
              <ConstructivistCard key={evento.id} className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold">{evento.titulo}</span>
                  <span className="text-xs uppercase text-primary">
                    {evento.tipoEvento.nombre}
                  </span>
                </div>
                <p className="text-sm text-ink/60">
                  {formatDate(evento.fecha)}
                </p>
                {evento.descripcionHtml && (
                  <div
                    className="prose-sm mt-2"
                    // Contenido YA sanitizado al persistir (lib/sanitize).
                    dangerouslySetInnerHTML={{
                      __html: evento.descripcionHtml,
                    }}
                  />
                )}
              </ConstructivistCard>
            ))}
          </ul>
        )}
      </section>

      {/* Quiz por materia */}
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">Quiz</h2>
        {subject.quizUnidades.length === 0 ? (
          <p className="text-ink/60">Sin unidades de quiz.</p>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2">
              {subject.quizUnidades.map((unidad) => (
                <ConstructivistCard key={unidad.id} className="p-4">
                  <p className="font-bold">{unidad.titulo}</p>
                  <p className="text-sm text-ink/60">
                    {unidad._count.preguntas} preguntas
                  </p>
                </ConstructivistCard>
              ))}
            </ul>
            <Link
              href={`/materia/${subject.slug}/quiz`}
              className="inline-block border-4 border-ink bg-primary px-4 py-2 font-bold text-paper shadow-hard-sm"
            >
              Empezar quiz
            </Link>
          </>
        )}
      </section>

      {/* Apuntes */}
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">Apuntes</h2>
        {subject.apuntes.length === 0 ? (
          <p className="text-ink/60">Sin apuntes.</p>
        ) : (
          <ul className="space-y-3">
            {subject.apuntes.map((apunte) => (
              <ConstructivistCard key={apunte.id} className="p-4">
                <p className="font-bold">{apunte.titulo}</p>
                {apunte.descripcionHtml && (
                  <div
                    className="prose-sm mt-1"
                    dangerouslySetInnerHTML={{
                      __html: apunte.descripcionHtml,
                    }}
                  />
                )}
                {apunte.pdfObjectKey && (
                  <a
                    href={`/api/apuntes/${apunte.id}/pdf`}
                    className="mt-2 inline-block text-sm font-semibold text-accent hover:underline"
                  >
                    Descargar PDF
                  </a>
                )}
              </ConstructivistCard>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
