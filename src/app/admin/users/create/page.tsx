import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireGeneralAdmin } from '@/lib/auth'
import { AdminUserForm } from '../UserForm'
import { createAdminCampusAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function CreateAdminUserPage() {
  await requireGeneralAdmin()

  const years = await prisma.academicYear.findMany({
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    select: { id: true, nombre: true },
  })

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-8">
        <Link href="/admin/users" className="cursor-pointer text-sm font-semibold text-violet-200 transition hover:text-violet-100">
          ← Volver a usuarios
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-violet-200/70">Nuevo usuario</p>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white">Crear ayudante</h1>
        <p className="mt-2 text-sm leading-6 text-white/55">
          Cargá el email, una contraseña inicial y los años que va a poder gestionar.
        </p>
      </div>

      <AdminUserForm mode="create" years={years} action={createAdminCampusAction} />
    </div>
  )
}
