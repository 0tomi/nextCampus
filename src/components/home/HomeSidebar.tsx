'use client'

import { Sidebar, type SidebarItem } from '@/components/shell/Sidebar'
import { getYearColorClasses } from '@/lib/yearColors'
import { usePreferences } from '@/hooks/usePreferences'
import { isYearVisible, isSubjectVisible, type UserPreferences } from '@/lib/preferences'

interface HomeSidebarProps {
  careerName: string
  initialPrefs: UserPreferences | null
  years: Array<{
    id: string
    slug: string
    nombre: string
    subjects: Array<{ id: string; slug: string; nombre: string }>
  }>
}

export function HomeSidebar({ careerName, initialPrefs, years }: HomeSidebarProps) {
  const { prefs, isHydrated } = usePreferences(initialPrefs)
  const shouldWaitForStoredPrefs = !isHydrated && initialPrefs === null
  const effectivePrefs = isHydrated ? prefs : initialPrefs

  const yearsWithFilteredSubjects = years
    .map((y, i) => {
      const filteredSubjects = y.subjects.filter((s) =>
        shouldWaitForStoredPrefs ? false : isSubjectVisible(y.slug, s.slug, effectivePrefs),
      )
      return {
        ...y,
        subjects: filteredSubjects,
        originalIndex: i,
      }
    })
    .filter((y) =>
      shouldWaitForStoredPrefs ? false : isYearVisible(y.slug, effectivePrefs),
    )

  const totalVisibleSubjects = yearsWithFilteredSubjects.reduce(
    (sum, y) => sum + y.subjects.length,
    0,
  )

  const items: SidebarItem[] = []
  const isSubjectsView = totalVisibleSubjects < 10

  if (isSubjectsView) {
    yearsWithFilteredSubjects.forEach((y) => {
      if (y.subjects.length === 0) return
      
      items.push({
        id: `header-${y.id}`,
        href: '#',
        label: y.nombre,
        badge: null,
        isHeader: true,
      })

      y.subjects.forEach((subject, subjectIndex) => {
        const colors = getYearColorClasses(y.slug)
        items.push({
          id: subject.id,
          href: `/${y.slug}/${subject.slug}`,
          label: subject.nombre,
          badge: String(subjectIndex + 1),
          badgeClassName: colors.progressClassName + ' text-white',
        })
      })
    })
  } else {
    yearsWithFilteredSubjects.forEach((y) => {
      const colors = getYearColorClasses(y.slug)
      items.push({
        id: y.id,
        href: `/${y.slug}`,
        label: y.nombre,
        badge: String(y.originalIndex + 1),
        meta: `${y.subjects.length} ${y.subjects.length === 1 ? 'materia' : 'materias'}`,
        badgeClassName: colors.progressClassName + ' text-white',
      })
    })
  }

  return (
    <Sidebar
      eyebrow="CARRERA"
      title={careerName}
      secondaryEyebrow={isSubjectsView ? 'MATERIAS' : 'AÑOS ACADÉMICOS'}
      items={items}
    />
  )
}
