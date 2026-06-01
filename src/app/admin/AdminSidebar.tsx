'use client'

import { usePathname } from 'next/navigation'
import { useAdminSession } from '@/components/admin/adminAccess'
import { Sidebar } from '@/components/shell/Sidebar'
import { buildAdminSidebarItems } from './AdminSidebar.utils'

export function AdminSidebar() {
  const pathname = usePathname() ?? ''
  const session = useAdminSession()
  const canCreateUsers = session?.admin?.canCreateUsers ?? false
  const canViewAuditHistory = session?.admin?.canViewAuditHistory ?? false
  const items = buildAdminSidebarItems({ pathname, canCreateUsers, canViewAuditHistory })

  return (
    <Sidebar
      items={items}
      eyebrow="Panel"
      title="Administración"
      ariaLabel="Navegación de administración"
    />
  )
}
