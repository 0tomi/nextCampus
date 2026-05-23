'use client'

import { Sidebar } from '@/components/shell/Sidebar'
import { getYearColorClasses } from '@/lib/yearColors'
import { usePreferences } from '@/hooks/usePreferences'
import { isYearVisible } from '@/lib/preferences'

interface HomeSidebarProps {
  careerName: string
  years: Array<{
    id: string
    slug: string
    nombre: string
    subjects: Array<{ id: string }>
  }>
}

export function HomeSidebar({ careerName, years }: HomeSidebarProps) {
  const { prefs, isHydrated } = usePreferences()

  const visibleYears = !isHydrated
    ? years.map((y, i) => ({ year: y, originalIndex: i }))
    : years
        .map((y, i) => ({ year: y, originalIndex: i }))
        .filter(({ year }) => isYearVisible(year.slug, prefs))

  const items = visibleYears.map(({ year, originalIndex }) => {
    const colors = getYearColorClasses(year.slug)
    return {
      id: year.id,
      href: `/year/${year.slug}`,
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
