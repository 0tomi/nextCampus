import { SubjectRoutePage } from '../SubjectRoutePage'
import { getSubjectRouteContext } from '../subject-route-context'

export const revalidate = 300

export default async function CommissionSubjectPage({
  params,
}: {
  params: Promise<{ slug: string; subjectSlug: string; commissionSlug: string }>
}) {
  const { slug, subjectSlug, commissionSlug } = await params
  const routeContext = await getSubjectRouteContext({
    yearSlug: slug,
    subjectSlug,
    commissionSlug,
  })

  return <SubjectRoutePage {...routeContext} />
}
