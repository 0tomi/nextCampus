import type { Metadata } from 'next'
import { YearRoutePage } from './YearRoutePage'
import { getYearRouteContext } from './year-route-context'

export const metadata: Metadata = {
  title: 'Año académico | NextCampus',
  description: 'Accedé a materias, calendario y apuntes del año académico.',
}


export default async function YearPage({
  params,
}: {
  params: Promise<{ yearSlug: string }>
}) {
  const { yearSlug } = await params
  const context = await getYearRouteContext(yearSlug)

  return <YearRoutePage {...context} />
}
