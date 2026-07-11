import type { Metadata } from 'next'
import { SubjectRoutePage } from './SubjectRoutePage'
import { getSubjectRouteContext } from './subject-route-context'
import { getContentSlugsForStaticParams } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Materia | NextCampus',
  description: 'Consultá el calendario, apuntes y quiz de la materia.',
}

// Pre-renderiza todas las páginas de materia existentes en build time.
export async function generateStaticParams() {
  const years = await getContentSlugsForStaticParams()

  return years.flatMap((year) =>
    year.subjects.map((subject) => ({
      yearSlug: year.slug,
      subjectSlug: subject.slug,
    })),
  )
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
