import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { MobileShell, type MobileShellDrawerYear } from '@/components/mobile/shell/MobileShell'
import { HomeSidebar } from '@/components/home/HomeSidebar'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import {
  ApunteSearchPanel,
  type ApunteSearchViewModel,
} from '@/components/search/ApunteSearchResults'
import { getCareer } from '@/lib/queries'
import { PREFERENCES_KEY, readPreferencesFromCookie } from '@/lib/preferences'
import { apunteSearchQuerySchema, searchApuntes } from '@/lib/domain/apunte-search'

export const metadata: Metadata = {
  title: 'Buscar apuntes | NextCampus',
  description: 'Encontrá apuntes por tema, materia o año.',
}

type SearchPageProps = {
  searchParams: Promise<{ q?: string | string[] }>
}

function readQuery(raw: string | string[] | undefined) {
  return (Array.isArray(raw) ? raw[0] : raw ?? '').trim()
}

async function buildSearchModel(query: string): Promise<ApunteSearchViewModel> {
  if (!query) return { query, status: 'initial', items: [] }
  if (query.length < 2) return { query, status: 'too-short', items: [] }
  if (query.length > 120) return { query, status: 'too-long', items: [] }

  const parsed = apunteSearchQuerySchema.safeParse({ q: query })
  if (!parsed.success) return { query, status: 'too-short', items: [] }

  try {
    const items = await searchApuntes(parsed.data)
    return {
      query: parsed.data.q,
      status: items.length > 0 ? 'results' : 'empty',
      items,
    }
  } catch {
    return { query, status: 'error', items: [] }
  }
}

export default async function BuscarPage({ searchParams }: SearchPageProps) {
  const [{ q }, cookieStore, career] = await Promise.all([
    searchParams,
    cookies(),
    getCareer(),
  ])
  const query = readQuery(q)
  const model = await buildSearchModel(query)
  const initialPrefs = readPreferencesFromCookie(
    cookieStore.get(PREFERENCES_KEY)?.value ?? null,
  )
  const drawerYears = buildDrawerYears(career)

  return (
    <>
      <div className="hidden lg:block">
        <DashboardShell
          sidebar={
            career ? (
              <HomeSidebar careerName={career.nombre} initialPrefs={initialPrefs} years={career.years} />
            ) : (
              <Sidebar
                eyebrow="CARRERA"
                title="Sin datos"
                secondaryEyebrow="AÑOS ACADÉMICOS"
                items={[]}
                emptyState="Todavía no hay años cargados."
              />
            )
          }
          mainClassName="space-y-8"
        >
          <ApunteSearchPanel model={model} />
        </DashboardShell>
      </div>

      <div className="lg:hidden">
        <MobileShell
          title="Buscar apuntes"
          subtitle={career?.nombre ?? 'NextCampus'}
          drawerYears={drawerYears}
          careerName={career?.nombre ?? ''}
        >
          <ApunteSearchPanel model={model} />
        </MobileShell>
      </div>
    </>
  )
}

function buildDrawerYears(career: Awaited<ReturnType<typeof getCareer>>): MobileShellDrawerYear[] {
  return (career?.years ?? []).map((year) => ({
    slug: year.slug,
    nombre: year.nombre,
    color: year.color,
    subjectsCount: year.subjects.length,
    orden: year.orden,
    subjects: year.subjects.map((subject) => ({
      id: subject.id,
      slug: subject.slug,
      nombre: subject.nombre,
    })),
  }))
}
