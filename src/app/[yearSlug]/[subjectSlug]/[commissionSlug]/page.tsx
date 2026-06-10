import type { Metadata } from 'next'
import { SubjectRoutePage } from '../SubjectRoutePage'
import { getSubjectRouteContext } from '../subject-route-context'

export const metadata: Metadata = {
  title: 'Comisión | NextCampus',
  description: 'Consultá el calendario, apuntes y quiz de la comisión.',
}


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
