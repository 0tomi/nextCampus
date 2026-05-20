import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/env', () => ({ env: { ADMIN_EMAILS: 'general@campus.test' } }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('./supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))

describe('auth helpers puros', () => {
  it('marca AdminGeneral con capacidades globales', async () => {
    const { buildAdminUser, USER_ROLES, USER_STATUSES } = await import('./auth')

    const admin = buildAdminUser({
      id: 'account-general',
      authUserId: 'auth-general',
      email: 'GENERAL@CAMPUS.TEST',
      role: USER_ROLES.ADMIN_GENERAL,
      status: USER_STATUSES.ACTIVE,
      yearPermissions: [],
    })

    expect(admin).toMatchObject({
      email: 'general@campus.test',
      role: USER_ROLES.ADMIN_GENERAL,
      canManageAllYears: true,
      canCreateUsers: true,
      yearIds: [],
      yearSlugs: [],
    })
  })

  it('carga años para AdminCampus activo', async () => {
    const { buildAdminUser, USER_ROLES, USER_STATUSES } = await import('./auth')

    const admin = buildAdminUser({
      id: 'account-campus',
      authUserId: 'auth-campus',
      email: 'campus@campus.test',
      role: USER_ROLES.ADMIN_CAMPUS,
      status: USER_STATUSES.ACTIVE,
      yearPermissions: [
        { year: { id: 'year-1', slug: 'primer-anio' } },
        { year: { id: 'year-2', slug: 'segundo-anio' } },
      ],
    })

    expect(admin).toMatchObject({
      role: USER_ROLES.ADMIN_CAMPUS,
      canManageAllYears: false,
      canCreateUsers: false,
      yearIds: ['year-1', 'year-2'],
      yearSlugs: ['primer-anio', 'segundo-anio'],
    })
  })

  it('rechaza cuentas desactivadas', async () => {
    const { buildAdminUser, USER_ROLES, USER_STATUSES } = await import('./auth')

    const admin = buildAdminUser({
      id: 'account-disabled',
      authUserId: 'auth-disabled',
      email: 'campus@campus.test',
      role: USER_ROLES.ADMIN_CAMPUS,
      status: USER_STATUSES.DISABLED,
      yearPermissions: [{ year: { id: 'year-1', slug: 'primer-anio' } }],
    })

    expect(admin).toBeNull()
  })

  it('mantiene activo a un AdminCampus sin años asignados, pero sin alcance', async () => {
    const { adminCanManageYear, buildAdminUser, USER_ROLES, USER_STATUSES } = await import('./auth')

    const admin = buildAdminUser({
      id: 'account-campus-empty',
      authUserId: 'auth-campus-empty',
      email: 'campus-empty@campus.test',
      role: USER_ROLES.ADMIN_CAMPUS,
      status: USER_STATUSES.ACTIVE,
      yearPermissions: [],
    })

    expect(admin).toMatchObject({
      yearIds: [],
      yearSlugs: [],
      canManageAllYears: false,
      canCreateUsers: false,
    })
    expect(adminCanManageYear(admin!, 'year-1')).toBe(false)
  })

  it('evalúa permisos por año sin depender de Prisma', async () => {
    const { adminCanManageYear, buildAdminUser, USER_ROLES, USER_STATUSES } = await import('./auth')

    const campusAdmin = buildAdminUser({
      id: 'account-campus',
      authUserId: 'auth-campus',
      email: 'campus@campus.test',
      role: USER_ROLES.ADMIN_CAMPUS,
      status: USER_STATUSES.ACTIVE,
      yearPermissions: [{ year: { id: 'year-1', slug: 'primer-anio' } }],
    })

    const generalAdmin = buildAdminUser({
      id: 'account-general',
      authUserId: 'auth-general',
      email: 'general@campus.test',
      role: USER_ROLES.ADMIN_GENERAL,
      status: USER_STATUSES.ACTIVE,
      yearPermissions: [],
    })

    expect(campusAdmin).not.toBeNull()
    expect(generalAdmin).not.toBeNull()
    expect(adminCanManageYear(campusAdmin!, 'year-1')).toBe(true)
    expect(adminCanManageYear(campusAdmin!, 'year-2')).toBe(false)
    expect(adminCanManageYear(generalAdmin!, 'year-any')).toBe(true)
  })

  it('normaliza la allowlist bootstrap', async () => {
    const { isBootstrapGeneralAdminEmail } = await import('./auth')

    expect(isBootstrapGeneralAdminEmail(' GENERAL@CAMPUS.TEST ')).toBe(true)
    expect(isBootstrapGeneralAdminEmail('alumno@campus.test')).toBe(false)
  })
})
