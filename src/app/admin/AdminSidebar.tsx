'use client'

import { usePathname } from 'next/navigation'
import { Users, History } from 'lucide-react'
import { Sidebar, type SidebarItem } from '@/components/shell/Sidebar'

const BADGE_USERS = 'from-amber-400 to-orange-500 text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
const BADGE_HISTORY = 'from-violet-400 to-fuchsia-500 text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'

export function AdminSidebar() {
  const pathname = usePathname() ?? ''

  const items: SidebarItem[] = [
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
  ]

  return (
    <Sidebar
      items={items}
      eyebrow="Panel"
      title="Administración"
      ariaLabel="Navegación de administración"
    />
  )
}
