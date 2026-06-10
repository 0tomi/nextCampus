import Link from 'next/link'
import { notFound } from 'next/navigation'
import { UserRole } from '../../../../../../prisma/generated/client/enums'
import { prisma } from '@/lib/prisma'
import { requireGeneralAdmin } from '@/lib/auth'
import { AdminUserForm } from '../../UserForm'
import { updateAdminCampusAction } from '../../actions'


interface EditAdminUserPageProps {
  params: Promise<{ id: string }>
}

export default async function EditAdminUserPage({ params }: EditAdminUserPageProps) {
  const [, { id }] = await Promise.all([requireGeneralAdmin(), params])

  const [years, user] = await Promise.all([
    prisma.academicYear.findMany({
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: { id: true, nombre: true },
    }),
    prisma.userAccount.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nombreUsuario: true,
        role: true,
        status: true,
        yearPermissions: { select: { yearId: true } },
      },
    }),
  ])

  if (!user || user.role === UserRole.ADMIN) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-8">
        <Link href="/admin/users" className="cursor-pointer text-sm font-semibold text-violet-200 transition hover:text-violet-100">
          ← Volver a usuarios
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-violet-200/70">Editar usuario</p>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white">Actualizar colaborador</h1>
        <p className="mt-2 text-sm leading-6 text-white/55">
          Modificá sus datos, años asignados o estado de acceso.
        </p>
      </div>

      <AdminUserForm
        mode="edit"
        years={years}
        action={updateAdminCampusAction}
        user={{
          id: user.id,
          email: user.email,
          nombreUsuario: user.nombreUsuario,
          role: user.role,
          status: user.status,
          yearIds: user.yearPermissions.map((permission) => permission.yearId),
        }}
      />
    </div>
  )
}
