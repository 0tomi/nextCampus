interface SubjectRouteOptions {
  yearSlug?: string | null
  subjectSlug: string
  commissionSlug?: string | null
}

export function buildSubjectHref({
  yearSlug,
  subjectSlug,
  commissionSlug,
}: SubjectRouteOptions) {
  if (!yearSlug) {
    return `/materia/${subjectSlug}`
  }

  const baseHref = `/year/${yearSlug}/${subjectSlug}`

  return commissionSlug ? `${baseHref}/${commissionSlug}` : baseHref
}

export function buildSubjectQuizHref({ yearSlug, subjectSlug }: SubjectRouteOptions) {
  if (!yearSlug) {
    return `/materia/${subjectSlug}/quiz`
  }

  return `/year/${yearSlug}/${subjectSlug}/quiz`
}
