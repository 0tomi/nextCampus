import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

describe('AdminSidebar navigation helpers', () => {
  it('incluye perfil, calendario, usuarios e historial para admins', async () => {
    const { buildAdminSidebarItems } = await import('./AdminSidebar.utils')

    const items = buildAdminSidebarItems({
      pathname: '/admin/users',
      canCreateUsers: true,
      canViewAuditHistory: true,
      canManageCalendar: true,
    })

    expect(items.map((item) => item.id)).toEqual(['perfil', 'calendario', 'users', 'historial'])
    expect(items.map((item) => item.href)).toEqual([
      '/admin/perfil',
      '/admin/calendario',
      '/admin/users',
      '/admin/historial',
    ])
  })

  it('muestra calendario e historial sin usuarios para supervisores', async () => {
    const { buildAdminSidebarItems } = await import('./AdminSidebar.utils')

    const items = buildAdminSidebarItems({
      pathname: '/admin/historial',
      canCreateUsers: false,
      canViewAuditHistory: true,
      canManageCalendar: true,
    })

    expect(items.map((item) => item.id)).toEqual(['perfil', 'calendario', 'historial'])
    expect(items[2]).toMatchObject({
      id: 'historial',
      href: '/admin/historial',
      active: true,
    })
  })

  it('marca calendario como activo en su ruta', async () => {
    const { buildAdminSidebarItems } = await import('./AdminSidebar.utils')

    const items = buildAdminSidebarItems({
      pathname: '/admin/calendario',
      canCreateUsers: false,
      canViewAuditHistory: false,
      canManageCalendar: true,
    })

    expect(items.map((item) => item.id)).toEqual(['perfil', 'calendario'])
    expect(items[1]).toMatchObject({
      id: 'calendario',
      href: '/admin/calendario',
      active: true,
    })
  })

  it('deja solo perfil para ayudantes sin permisos', async () => {
    const { buildAdminSidebarItems } = await import('./AdminSidebar.utils')

    const items = buildAdminSidebarItems({
      pathname: '/admin/perfil',
      canCreateUsers: false,
      canViewAuditHistory: false,
      canManageCalendar: false,
    })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: 'perfil',
      href: '/admin/perfil',
      active: true,
    })
  })
})
