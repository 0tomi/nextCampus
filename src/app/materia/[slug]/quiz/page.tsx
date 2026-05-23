import { notFound, redirect } from 'next/navigation'
import { getSubjectQuizMeta } from '@/lib/queries'
import { buildSubjectQuizHref } from '@/components/mobile/shared/subjectRoutes'

export const revalidate = 3600

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const subject = await getSubjectQuizMeta(slug)

  if (!subject) notFound()

  redirect(
    buildSubjectQuizHref({
      yearSlug: subject.year.slug,
      subjectSlug: subject.slug,
    }),
  )
}
