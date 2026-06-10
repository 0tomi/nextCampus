import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { ApunteRecursoView } from '@/components/apuntes/ApunteRecursoView'
import { CopyApunteLinkButton } from '@/components/apuntes/CopyApunteLinkButton'
import { DarkCard } from '@/components/ui/DarkCard'
import { getApuntePageBySlug } from '@/lib/queries'
import { SafeHtml } from '@/components/ui/SafeHtml'
import { UploaderByline } from '@/components/ui/UploaderByline'


type ApuntePageParams = {
  yearSlug: string
  subjectSlug: string
  apunteSlug: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ApuntePageParams>
}): Promise<Metadata> {
  const { subjectSlug, apunteSlug } = await params
  const page = await getApuntePageBySlug(subjectSlug, apunteSlug)

  if (!page) {
    return { title: 'Apunte no encontrado' }
  }

  return {
    title: `${page.apunte.titulo} | ${page.subject.nombre}`,
    description: `Material de estudio de ${page.subject.nombre}.`,
  }
}

export default async function ApuntePage({
  params,
}: {
  params: Promise<ApuntePageParams>
}) {
  const { yearSlug, subjectSlug, apunteSlug } = await params
  const page = await getApuntePageBySlug(subjectSlug, apunteSlug)

  if (!page) notFound()

  const { subject, apunte } = page

  if (subject.year.slug !== yearSlug) {
    redirect(`/${subject.year.slug}/${subject.slug}/apuntes/${apunte.slug}`)
  }

  const subjectHref = `/${subject.year.slug}/${subject.slug}`

  return (
    <main className="min-h-screen bg-[#101010] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:p-8">
        <header className="flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href={subjectHref}
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-white/55 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Volver a la materia
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              <span className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-white/65">
                <BookOpen className="size-3.5" />
                {subject.nombre}
              </span>
              <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-white/50">
                {subject.year.nombre}
              </span>
              <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-white/50">
                {subject.year.career.nombre}
              </span>
            </div>
          </div>

          <CopyApunteLinkButton
            yearSlug={subject.year.slug}
            subjectSlug={subject.slug}
            apunteSlug={apunte.slug}
            className="self-start sm:self-center"
          />
        </header>

        <article className="flex-1 py-6 lg:py-8">
          <section className="min-w-0 space-y-5">
            <DarkCard className="rounded-xl p-5 sm:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
                Material de estudio
              </p>
              <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                {apunte.titulo}
              </h1>
              {apunte.categorias.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {apunte.categorias.map((categoria) => (
                    <span
                      key={categoria.id}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50"
                    >
                      {categoria.nombre}
                    </span>
                  ))}
                </div>
              ) : null}

              {apunte.createdByNombre ? (
                <UploaderByline nombre={apunte.createdByNombre} className="mt-4" />
              ) : null}

              {apunte.descripcionHtml ? (
                <SafeHtml
                  className="mt-5 space-y-3 text-base leading-7 text-white/66 [&_a]:text-white [&_a]:underline [&_p]:m-0 [&_strong]:text-white"
                  html={apunte.descripcionHtml}
                />
              ) : null}
            </DarkCard>

            {apunte.recursos.length > 0 ? (
              <div className="space-y-4">
                {apunte.recursos.map((recurso) => (
                  <ApunteRecursoView key={recurso.id} recurso={recurso} variant="wide" />
                ))}
              </div>
            ) : null}
          </section>
        </article>
      </div>
    </main>
  )
}
