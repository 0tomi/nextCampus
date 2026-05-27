import { SubjectRoutePage } from './SubjectRoutePage'
import { getSubjectRouteContext } from './subject-route-context'

export const revalidate = 300

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ yearSlug: string; subjectSlug: string }>
}) {
  const { yearSlug, subjectSlug } = await params
  const routeContext = await getSubjectRouteContext({
    yearSlug,
    subjectSlug,
  })

  return <SubjectRoutePage {...routeContext} />
}
