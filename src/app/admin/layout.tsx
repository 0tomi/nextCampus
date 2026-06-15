import type { ReactNode } from 'react'
import { getAdminUser } from '@/lib/auth'
import { DashboardShell } from '@/components/shell/DashboardShell'
import { AdminSidebar } from './AdminSidebar'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminUser()

  // En el flujo de inicio de sesión (sin admin todavía) no envolvemos con el
  // shell: la página de login tiene su propio diseño centrado.
  if (!admin) {
    return <>{children}</>
  }

  return (
    <DashboardShell sidebar={<AdminSidebar />} mainClassName="p-6 sm:p-8">
      {children}
    </DashboardShell>
  )
}
