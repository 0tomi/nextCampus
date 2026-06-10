import type { Metadata } from 'next'
import { SubjectRoutePage } from './SubjectRoutePage'
import { getSubjectRouteContext } from './subject-route-context'

export const metadata: Metadata = {
  title: 'Materia | NextCampus',
  description: 'Consultá el calendario, apuntes y quiz de la materia.',
}


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
