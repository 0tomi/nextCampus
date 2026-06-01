import { CircleUserRound, History, Users } from 'lucide-react'
import type { SidebarItem } from '@/components/shell/Sidebar'

const BADGE_PROFILE = 'from-sky-400 to-cyan-500 text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
const BADGE_USERS = 'from-amber-400 to-orange-500 text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
const BADGE_HISTORY = 'from-violet-400 to-fuchsia-500 text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'

interface BuildAdminSidebarItemsInput {
  pathname: string
  canCreateUsers: boolean
  canViewAuditHistory: boolean
}

export function buildAdminSidebarItems({
  pathname,
  canCreateUsers,
  canViewAuditHistory,
}: BuildAdminSidebarItemsInput): SidebarItem[] {
  const items: SidebarItem[] = [
    {
      id: 'perfil',
      href: '/admin/perfil',
      label: 'Mi perfil',
      meta: 'Tu cuenta y acceso',
      badge: <CircleUserRound className="size-4" />,
      badgeClassName: BADGE_PROFILE,
      active: pathname.startsWith('/admin/perfil'),
    },
  ]

  if (canCreateUsers) {
    items.push({
      id: 'users',
      href: '/admin/users',
      label: 'Usuarios',
      meta: 'Administradores del campus',
      badge: <Users className="size-4" />,
      badgeClassName: BADGE_USERS,
      active: pathname.startsWith('/admin/users'),
    })
  }

  if (canViewAuditHistory) {
    items.push({
      id: 'historial',
      href: '/admin/historial',
      label: 'Historial',
      meta: 'Movimientos recientes',
      badge: <History className="size-4" />,
      badgeClassName: BADGE_HISTORY,
      active: pathname.startsWith('/admin/historial'),
    })
  }

  return items
}
