import { notFound, redirect } from 'next/navigation'
import { getSubjectPageBySlug } from '@/lib/queries'
import { buildSubjectHref } from '@/components/mobile/shared/subjectRoutes'

export const revalidate = 300

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const subject = await getSubjectPageBySlug(slug)

  if (!subject) notFound()

  redirect(
    buildSubjectHref({
      yearSlug: subject.year.slug,
      subjectSlug: subject.slug,
    }),
  )
}
