import type { Metadata } from 'next'
import { YearRoutePage } from './YearRoutePage'
import { getYearRouteContext } from './year-route-context'
import { getContentSlugsForStaticParams } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Año académico | NextCampus',
  description: 'Accedé a materias, calendario y apuntes del año académico.',
}

// Pre-renderiza todas las páginas de año existentes en build time.
export async function generateStaticParams() {
  const years = await getContentSlugsForStaticParams()

  return years.map((year) => ({ yearSlug: year.slug }))
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
