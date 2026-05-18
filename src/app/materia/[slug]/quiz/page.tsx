import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSubjectBySlug } from '@/lib/queries'
import { QuizRunner } from './QuizRunner'

export const dynamic = 'force-dynamic'

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const subject = await getSubjectBySlug(slug)
  if (!subject) notFound()

  const unidades = subject.quizUnidades.map((u) => ({
    id: u.id,
    titulo: u.titulo,
    preguntas: u._count.preguntas,
  }))

  return (
    <div className="space-y-6">
      <Link
        href={`/materia/${slug}`}
        className="text-sm text-accent hover:underline"
      >
        ← {subject.nombre}
      </Link>
      <h1 className="font-display text-3xl font-extrabold">
        Quiz · {subject.nombre}
      </h1>
      <QuizRunner subjectSlug={slug} unidades={unidades} />
    </div>
  )
}
