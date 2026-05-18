import Link from 'next/link'
import { BookOpen, Shield } from 'lucide-react'
import { getAdminUser } from '@/lib/auth'
import { getCareer } from '@/lib/queries'
import { getYearColorClasses } from '@/lib/yearColors'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { Sidebar } from '@/components/shell/Sidebar'
import { AnimateIn } from '@/components/ui/AnimateIn'
import { DarkCard } from '@/components/ui/DarkCard'

export const dynamic = 'force-dynamic'

function AdminBrand() {
  return (
    <Link href="/admin" className="flex items-center gap-3 text-left">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-none bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-500 text-white shadow-[0_0_30px_rgba(124,58,237,0.26)]">
        <Shield className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
          Panel interno
        </span>
        <span className="block text-lg font-black tracking-tight text-white">
          NextCampus
        </span>
      </span>
    </Link>
  )
}

export default async function AdminHubPage() {
  const admin = await getAdminUser()
  const career = admin ? await getCareer() : null

  if (!admin) {
    return (
      <DashboardShell
        brand={<AdminBrand />}
        topbar={
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Shield className="h-4 w-4" />
            Login admin
          </Link>
        }
        sidebar={
          <Sidebar
            eyebrow="Acceso"
            title="Administración"
            items={[
              {
                id: 'login',
                href: '/admin/login',
                label: 'Iniciar sesión',
                badge: <Shield className="h-4 w-4" />,
                meta: 'Acceso habilitado',
                badgeClassName: 'from-violet-400 to-purple-500 text-white',
              },
            ]}
          />
        }
      >
        <AnimateIn className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
            Acceso restringido
          </p>
          <DarkCard className="max-w-2xl p-6 sm:p-8">
            <h1 className="text-3xl font-black tracking-tight text-white">
              No autorizado.
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/62">
              Tu usuario no tiene permisos de administración. Ingresá con una
              cuenta habilitada para continuar.
            </p>
            <Link
              href="/admin/login"
              className="mt-6 inline-flex items-center gap-2 border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Shield className="h-4 w-4" />
              Ir al login
            </Link>
          </DarkCard>
        </AnimateIn>
      </DashboardShell>
    )
  }

  const sidebarItems =
    career?.years.map((year, index) => {
      const colors = getYearColorClasses(year.slug)

      return {
        id: year.id,
        href: `#year-${year.slug}`,
        label: year.nombre,
        badge: String(index + 1).padStart(2, '0'),
        meta: `${year.subjects.length} materias`,
        badgeClassName: colors.badgeClassName,
      }
    }) ?? []

  return (
    <DashboardShell
      brand={<AdminBrand />}
      topbar={
        <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/78">
          <Shield className="h-4 w-4 text-violet-300" />
          Sesión: {admin.email}
        </div>
      }
      sidebar={
        <Sidebar
          eyebrow="Administración"
          title="Años"
          items={sidebarItems}
          emptyState="Todavía no hay años cargados para administrar."
          ariaLabel="Admin sidebar navigation"
        />
      }
      mainClassName="space-y-8"
    >
      <AnimateIn className="space-y-8">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <DarkCard className="p-6 sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
              Consola interna
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Panel de administración
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
              Navegá por año desde el menú lateral y entrá a cada materia para
              editar agenda, apuntes y quiz desde un panel unificado.
            </p>
          </DarkCard>

          <DarkCard className="p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
              Resumen
            </p>
            <div className="mt-4 space-y-4 text-sm text-white/64">
              <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
                <span>Años visibles</span>
                <strong className="text-lg font-black text-white">
                  {career?.years.length ?? 0}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
                <span>Sesión activa</span>
                <strong className="truncate text-sm font-semibold text-white">
                  {admin.email}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Acceso</span>
                <span className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200">
                  <Shield className="h-3.5 w-3.5" />
                  Acceso habilitado
                </span>
              </div>
            </div>
          </DarkCard>
        </section>

        {career?.years.length ? (
          career.years.map((year, index) => (
            <section key={year.id} id={`year-${year.slug}`} className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
                    Año {String(index + 1).padStart(2, '0')}
                  </p>
                  <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {year.nombre}
                  </h2>
                </div>
                <p className="text-sm text-white/48">
                  {year.subjects.length} materias con acceso directo a edición.
                </p>
              </div>

              <div className="stagger-children grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {year.subjects.map((subject) => (
                  <Link key={subject.id} href={`/admin/materia/${subject.slug}`}>
                    <DarkCard variant="interactive" className="h-full p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
                            Materia
                          </p>
                          <h3 className="mt-2 text-xl font-black tracking-tight text-white">
                            {subject.nombre}
                          </h3>
                        </div>
                        <span className="inline-flex h-10 min-w-10 items-center justify-center border border-white/10 bg-white/5 text-white/72">
                          <BookOpen className="h-4 w-4" />
                        </span>
                      </div>

                      <div className="mt-6 flex items-center justify-between text-sm font-semibold text-white/56">
                        <span>Abrir edición</span>
                        <Shield className="h-4 w-4" />
                      </div>
                    </DarkCard>
                  </Link>
                ))}
              </div>
            </section>
          ))
        ) : (
          <DarkCard className="p-6 text-sm text-white/58">
            No hay años cargados todavía para administrar.
          </DarkCard>
        )}
      </AnimateIn>
    </DashboardShell>
  )
}
