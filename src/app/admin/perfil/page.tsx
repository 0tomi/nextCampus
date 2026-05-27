import { prisma } from '@/lib/prisma'
import { requireAnyAdmin } from '@/lib/auth'
import { ProfileForm } from './ProfileForm'
import { updateAdminEmailAction, updateAdminPasswordAction } from './actions'

export const dynamic = 'force-dynamic'

export function roleLabel(role: string) {
  return role === 'ADMIN_CAMPUS' ? 'Administrador de campus' : 'Administrador general'
}

export function buildAssignedYearsSummary(yearNames: string[], canManageAllYears: boolean) {
  if (canManageAllYears) return 'Acceso a todos los años'
  if (yearNames.length === 0) return 'Sin años asignados'
  if (yearNames.length === 1) return `1 año asignado: ${yearNames[0]}`
  if (yearNames.length === 2) return `2 años asignados: ${yearNames[0]} y ${yearNames[1]}`

  return `${yearNames.length} años asignados: ${yearNames[0]}, ${yearNames[1]} y ${yearNames.length - 2} más`
}

export default async function AdminProfilePage() {
  const admin = await requireAnyAdmin()

  const years = admin.canManageAllYears
    ? []
    : await prisma.academicYear.findMany({
        where: { id: { in: admin.yearIds } },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        select: { id: true, nombre: true },
      })

  const yearNames = years.map((year) => year.nombre)
  const assignedYearsSummary = buildAssignedYearsSummary(yearNames, admin.canManageAllYears)

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-200/70">Mi perfil</p>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white">Tu cuenta de administración</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
          Revisá tus datos y actualizalos cuando lo necesites, sin salir del panel.
        </p>
      </div>

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-black/20 px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Correo actual</p>
            <p className="mt-2 text-sm font-semibold text-white">{admin.email}</p>
          </div>

          <div className="rounded-md border border-white/10 bg-black/20 px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Rol</p>
            <p className="mt-2 text-sm font-semibold text-white">{roleLabel(admin.role)}</p>
          </div>

          <div className="rounded-md border border-white/10 bg-black/20 px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Años asignados</p>
            <p className="mt-2 text-sm font-semibold text-white">{assignedYearsSummary}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Detalle</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {admin.canManageAllYears ? (
              <span className="inline-flex rounded-full border border-violet-300/25 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-100">
                Todos los años
              </span>
            ) : yearNames.length > 0 ? (
              yearNames.map((yearName) => (
                <span
                  key={yearName}
                  className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/75"
                >
                  {yearName}
                </span>
              ))
            ) : (
              <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/60">
                Sin años definidos todavía
              </span>
            )}
          </div>
        </div>
      </section>

      <ProfileForm
        currentEmail={admin.email}
        updateEmailAction={updateAdminEmailAction}
        updatePasswordAction={updateAdminPasswordAction}
      />
    </div>
  )
}
