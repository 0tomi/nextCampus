import Link from 'next/link'
import { getAdminUser } from '@/lib/auth'
import { getCareer } from '@/lib/queries'
import { ConstructivistCard } from '@/components/shared/ConstructivistCard'

export const dynamic = 'force-dynamic'

export default async function AdminHubPage() {
  const admin = await getAdminUser()

  if (!admin) {
    return (
      <ConstructivistCard>
        <p className="font-semibold">
          No autorizado. Tu usuario no está en la allowlist de
          administradores (ADMIN_EMAILS).
        </p>
        <Link
          href="/admin/login"
          className="mt-2 inline-block text-accent hover:underline"
        >
          Ir al login
        </Link>
      </ConstructivistCard>
    )
  }

  const career = await getCareer()

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold">
        Panel de administración
      </h1>
      <p className="text-sm text-ink/60">Sesión: {admin.email}</p>

      {career?.years.map((year) => (
        <section key={year.id} className="space-y-2">
          <h2 className="font-display text-xl font-bold">{year.nombre}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {year.subjects.map((subject) => (
              <Link
                key={subject.id}
                href={`/admin/materia/${subject.slug}`}
                className="border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold hover:bg-ink/5"
              >
                {subject.nombre}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
