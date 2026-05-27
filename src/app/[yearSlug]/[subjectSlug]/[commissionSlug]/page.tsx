import { SubjectRoutePage } from '../SubjectRoutePage'
import { getSubjectRouteContext } from '../subject-route-context'

export const revalidate = 300

export default async function CommissionSubjectPage({
  params,
}: {
  params: Promise<{ yearSlug: string; subjectSlug: string; commissionSlug: string }>
}) {
  const { yearSlug, subjectSlug, commissionSlug } = await params
  const routeContext = await getSubjectRouteContext({
    yearSlug,
    subjectSlug,
    commissionSlug,
  })

  return <SubjectRoutePage {...routeContext} />
}
