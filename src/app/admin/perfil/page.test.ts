import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    academicYear: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  requireAnyAdmin: vi.fn(),
}))

vi.mock('./ProfileForm', () => ({
  ProfileForm: () => null,
}))

vi.mock('./actions', () => ({
  updateAdminEmailAction: vi.fn(),
  updateAdminPasswordAction: vi.fn(),
}))

describe('admin perfil page helpers', () => {
  it('describe el rol del admin con copy claro', async () => {
    const { roleLabel } = await import('./page')

    expect(roleLabel('AYUDANTE')).toBe('Ayudante')
    expect(roleLabel('ADMIN')).toBe('Admin')
  })

  it('resume los años asignados según el alcance', async () => {
    const { buildAssignedYearsSummary } = await import('./page')

    expect(buildAssignedYearsSummary([], true)).toBe('Acceso a todos los años')
    expect(buildAssignedYearsSummary([], false)).toBe('Sin años asignados')
    expect(buildAssignedYearsSummary(['Primer año'], false)).toBe('1 año asignado: Primer año')
    expect(buildAssignedYearsSummary(['Primer año', 'Segundo año', 'Tercer año'], false)).toBe(
      '3 años asignados: Primer año, Segundo año y 1 más',
    )
  })
})
