import { beforeEach, describe, expect, it, vi } from 'vitest'

const redirectMock = vi.fn()
const createSupabaseServerClientMock = vi.fn()
const prismaMock = {
  userAccount: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({ redirect: redirectMock }))
vi.mock('@/lib/env', () => ({ env: { ADMIN_EMAILS: 'general@campus.test' } }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('./supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('auth helpers puros', () => {
  it('marca Admin con capacidades globales', async () => {
    const { buildAdminUser, USER_ROLES, USER_STATUSES } = await import('./auth')

    const admin = buildAdminUser({
      id: 'account-general',
      authUserId: 'auth-general',
      email: 'GENERAL@CAMPUS.TEST',
      role: USER_ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
      yearPermissions: [],
    })

    expect(admin).toMatchObject({
      email: 'general@campus.test',
      role: USER_ROLES.ADMIN,
      canManageAllYears: true,
      canCreateUsers: true,
      yearIds: [],
      yearSlugs: [],
    })
  })

  it('carga años para Ayudante activo', async () => {
    const { buildAdminUser, USER_ROLES, USER_STATUSES } = await import('./auth')

    const admin = buildAdminUser({
      id: 'account-campus',
      authUserId: 'auth-campus',
      email: 'campus@campus.test',
      role: USER_ROLES.AYUDANTE,
      status: USER_STATUSES.ACTIVE,
      yearPermissions: [
        { year: { id: 'year-1', slug: 'primer-anio' } },
        { year: { id: 'year-2', slug: 'segundo-anio' } },
      ],
    })

    expect(admin).toMatchObject({
      role: USER_ROLES.AYUDANTE,
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
      role: USER_ROLES.AYUDANTE,
      status: USER_STATUSES.DISABLED,
      yearPermissions: [{ year: { id: 'year-1', slug: 'primer-anio' } }],
    })

    expect(admin).toBeNull()
  })

  it('mantiene activo a un Ayudante sin años asignados, pero sin alcance', async () => {
    const { adminCanManageYear, buildAdminUser, USER_ROLES, USER_STATUSES } = await import('./auth')

    const admin = buildAdminUser({
      id: 'account-campus-empty',
      authUserId: 'auth-campus-empty',
      email: 'campus-empty@campus.test',
      role: USER_ROLES.AYUDANTE,
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
      role: USER_ROLES.AYUDANTE,
      status: USER_STATUSES.ACTIVE,
      yearPermissions: [{ year: { id: 'year-1', slug: 'primer-anio' } }],
    })

    const generalAdmin = buildAdminUser({
      id: 'account-general',
      authUserId: 'auth-general',
      email: 'general@campus.test',
      role: USER_ROLES.ADMIN,
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

  it('envía a los admins con gestión de usuarios al listado', async () => {
    const { getAdminHomeDestination } = await import('./auth')

    expect(getAdminHomeDestination({ canCreateUsers: true })).toBe('/admin/users')
  })

  it('envía a los ayudantes a su perfil', async () => {
    const { getAdminHomeDestination } = await import('./auth')

    expect(getAdminHomeDestination({ canCreateUsers: false })).toBe('/admin/perfil')
  })

  it('acepta admins generales guardados en la base', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'auth-general', email: 'general-db@campus.test' } },
      error: null,
    })

    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser },
    })

    prismaMock.userAccount.findUnique.mockResolvedValue({
      id: 'account-general',
      authUserId: 'auth-general',
      email: 'general-db@campus.test',
      role: 'ADMIN',
      status: 'ACTIVE',
      yearPermissions: [],
    })

    const { getAdminUser, USER_ROLES } = await import('./auth')
    const admin = await getAdminUser()

    expect(admin).toMatchObject({
      id: 'account-general',
      role: USER_ROLES.ADMIN,
      canManageAllYears: true,
      canCreateUsers: true,
    })
  })

  it('mantiene el alcance acotado para ayudantes cargados desde la base', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'auth-campus', email: 'campus-db@campus.test' } },
      error: null,
    })

    createSupabaseServerClientMock.mockResolvedValue({
      auth: { getUser },
    })

    prismaMock.userAccount.findUnique.mockResolvedValue({
      id: 'account-campus',
      authUserId: 'auth-campus',
      email: 'campus-db@campus.test',
      role: 'AYUDANTE',
      status: 'ACTIVE',
      yearPermissions: [{ year: { id: 'year-1', slug: 'primer-anio' } }],
    })

    const { getAdminUser, USER_ROLES } = await import('./auth')
    const admin = await getAdminUser()

    expect(admin).toMatchObject({
      id: 'account-campus',
      role: USER_ROLES.AYUDANTE,
      canManageAllYears: false,
      canCreateUsers: false,
      yearIds: ['year-1'],
    })
  })
})
