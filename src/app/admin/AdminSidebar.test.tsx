import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

describe('AdminSidebar navigation helpers', () => {
  it('incluye perfil, calendario, novedades, usuarios e historial para admins', async () => {
    const { buildAdminSidebarItems } = await import('./AdminSidebar.utils')

    const items = buildAdminSidebarItems({
      pathname: '/admin/users',
      canCreateUsers: true,
      canViewAuditHistory: true,
      canManageCalendar: true,
    })

    expect(items.map((item) => item.id)).toEqual(['perfil', 'calendario', 'changelog', 'users', 'historial'])
    expect(items.map((item) => item.href)).toEqual([
      '/admin/perfil',
      '/admin/calendario',
      '/admin/changelog',
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

    expect(items.map((item) => item.id)).toEqual(['perfil', 'calendario', 'changelog', 'historial'])
    expect(items[3]).toMatchObject({
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

    expect(items.map((item) => item.id)).toEqual(['perfil', 'calendario', 'changelog'])
    expect(items[1]).toMatchObject({
      id: 'calendario',
      href: '/admin/calendario',
      active: true,
    })
  })

  it('deja perfil y novedades para ayudantes sin permisos', async () => {
    const { buildAdminSidebarItems } = await import('./AdminSidebar.utils')

    const items = buildAdminSidebarItems({
      pathname: '/admin/perfil',
      canCreateUsers: false,
      canViewAuditHistory: false,
      canManageCalendar: false,
    })

    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      id: 'perfil',
      href: '/admin/perfil',
      active: true,
    })
    expect(items[1]).toMatchObject({
      id: 'changelog',
      href: '/admin/changelog',
    })
  })
})
