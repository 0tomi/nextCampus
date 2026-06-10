import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSubjectQuizMeta, getUserNamesByAccountId } from '@/lib/queries'
import { listQuizBanks, readQuizBanks } from '@/lib/storage'
import { CampusHeaderBrand } from '@/components/shell/CampusHeaderBrand'
import {
  buildSubjectHref,
  buildSubjectQuizHref,
} from '@/components/mobile/shared/subjectRoutes'
import { QuizRunner } from './QuizRunner'

export const metadata: Metadata = {
  title: 'Quiz | NextCampus',
  description: 'Practicá preguntas por unidad para preparar la materia.',
}


export default async function QuizPage({
  params,
}: {
  params: Promise<{ yearSlug: string; subjectSlug: string }>
}) {
  const { yearSlug, subjectSlug } = await params
  const subject = await getSubjectQuizMeta(subjectSlug)
  if (!subject) notFound()

  const canonicalQuizHref = buildSubjectQuizHref({
    yearSlug: subject.year.slug,
    subjectSlug: subject.slug,
  })

  if (subject.year.slug !== yearSlug) {
    redirect(canonicalQuizHref)
  }

  const banks = await listQuizBanks(subject.year.slug, subject.slug)
  const loadedBanks = await readQuizBanks(
    subject.year.slug,
    subject.slug,
    banks.map((b) => b.id),
  )
  const nombrePorId = await getUserNamesByAccountId(banks.map((b) => b.subidoPorId))

  const bancos = banks.map((b) => {
    const file = loadedBanks.get(b.id)
    const unidades = file
      ? file.units.map((u) => ({
          nombre: u.name,
          totalPreguntas: u.questions.length,
        }))
      : []
    return {
      id: b.id,
      nombre: b.nombre,
      totalPreguntas: b.totalPreguntas,
      unidades,
      subidoPorId: b.subidoPorId ?? null,
      subidoPorNombre: b.subidoPorId ? nombrePorId.get(b.subidoPorId) ?? null : null,
    }
  })

  return (
    <div className="min-h-screen bg-surface-0">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-surface-1/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6">
          <CampusHeaderBrand />
          <Link
            href={buildSubjectHref({
              yearSlug: subject.year.slug,
              subjectSlug: subject.slug,
            })}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/56 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            {subject.nombre}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <QuizRunner
          subjectSlug={subject.slug}
          subjectNombre={subject.nombre}
          bancos={bancos}
          yearId={subject.year.id}
        />
      </main>
    </div>
  )
}
