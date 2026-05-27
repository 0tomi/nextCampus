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
    })

    expect(items.map((item) => item.id)).toEqual(['perfil', 'users', 'historial'])
    expect(items.map((item) => item.href)).toEqual([
      '/admin/perfil',
      '/admin/users',
      '/admin/historial',
    ])
  })

  it('deja solo perfil para admins sin permisos de gestión', async () => {
    const { buildAdminSidebarItems } = await import('./AdminSidebar')

    const items = buildAdminSidebarItems({
      pathname: '/admin/perfil',
      canCreateUsers: false,
    })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: 'perfil',
      href: '/admin/perfil',
      active: true,
    })
  })
})
