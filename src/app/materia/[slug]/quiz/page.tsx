import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getSubjectQuizMeta } from '@/lib/queries'
import { listQuizBanks } from '@/lib/storage'
import { QuizRunner } from './QuizRunner'

// Datos cacheados por tag (subject:{slug} y quiz-banks:{year}:{subject}).
// Las server actions de uploadQuizBank/deleteQuizBank disparan revalidateTag,
// así que la página se mantiene fresca sin force-dynamic.
export const revalidate = 3600

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const subject = await getSubjectQuizMeta(slug)
  if (!subject) notFound()

  const banks = await listQuizBanks(subject.year.slug, subject.slug)
  const bancos = banks.map((b) => ({
    id: b.id,
    nombre: b.nombre,
    totalPreguntas: b.totalPreguntas,
  }))

  return (
    <div className="min-h-screen bg-surface-0">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-surface-1/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-6">
          <Link
            href={`/materia/${slug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/56 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {subject.nombre}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/36">
            Modo estudio
          </p>
          <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-white">
            Quiz · {subject.nombre}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/52">
            Elegí uno o varios bancos de preguntas, configurá tu práctica y
            poné a prueba lo que sabés.
          </p>
        </div>

        <QuizRunner
          subjectSlug={slug}
          bancos={bancos}
          yearId={subject.year.id}
          yearSlug={subject.year.slug}
        />
      </main>
    </div>
  )
}
