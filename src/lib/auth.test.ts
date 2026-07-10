import { beforeEach, describe, expect, it, vi } from 'vitest'

const redirectMock = vi.fn()
const createSupabaseServerClientMock = vi.fn()
const prismaMock = {
  userAccount: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  subject: {
    findUnique: vi.fn(),
  },
  agenda: {
    findUnique: vi.fn(),
  },
  evento: {
    findUnique: vi.fn(),
  },
  commission: {
    findUnique: vi.fn(),
  },
  apunte: {
    findUnique: vi.fn(),
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

// Mocks de la sesión + cuenta para ejercitar el boundary completo (guards y
// resolvers) contra Supabase y Prisma, siguiendo el patrón de actions.test.ts.
function mockAuthUser(user: { id: string; email: string } | null) {
  createSupabaseServerClientMock.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
  })
}

// Admin general vía allowlist bootstrap (ADMIN_EMAILS incluye general@campus.test):
// getAdminUser hace upsert y devuelve capacidades globales (canManageAllYears).
function useGeneralAdmin() {
  mockAuthUser({ id: 'auth-general', email: 'general@campus.test' })
  prismaMock.userAccount.upsert.mockResolvedValue({
    id: 'account-general',
    authUserId: 'auth-general',
    nombreUsuario: 'general',
  })
}

// Admin con alcance acotado a un año, cargado desde la base.
function useScopedAdmin(role: string, yearId = 'year-1', yearSlug = 'primer-anio') {
  mockAuthUser({ id: 'auth-campus', email: 'campus@campus.test' })
  prismaMock.userAccount.findUnique.mockResolvedValue({
    id: 'account-campus',
    authUserId: 'auth-campus',
    email: 'campus@campus.test',
    role,
    status: 'ACTIVE',
    yearPermissions: [{ year: { id: yearId, slug: yearSlug } }],
  })
}

function useNoSession() {
  mockAuthUser(null)
}

function subjectRow(yearId = 'year-1', yearSlug = 'primer-anio') {
  return {
    id: 'subject-1',
    slug: 'calculo',
    commissions: [{ slug: 'comision-a' }],
    year: { id: yearId, slug: yearSlug },
  }
}

