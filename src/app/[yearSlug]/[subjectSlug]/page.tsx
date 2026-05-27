import { SubjectRoutePage } from './SubjectRoutePage'
import { getSubjectRouteContext } from './subject-route-context'

export const revalidate = 300

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ slug: string; subjectSlug: string }>
}) {
  const { slug, subjectSlug } = await params
  const routeContext = await getSubjectRouteContext({
    yearSlug: slug,
    subjectSlug,
  })

  return <SubjectRoutePage {...routeContext} />
}
