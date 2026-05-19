import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getSubjectQuizMeta } from '@/lib/queries'
import { listQuizBanks } from '@/lib/storage'
import { QuizRunner } from './QuizRunner'

export const dynamic = 'force-dynamic'

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
    <div className="space-y-8 text-white">
      <div>
        <Link
          href={`/materia/${slug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/58 transition-colors hover:text-white/82"
        >
          <ArrowLeft className="h-4 w-4" />
          {subject.nombre}
        </Link>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
          Modo estudio
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Quiz · {subject.nombre}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58">
          Elegí uno o varios bancos de preguntas, configurá tu práctica y
          poné a prueba lo que sabés.
        </p>
      </div>

      <QuizRunner subjectSlug={slug} bancos={bancos} />
    </div>
  )
}