describe('resolver genérico de scopes por entidad', () => {
  beforeEach(() => {
    // redirect() en Next lanza para cortar el flujo; en tests lo modelamos igual
    // para que los caminos de rechazo no continúen con datos inválidos.
    redirectMock.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`)
    })
  })

  it('deja pasar al admin general y arma el scope de la materia', async () => {
    useGeneralAdmin()
    prismaMock.subject.findUnique.mockResolvedValue(subjectRow('year-9', 'noveno-anio'))

    const { requireYearAdminForSubjectId } = await import('./auth')
    const scope = await requireYearAdminForSubjectId('subject-1')

    expect(scope).toMatchObject({
      subjectId: 'subject-1',
      subjectSlug: 'calculo',
      commissionSlugs: ['comision-a'],
      yearId: 'year-9',
      yearSlug: 'noveno-anio',
    })
    expect(scope?.admin).toMatchObject({ id: 'account-general', canManageAllYears: true })
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('deja pasar al admin del año correcto', async () => {
    useScopedAdmin('AYUDANTE', 'year-1')
    prismaMock.subject.findUnique.mockResolvedValue(subjectRow('year-1'))

    const { requireYearAdminForSubjectId } = await import('./auth')
    const scope = await requireYearAdminForSubjectId('subject-1')

    expect(scope).toMatchObject({ subjectId: 'subject-1', yearId: 'year-1' })
    expect(scope?.admin).toMatchObject({ id: 'account-campus' })
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('redirige cuando el admin es de otro año', async () => {
    useScopedAdmin('AYUDANTE', 'year-1')
    prismaMock.subject.findUnique.mockResolvedValue(subjectRow('year-2', 'segundo-anio'))

    const { requireYearAdminForSubjectId } = await import('./auth')

    await expect(requireYearAdminForSubjectId('subject-1')).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/admin/login')
  })

  it('devuelve null cuando la entidad no existe (sin redirigir)', async () => {
    useGeneralAdmin()
    prismaMock.subject.findUnique.mockResolvedValue(null)

    const { requireYearAdminForSubjectId } = await import('./auth')

    await expect(requireYearAdminForSubjectId('subject-inexistente')).resolves.toBeNull()
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('redirige cuando no hay sesión antes de tocar la entidad', async () => {
    useNoSession()

    const { requireYearAdminForSubjectId } = await import('./auth')

    await expect(requireYearAdminForSubjectId('subject-1')).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/admin/login')
    expect(prismaMock.subject.findUnique).not.toHaveBeenCalled()
  })

  // Segundo wrapper para confirmar que el resolver genérico sirve a otra entidad.
  it('arma el scope de un apunte a través del resolver genérico', async () => {
    useGeneralAdmin()
    prismaMock.apunte.findUnique.mockResolvedValue({
      id: 'apunte-1',
      subject: subjectRow('year-1'),
    })

    const { requireYearAdminForApunteId } = await import('./auth')
    const scope = await requireYearAdminForApunteId('apunte-1')

    expect(scope).toMatchObject({
      apunteId: 'apunte-1',
      subjectId: 'subject-1',
      subjectSlug: 'calculo',
      commissionSlugs: ['comision-a'],
      yearId: 'year-1',
    })
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('devuelve null cuando el apunte no existe', async () => {
    useGeneralAdmin()
    prismaMock.apunte.findUnique.mockResolvedValue(null)

    const { requireYearAdminForApunteId } = await import('./auth')

    await expect(requireYearAdminForApunteId('apunte-inexistente')).resolves.toBeNull()
    expect(redirectMock).not.toHaveBeenCalled()
  })
})

describe('guards del boundary', () => {
  beforeEach(() => {
    redirectMock.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`)
    })
  })

  it('requireAnyAdmin devuelve al admin autenticado', async () => {
    useScopedAdmin('AYUDANTE')

    const { requireAnyAdmin } = await import('./auth')
    const admin = await requireAnyAdmin()

    expect(admin).toMatchObject({ id: 'account-campus', role: 'AYUDANTE' })
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('requireAnyAdmin redirige sin sesión', async () => {
    useNoSession()

    const { requireAnyAdmin } = await import('./auth')

    await expect(requireAnyAdmin()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/admin/login')
  })

  it('requireGeneralAdmin deja pasar a un ADMIN', async () => {
    useGeneralAdmin()

    const { requireGeneralAdmin } = await import('./auth')
    const admin = await requireGeneralAdmin()

    expect(admin).toMatchObject({ role: 'ADMIN' })
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('requireGeneralAdmin redirige a un AYUDANTE', async () => {
    useScopedAdmin('AYUDANTE')

    const { requireGeneralAdmin } = await import('./auth')

    await expect(requireGeneralAdmin()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/admin/login')
  })

  it('requireAcademicManager deja pasar a un SUPERVISOR', async () => {
    useScopedAdmin('SUPERVISOR')

    const { requireAcademicManager } = await import('./auth')
    const admin = await requireAcademicManager()

    expect(admin).toMatchObject({ role: 'SUPERVISOR', canManageAcademicStructure: true })
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('requireAcademicManager redirige a un AYUDANTE', async () => {
    useScopedAdmin('AYUDANTE')

    const { requireAcademicManager } = await import('./auth')

    await expect(requireAcademicManager()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/admin/login')
  })

  it('requireAuditViewer deja pasar a un SUPERVISOR', async () => {
    useScopedAdmin('SUPERVISOR')

    const { requireAuditViewer } = await import('./auth')
    const admin = await requireAuditViewer()

    expect(admin).toMatchObject({ role: 'SUPERVISOR', canViewAuditHistory: true })
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('requireAuditViewer redirige a un AYUDANTE', async () => {
    useScopedAdmin('AYUDANTE')

    const { requireAuditViewer } = await import('./auth')

    await expect(requireAuditViewer()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/admin/login')
  })

  it('ensureCanManageContribution deja pasar al dueño de la contribución', async () => {
    useScopedAdmin('AYUDANTE')

    const { getAdminUser, ensureCanManageContribution } = await import('./auth')
    const admin = await getAdminUser()

    ensureCanManageContribution(admin!, 'account-campus')
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('ensureCanManageContribution deja pasar a quien gestiona cualquier contribución', async () => {
    useScopedAdmin('SUPERVISOR')

    const { getAdminUser, ensureCanManageContribution } = await import('./auth')
    const admin = await getAdminUser()

    ensureCanManageContribution(admin!, 'otro-usuario')
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('ensureCanManageContribution redirige ante una contribución ajena', async () => {
    useScopedAdmin('AYUDANTE')

    const { getAdminUser, ensureCanManageContribution } = await import('./auth')
    const admin = await getAdminUser()

    expect(() => ensureCanManageContribution(admin!, 'otro-usuario')).toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/admin/login')
  })
})
