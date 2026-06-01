import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSubjectQuizMeta } from '@/lib/queries'
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

export const revalidate = 3600

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
    }
  })

  return (
    <div className="min-h-screen bg-surface-0">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-surface-1/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
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
          subjectSlug={subject.slug}
          bancos={bancos}
          yearId={subject.year.id}
        />
      </main>
    </div>
  )
}
