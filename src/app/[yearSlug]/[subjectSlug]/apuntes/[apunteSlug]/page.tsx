import { notFound } from 'next/navigation'
import { SubjectRoutePage } from '../../SubjectRoutePage'
import { getSubjectRouteContext } from '../../subject-route-context'

export const revalidate = 300

export default async function ApuntePage({
  params,
}: {
  params: Promise<{ yearSlug: string; subjectSlug: string; apunteSlug: string }>
}) {
  const { yearSlug, subjectSlug, apunteSlug } = await params
  const routeContext = await getSubjectRouteContext({
    yearSlug,
    subjectSlug,
  })

  const exists = routeContext.subject.apuntes.some(
    (a) => a.slug === apunteSlug,
  )
  if (!exists) notFound()

  return <SubjectRoutePage {...routeContext} focusApunteSlug={apunteSlug} />
}
