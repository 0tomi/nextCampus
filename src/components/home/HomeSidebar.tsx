'use client'

import { Sidebar } from '@/components/shell/Sidebar'
import { getYearColorClasses } from '@/lib/yearColors'
import { usePreferences } from '@/hooks/usePreferences'
import { isYearVisible, type UserPreferences } from '@/lib/preferences'

interface HomeSidebarProps {
  careerName: string
  initialPrefs: UserPreferences | null
  years: Array<{
    id: string
    slug: string
    nombre: string
    subjects: Array<{ id: string }>
  }>
}

export function HomeSidebar({ careerName, initialPrefs, years }: HomeSidebarProps) {
  const { prefs, isHydrated } = usePreferences(initialPrefs)
  const shouldWaitForStoredPrefs = !isHydrated && initialPrefs === null
  const effectivePrefs = isHydrated ? prefs : initialPrefs

  const visibleYears = years
    .map((y, i) => ({ year: y, originalIndex: i }))
    .filter(({ year }) =>
      shouldWaitForStoredPrefs ? false : isYearVisible(year.slug, effectivePrefs),
    )

  const items = visibleYears.map(({ year, originalIndex }) => {
    const colors = getYearColorClasses(year.slug)
    return {
      id: year.id,
      href: `/${year.slug}`,
      label: year.nombre,
      badge: String(originalIndex + 1),
      meta: `${year.subjects.length} materias`,
      badgeClassName: colors.progressClassName + ' text-white',
    }
  })

  return (
    <Sidebar
      eyebrow="CARRERA"
      title={careerName}
      secondaryEyebrow="AÑOS ACADÉMICOS"
      items={items}
    />
  )
}
