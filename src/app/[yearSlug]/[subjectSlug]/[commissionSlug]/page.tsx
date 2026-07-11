import type { Metadata } from 'next'
import { SubjectRoutePage } from '../SubjectRoutePage'
import { getSubjectRouteContext } from '../subject-route-context'
import { getContentSlugsForStaticParams } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Comisión | NextCampus',
  description: 'Consultá el calendario, apuntes y quiz de la comisión.',
}

// Pre-renderiza todas las páginas de comisión existentes en build time.
export async function generateStaticParams() {
  const years = await getContentSlugsForStaticParams()

  return years.flatMap((year) =>
    year.subjects.flatMap((subject) =>
      subject.commissions.map((commission) => ({
        yearSlug: year.slug,
        subjectSlug: subject.slug,
        commissionSlug: commission.slug,
      })),
    ),
  )
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
