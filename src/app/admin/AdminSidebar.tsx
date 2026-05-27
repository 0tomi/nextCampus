'use client'

import { usePathname } from 'next/navigation'
import { CircleUserRound, History, Users } from 'lucide-react'
import { useAdminSession } from '@/components/admin/adminAccess'
import { Sidebar, type SidebarItem } from '@/components/shell/Sidebar'

const BADGE_PROFILE = 'from-sky-400 to-cyan-500 text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
const BADGE_USERS = 'from-amber-400 to-orange-500 text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
const BADGE_HISTORY = 'from-violet-400 to-fuchsia-500 text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'

interface BuildAdminSidebarItemsInput {
  pathname: string
  canCreateUsers: boolean
}

export function buildAdminSidebarItems({
  pathname,
  canCreateUsers,
}: BuildAdminSidebarItemsInput): SidebarItem[] {
  const items: SidebarItem[] = [
    {
      id: 'perfil',
      href: '/admin/perfil',
      label: 'Mi perfil',
      meta: 'Tu cuenta y acceso',
      badge: <CircleUserRound className="h-4 w-4" />,
      badgeClassName: BADGE_PROFILE,
      active: pathname.startsWith('/admin/perfil'),
    },
  ]

  if (!canCreateUsers) {
    return items
  }

  items.push(
    {
      id: 'users',
      href: '/admin/users',
      label: 'Usuarios',
      meta: 'Administradores del campus',
      badge: <Users className="h-4 w-4" />,
      badgeClassName: BADGE_USERS,
      active: pathname.startsWith('/admin/users'),
    },
    {
      id: 'historial',
      href: '/admin/historial',
      label: 'Historial',
      meta: 'Movimientos recientes',
      badge: <History className="h-4 w-4" />,
      badgeClassName: BADGE_HISTORY,
      active: pathname.startsWith('/admin/historial'),
    },
  )

  return items
}

export function AdminSidebar() {
  const pathname = usePathname() ?? ''
  const session = useAdminSession()
  const canCreateUsers = session?.admin?.canCreateUsers ?? false
  const items = buildAdminSidebarItems({ pathname, canCreateUsers })

  return (
    <Sidebar
      items={items}
      eyebrow="Panel"
      title="Administración"
      ariaLabel="Navegación de administración"
    />
  )
}
