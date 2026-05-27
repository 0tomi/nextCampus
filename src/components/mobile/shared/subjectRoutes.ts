interface SubjectRouteOptions {
  yearSlug: string
  subjectSlug: string
  commissionSlug?: string | null
}

export function buildSubjectHref({
  yearSlug,
  subjectSlug,
  commissionSlug,
}: SubjectRouteOptions) {
  const baseHref = `/${yearSlug}/${subjectSlug}`

  return commissionSlug ? `${baseHref}/${commissionSlug}` : baseHref
}

export function buildSubjectQuizHref({ yearSlug, subjectSlug }: SubjectRouteOptions) {
  return `/${yearSlug}/${subjectSlug}/quiz`
}
