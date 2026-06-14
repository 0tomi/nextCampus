import { isSubjectVisible, isYearVisible, type UserPreferences } from '@/lib/preferences'
import type { SubjectLinkDTO } from '@/lib/subjectLinks'
import type { YearLinkDTO } from '@/components/year/YearResourceLinks'

export type HomeGridSubject = {
  id: string
  slug: string
  nombre: string
  descripcion: string | null
  links: SubjectLinkDTO[]
}

export type HomeGridYear = {
  id: string
  slug: string
  nombre: string
  descripcion?: string | null
  links: YearLinkDTO[]
  color?: string | null
  subjects: HomeGridSubject[]
}

export type HomeGridDisplayedYear = {
  year: HomeGridYear
  originalIndex: number
  isHiddenByPrefs: boolean
}

interface GetHomeYearsForDisplayParams {
  years: HomeGridYear[]
  prefs: UserPreferences | null
  isAdmin: boolean
  showHiddenYears: boolean
}

export function getHomeYearsForDisplay({
  years,
  prefs,
  isAdmin,
  showHiddenYears,
}: GetHomeYearsForDisplayParams): HomeGridDisplayedYear[] {
  return years.reduce<HomeGridDisplayedYear[]>((acc, year, originalIndex) => {
    const isHiddenByPrefs = !isYearVisible(year.slug, prefs)
    const shouldIncludeYear = !isHiddenByPrefs || (isAdmin && showHiddenYears)

    if (!shouldIncludeYear) return acc

    const subjects = year.subjects.filter((subject) => {
      // Cuando el admin revela un año oculto mostramos todas sus materias:
      // ocultar el año marca todas sus materias como ocultas, así que
      // filtrar por ese mismo estado dejaría el año revelado sin contenido.
      if (isHiddenByPrefs && isAdmin && showHiddenYears) {
        return true
      }

      return isSubjectVisible(year.slug, subject.slug, prefs)
    })

    acc.push({
      year: {
        ...year,
        subjects,
      },
      originalIndex,
      isHiddenByPrefs,
    })

    return acc
  }, [])
}
