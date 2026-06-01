import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

describe('AdminSidebar navigation helpers', () => {
  it('incluye perfil, usuarios e historial para admins con gestión de usuarios', async () => {
    const { buildAdminSidebarItems } = await import('./AdminSidebar')

    const items = buildAdminSidebarItems({
      pathname: '/admin/users',
      canCreateUsers: true,
      canViewAuditHistory: true,
    })

    expect(items.map((item) => item.id)).toEqual(['perfil', 'users', 'historial'])
    expect(items.map((item) => item.href)).toEqual([
      '/admin/perfil',
      '/admin/users',
      '/admin/historial',
    ])
  })

  it('muestra historial sin usuarios para supervisores', async () => {
    const { buildAdminSidebarItems } = await import('./AdminSidebar')

    const items = buildAdminSidebarItems({
      pathname: '/admin/historial',
      canCreateUsers: false,
      canViewAuditHistory: true,
    })

    expect(items.map((item) => item.id)).toEqual(['perfil', 'historial'])
    expect(items[1]).toMatchObject({
      id: 'historial',
      href: '/admin/historial',
      active: true,
    })
  })

  it('deja solo perfil para ayudantes sin permisos de historial', async () => {
    const { buildAdminSidebarItems } = await import('./AdminSidebar')

    const items = buildAdminSidebarItems({
      pathname: '/admin/perfil',
      canCreateUsers: false,
      canViewAuditHistory: false,
    })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: 'perfil',
      href: '/admin/perfil',
      active: true,
    })
  })
})
