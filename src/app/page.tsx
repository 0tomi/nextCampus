import Link from 'next/link'
import { GraduationCap, Shield, Layers } from 'lucide-react'
import { getCareer } from '@/lib/queries'
import { getYearColorClasses } from '@/lib/yearColors'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { AnimateIn } from '@/components/ui/AnimateIn'
import { cn } from '@/lib/utils'
import { AdminControls } from '@/components/admin/AdminControls'
import {
  AddYearButton,
  YearAdminBar,
  SubjectAdminRow,
  AddSubjectButton,
} from '@/components/admin/HomeAdminOverlay'

function DashboardBrand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-left">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.2)]">
        <GraduationCap className="h-5 w-5" />
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold tracking-tight text-white">
          Campus Virtual
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
          FCYT - UADER
        </span>
      </div>
    </Link>
  )
}

export default async function HomePage() {
  const career = await getCareer()

  if (!career) {
    return (
      <DashboardShell
        brand={<DashboardBrand />}
        topbar={
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        }
        sidebar={
          <Sidebar
            eyebrow="CARRERA"
            title="Sin datos"
            secondaryEyebrow="AÑOS ACADÉMICOS"
            items={[]}
            emptyState="Todavía no hay años cargados."
          />
        }
      >
        <AnimateIn className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
            Estado inicial
          </p>
          <div className="max-w-2xl rounded-md bg-surface-1 p-6">
            <h1 className="text-3xl font-black tracking-tight text-white">
              No hay datos cargados todavía.
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/64">
              Todavía no se cargó la información de la carrera. Cuando esté
              lista, vas a ver acá los años y materias disponibles.
            </p>
          </div>
        </AnimateIn>
      </DashboardShell>
    )
  }

  const sidebarItems = career.years.map((year, index) => {
    const colors = getYearColorClasses(year.slug)

    return {
      id: year.id,
      href: `/year/${year.slug}`,
      label: year.nombre,
      badge: String(index + 1),
      meta: `${year.subjects.length} materias`,
      badgeClassName: colors.progressClassName + ' text-white',
    }
  })

  return (
    <DashboardShell
      brand={<DashboardBrand />}
      topbar={
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Shield className="h-4 w-4" />
          Admin
        </Link>
      }
      sidebar={
        <Sidebar
          eyebrow="CARRERA"
          title={career.nombre}
          secondaryEyebrow="AÑOS ACADÉMICOS"
          items={sidebarItems}
        />
      }
      mainClassName="space-y-12"
    >
      <AnimateIn className="space-y-10">
        <section className="px-1 pt-2">
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {career.nombre}
          </h1>
          <p className="mt-4 text-base font-medium text-white/50">
            {career.descripcion}
          </p>
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
              MATERIAS POR AÑO
            </p>
            <AdminControls>
              <AddYearButton />
            </AdminControls>
          </div>

          <div className="stagger-children grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            {career.years.map((year, index) => {
              const colors = getYearColorClasses(year.slug)

              return (
                <div
                  key={year.id}
                  id={`year-${year.slug}`}
                  className="flex flex-col overflow-hidden rounded bg-surface-1"
                >
                  <Link href={`/year/${year.slug}`} className="group block">
                    <div className={cn('px-5 py-4 transition-opacity group-hover:opacity-90', colors.progressClassName)}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/90">
                        Año {index + 1}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-white">
                        {year.nombre}
                      </h3>
                    </div>
                  </Link>

                  <ul className="flex flex-col">
                    {year.subjects.map((subject, subjectIndex) => (
                      <li
                        key={subject.id}
                        className={cn(
                          subjectIndex !== year.subjects.length - 1 &&
                            'border-b border-white/5',
                        )}
                      >
                        <Link
                          href={`/materia/${subject.slug}`}
                          className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/5"
                        >
                          <Layers className="h-[14px] w-[14px] shrink-0 text-white/20 transition-colors group-hover:text-white/40" />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/60 transition-colors group-hover:text-white">
                            {subject.nombre}
                          </span>
                          <AdminControls>
                            <SubjectAdminRow
                              subject={{
                                id: subject.id,
                                slug: subject.slug,
                                nombre: subject.nombre,
                                descripcion: subject.descripcion,
                                driveUrl: subject.driveUrl,
                              }}
                              yearId={year.id}
                            />
                          </AdminControls>
                        </Link>
                      </li>
                    ))}
                    <AdminControls>
                      <li>
                        <AddSubjectButton yearId={year.id} />
                      </li>
                    </AdminControls>
                  </ul>

                  <AdminControls>
                    <YearAdminBar
                      year={{
                        id: year.id,
                        slug: year.slug,
                        nombre: year.nombre,
                        orden: index + 1,
                        subjects: year.subjects.map((s) => ({
                          id: s.id,
                          slug: s.slug,
                          nombre: s.nombre,
                        })),
                      }}
                    />
                  </AdminControls>
                </div>
              )
            })}
          </div>
        </section>
      </AnimateIn>
    </DashboardShell>
  )
}
