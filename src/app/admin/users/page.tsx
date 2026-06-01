import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import { UserRole, UserStatus } from '../../../../prisma/generated/client/enums'
import { prisma } from '@/lib/prisma'
import { requireGeneralAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function roleLabel(role: string) {
  if (role === UserRole.SUPERVISOR) return 'Supervisor'
  if (role === UserRole.AYUDANTE) return 'Ayudante'
  return 'Admin'
}

function statusLabel(status: string) {
  return status === UserStatus.ACTIVE ? 'Activo' : 'Desactivado'
}

export default async function AdminUsersPage() {
  await requireGeneralAdmin()

  const users = await prisma.userAccount.findMany({
    where: { role: { in: [UserRole.AYUDANTE, UserRole.SUPERVISOR] } },
    orderBy: { email: 'asc' },
    include: {
      yearPermissions: {
        include: { year: { select: { id: true, nombre: true, orden: true } } },
        orderBy: { year: { orden: 'asc' } },
      },
    },
  })

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-200/70">Administradores</p>
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white">Usuarios del campus</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            Gestioná quiénes pueden colaborar y en qué años académicos.
          </p>
        </div>
        <Link
          href="/admin/users/create"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-400"
        >
          <Plus className="size-4" />
          Crear usuario
        </Link>
      </div>

      <section className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
        <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white/38">
          <span className="col-span-12 md:col-span-4">Usuario</span>
          <span className="hidden md:col-span-2 md:block">Rol</span>
          <span className="hidden md:col-span-2 md:block">Estado</span>
          <span className="hidden md:col-span-3 md:block">Años</span>
          <span className="hidden md:col-span-1 md:block text-right">Acción</span>
        </div>

        {users.length > 0 ? (
          <ul className="divide-y divide-white/10">
            {users.map((user) => {
              const years = user.yearPermissions.map((permission) => permission.year.nombre)
              return (
                <li key={user.id} className="grid grid-cols-12 gap-3 p-4 text-sm text-white/70">
                  <div className="col-span-12 md:col-span-4">
                    <p className="font-semibold text-white">{user.nombreUsuario}</p>
                    <p className="text-xs text-white/55">{user.email}</p>
                    <p className="mt-1 md:hidden">{roleLabel(user.role)} · {statusLabel(user.status)}</p>
                  </div>
                  <div className="hidden md:col-span-2 md:block">{roleLabel(user.role)}</div>
                  <div className="hidden md:col-span-2 md:block">
                    <span className={user.status === UserStatus.ACTIVE ? 'text-emerald-300' : 'text-amber-200'}>
                      {statusLabel(user.status)}
                    </span>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    {years.length > 0 ? years.join(', ') : 'Sin años asignados'}
                  </div>
                  <div className="col-span-12 md:col-span-1 md:text-right">
                    <Link
                      href={`/admin/users/edit/${user.id}`}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-white/55">
            Todavía no hay colaboradores creados.
          </div>
        )}
      </section>
    </div>
  )
}
