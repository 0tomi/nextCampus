import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePathMock = vi.fn()
const requireAnyAdminMock = vi.fn()
const recordAuditMock = vi.fn()
const createSupabaseAdminClientMock = vi.fn()
const createSupabaseServerClientMock = vi.fn()

const prismaMock = {
  userAccount: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock('@/lib/auth', () => ({
  requireAnyAdmin: requireAnyAdminMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}))

vi.mock('@/lib/audit', () => ({
  AUDIT_ACTIONS: {
    USER_UPDATED: 'USER_UPDATED',
  },
  recordAudit: recordAuditMock,
}))

function makeFormData(entries: Record<string, string>) {
  const formData = new FormData()

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value)
  }

  return formData
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('admin perfil profile action', () => {
  it('normaliza el correo antes de validarlo y valida el nombre', async () => {
    const { updateAdminProfileSchema } = await import('./schemas')

    const result = updateAdminProfileSchema.safeParse({
      nombreUsuario: ' Tomi ',
      nextEmail: ' NUEVO@Campus.Test ',
    })

    expect(result.success).toBe(true)
    expect(result.data?.nombreUsuario).toBe('Tomi')
    expect(result.data?.nextEmail).toBe('nuevo@campus.test')
  })

  it('rechaza correos inválidos', async () => {
    const { updateAdminProfileSchema } = await import('./schemas')

    const result = updateAdminProfileSchema.safeParse({
      nombreUsuario: 'Tomi',
      nextEmail: 'correo-invalido',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Ingresá un correo válido.')
  })

  it('usa el admin autenticado y sincroniza auth + prisma', async () => {
    const updateUserByIdMock = vi.fn().mockResolvedValue({ error: null })

    requireAnyAdminMock.mockResolvedValue({
      id: 'self-account',
      authUserId: 'auth-self',
      nombreUsuario: 'Tomi Viejo',
      email: 'actual@campus.test',
      role: 'AYUDANTE',
      status: 'ACTIVE',
      yearIds: ['year-1'],
      yearSlugs: ['primer-anio'],
      canManageAllYears: false,
      canCreateUsers: false,
    })

    prismaMock.userAccount.findUnique.mockResolvedValue({
      id: 'self-account',
      authUserId: 'auth-self',
      nombreUsuario: 'Tomi Viejo',
      email: 'actual@campus.test',
    })
    prismaMock.userAccount.update.mockResolvedValue({ id: 'self-account' })
    createSupabaseAdminClientMock.mockReturnValue({
      auth: {
        admin: {
          updateUserById: updateUserByIdMock,
        },
      },
    })

    const { updateAdminProfileAction } = await import('./actions')
    const result = await updateAdminProfileAction(
      { ok: false, message: '' },
      makeFormData({
        userId: 'otro-admin',
        nombreUsuario: 'Tomi Nuevo',
        nextEmail: ' Nuevo@Campus.Test ',
      }),
    )

    expect(result).toEqual({ ok: true, message: 'Perfil actualizado correctamente.' })
    expect(updateUserByIdMock).toHaveBeenCalledWith('auth-self', {
      email: 'nuevo@campus.test',
      email_confirm: true,
    })
    expect(prismaMock.userAccount.update).toHaveBeenCalledWith({
      where: { id: 'self-account' },
      data: {
        nombreUsuario: 'Tomi Nuevo',
        email: 'nuevo@campus.test',
      },
    })
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'self-account',
        entityId: 'self-account',
        detail: expect.objectContaining({
          nombreUsuario: 'Tomi Nuevo',
          nameChanged: true,
          previousEmail: 'actual@campus.test',
          email: 'nuevo@campus.test',
          emailChanged: true,
        }),
      }),
    )
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/perfil')
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin', 'layout')
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/historial')
  })

  it('intenta rollback si falla la actualización local después de auth', async () => {
    const updateUserByIdMock = vi.fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })

    requireAnyAdminMock.mockResolvedValue({
      id: 'self-account',
      authUserId: 'auth-self',
      nombreUsuario: 'Tomi Viejo',
      email: 'actual@campus.test',
      role: 'AYUDANTE',
      status: 'ACTIVE',
      yearIds: [],
      yearSlugs: [],
      canManageAllYears: false,
      canCreateUsers: false,
    })

    prismaMock.userAccount.findUnique.mockResolvedValue({
      id: 'self-account',
      authUserId: 'auth-self',
      nombreUsuario: 'Tomi Viejo',
      email: 'actual@campus.test',
    })
    prismaMock.userAccount.update.mockRejectedValue(new Error('db exploded'))
    createSupabaseAdminClientMock.mockReturnValue({
      auth: {
        admin: {
          updateUserById: updateUserByIdMock,
        },
      },
    })

    const { updateAdminProfileAction } = await import('./actions')
    const result = await updateAdminProfileAction(
      { ok: false, message: '' },
      makeFormData({
        nombreUsuario: 'Tomi Nuevo',
        nextEmail: 'nuevo@campus.test',
      }),
    )

    expect(result).toEqual({
      ok: false,
      message: 'No pudimos actualizar el perfil. Intentá de nuevo.',
    })
    expect(updateUserByIdMock).toHaveBeenNthCalledWith(2, 'auth-self', {
      email: 'actual@campus.test',
      email_confirm: true,
    })
  })
})

describe('admin perfil password action', () => {
  it('exige confirmación y largo mínimo', async () => {
    const { updateAdminPasswordSchema } = await import('./schemas')

    const result = updateAdminPasswordSchema.safeParse({
      currentPassword: 'actual1234',
      nextPassword: 'corta',
      confirmPassword: 'distinta',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'La nueva contraseña debe tener al menos 8 caracteres.',
      'La confirmación no coincide con la nueva contraseña.',
    ])
  })

  it('actualiza la contraseña del admin autenticado sin guardar valores sensibles', async () => {
    const updateUserMock = vi.fn().mockResolvedValue({ error: null })

    requireAnyAdminMock.mockResolvedValue({
      id: 'self-account',
      authUserId: 'auth-self',
      email: 'actual@campus.test',
      role: 'AYUDANTE',
      status: 'ACTIVE',
      yearIds: [],
      yearSlugs: [],
      canManageAllYears: false,
      canCreateUsers: false,
    })

    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        updateUser: updateUserMock,
      },
    })

    const { updateAdminPasswordAction } = await import('./actions')
    const result = await updateAdminPasswordAction(
      { ok: false, message: '' },
      makeFormData({
        userId: 'otro-admin',
        currentPassword: 'actual1234',
        nextPassword: 'nueva1234',
        confirmPassword: 'nueva1234',
      }),
    )

    expect(result).toEqual({ ok: true, message: 'Contraseña actualizada correctamente.' })
    expect(updateUserMock).toHaveBeenCalledWith({
      password: 'nueva1234',
      current_password: 'actual1234',
    })
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'self-account',
        entityId: 'self-account',
        detail: expect.objectContaining({
          passwordChanged: true,
        }),
      }),
    )
    expect(recordAuditMock.mock.calls[0]?.[0]?.detail).not.toHaveProperty('currentPassword')
    expect(recordAuditMock.mock.calls[0]?.[0]?.detail).not.toHaveProperty('nextPassword')
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/perfil')
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin', 'layout')
  })
})
