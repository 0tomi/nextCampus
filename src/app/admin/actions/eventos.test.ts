import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'

const revalidatePathMock = vi.fn()
const updateTagMock = vi.fn()
const requireAnyAdminMock = vi.fn()
const requireYearAdminForAgendaIdMock = vi.fn()
const requireYearAdminForCommissionIdMock = vi.fn()
const requireYearAdminForEventoIdMock = vi.fn()
const ensureCanManageContributionMock = vi.fn()
const sanitizeRichHtmlMock = vi.fn()
const recordAuditMock = vi.fn()
const awardEventoCreatedMock = vi.fn()
const revokeEventoCreatedMock = vi.fn()

const prismaMock = {
  evento: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  apunte: {
    count: vi.fn(),
  },
  agenda: {
    findFirst: vi.fn(),
  },
  apunteEvento: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  $transaction: vi.fn(),
}

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
  updateTag: updateTagMock,
}))

// shared.ts importa queryTags desde @/lib/queries, que a su vez hace
// `import 'server-only'`: hay que mockearlo o el módulo real explota en vitest.
vi.mock('@/lib/queries', () => ({
  queryTags: {
    career: 'career',
    tiposEvento: 'tipos-evento',
    latestApuntes: 'latest-apuntes',
    upcomingEvents: 'upcoming-events',
    year: (slug: string) => `year:${slug}`,
    subject: (slug: string) => `subject:${slug}`,
    quizBanks: vi.fn(() => 'quiz-bank-tag'),
  },
}))

vi.mock('@/lib/auth', () => ({
  requireAnyAdmin: requireAnyAdminMock,
  requireGeneralAdmin: vi.fn(),
  requireAcademicManager: vi.fn(),
  requireYearAdminForAgendaId: requireYearAdminForAgendaIdMock,
  requireYearAdminForCommissionId: requireYearAdminForCommissionIdMock,
  requireYearAdminForEventoId: requireYearAdminForEventoIdMock,
  ensureCanManageContribution: ensureCanManageContributionMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeRichHtml: sanitizeRichHtmlMock,
}))

vi.mock('@/lib/audit', () => ({
  AUDIT_ACTIONS: {
    EVENTO_CREATED: 'EVENTO_CREATED',
    EVENTO_UPDATED: 'EVENTO_UPDATED',
    EVENTO_DATE_UPDATED: 'EVENTO_DATE_UPDATED',
    EVENTO_DELETED: 'EVENTO_DELETED',
  },
  recordAudit: recordAuditMock,
}))

vi.mock('@/lib/contributions', () => ({
  awardEventoCreated: awardEventoCreatedMock,
  revokeEventoCreated: revokeEventoCreatedMock,
}))

// Sentinel de redirect: requireAnyAdmin() redirige (no lanza), pero en los tests
// mockeamos el throw para demostrar el ORDEN causal: auth antes de validación.
const authRedirect = new Error('AUTH_REDIRECT')

const admin = { id: 'admin-1' }
const scope = {
  admin,
  yearId: 'year-1',
  yearSlug: 'primer-anio',
  subjectId: 'subject-1',
  subjectSlug: 'calculo',
  agendaId: 'agenda-1',
  commissionSlugs: [],
}

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

  sanitizeRichHtmlMock.mockImplementation((html) => String(html))
  recordAuditMock.mockResolvedValue(undefined)
  awardEventoCreatedMock.mockResolvedValue(undefined)
  revokeEventoCreatedMock.mockResolvedValue(undefined)
  ensureCanManageContributionMock.mockImplementation(() => {})
  prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock))
  requireAnyAdminMock.mockResolvedValue(admin)
})

describe('eventos actions: auth ANTES de validación (regresión 10/7)', () => {
  it('updateEventoFechaAction rechaza con el sentinel de auth ante entrada inválida, sin tocar prisma', async () => {
    requireAnyAdminMock.mockRejectedValue(authRedirect)

    const { updateEventoFechaAction } = await import('./eventos')

    await expect(
      updateEventoFechaAction('', 'no-es-una-fecha', 'primer-anio'),
    ).rejects.toBe(authRedirect)
    expect(requireYearAdminForEventoIdMock).not.toHaveBeenCalled()
    expect(prismaMock.evento.update).not.toHaveBeenCalled()
    expect(prismaMock.evento.findUnique).not.toHaveBeenCalled()
  })

  it('deleteEvento rechaza con el sentinel de auth ante FormData inválido, sin tocar prisma', async () => {
    requireAnyAdminMock.mockRejectedValue(authRedirect)

    const { deleteEvento } = await import('./eventos')

    await expect(deleteEvento(new FormData())).rejects.toBe(authRedirect)
    expect(requireYearAdminForEventoIdMock).not.toHaveBeenCalled()
    expect(prismaMock.evento.delete).not.toHaveBeenCalled()
    expect(prismaMock.evento.findUnique).not.toHaveBeenCalled()
  })

  it('updateEventoFechaAction con auth OK: valida, resuelve scope, actualiza SOLO la fecha y revalida', async () => {
    requireYearAdminForEventoIdMock.mockResolvedValue(scope)
    prismaMock.evento.findUnique.mockResolvedValue({ createdByUserId: 'admin-1' })
    prismaMock.evento.update.mockResolvedValue({ titulo: 'Parcial 1' })

    const { updateEventoFechaAction } = await import('./eventos')

    const result = await updateEventoFechaAction('evento-1', '2026-08-20', 'primer-anio')

    expect(result).toEqual({ ok: true })
    expect(prismaMock.evento.update).toHaveBeenCalledWith({
      where: { id: 'evento-1' },
      data: { fecha: new Date('2026-08-20T00:00:00.000Z') },
      select: { titulo: true },
    })
    // La hora NO se toca al arrastrar: el update solo lleva `fecha`.
    const updateData = prismaMock.evento.update.mock.calls[0][0].data
    expect(updateData).toEqual({ fecha: new Date('2026-08-20T00:00:00.000Z') })
    expect(updateTagMock).toHaveBeenCalledWith('upcoming-events')
    expect(updateTagMock).toHaveBeenCalledWith('subject:calculo')
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EVENTO_DATE_UPDATED',
        entityId: 'evento-1',
        userId: 'admin-1',
      }),
    )
  })

  it('deleteEvento con auth OK: borra, revoca contribución y revalida', async () => {
    requireYearAdminForEventoIdMock.mockResolvedValue(scope)
    prismaMock.evento.findUnique.mockResolvedValue({
      titulo: 'Parcial 1',
      fecha: new Date('2026-08-20T00:00:00.000Z'),
      hora: '10:00',
      createdByUserId: 'admin-1',
    })
    prismaMock.evento.delete.mockResolvedValue(undefined)

    const { deleteEvento } = await import('./eventos')

    await expect(
      deleteEvento(makeFormData({ id: 'evento-1' })),
    ).resolves.toBeUndefined()
    expect(prismaMock.evento.delete).toHaveBeenCalledWith({ where: { id: 'evento-1' } })
    expect(revokeEventoCreatedMock).toHaveBeenCalledWith('admin-1')
    expect(updateTagMock).toHaveBeenCalledWith('upcoming-events')
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EVENTO_DELETED',
        entityId: 'evento-1',
        userId: 'admin-1',
      }),
    )
  })

  it('updateEventoFechaAction con auth OK e input inválido devuelve el error de validación sin mutar', async () => {
    const { updateEventoFechaAction } = await import('./eventos')

    await expect(
      updateEventoFechaAction('', '2026-08-20', 'primer-anio'),
    ).rejects.toBeInstanceOf(ZodError)
    await expect(
      updateEventoFechaAction('evento-1', 'no-es-una-fecha', 'primer-anio'),
    ).rejects.toThrow('La fecha no es válida.')
    expect(requireYearAdminForEventoIdMock).not.toHaveBeenCalled()
    expect(prismaMock.evento.update).not.toHaveBeenCalled()
  })

  it('deleteEvento con auth OK e id vacío devuelve error de validación sin mutar', async () => {
    const { deleteEvento } = await import('./eventos')

    await expect(deleteEvento(new FormData())).rejects.toBeInstanceOf(ZodError)
    expect(requireYearAdminForEventoIdMock).not.toHaveBeenCalled()
    expect(prismaMock.evento.delete).not.toHaveBeenCalled()
  })
})

describe('eventos actions: regresión de wrappers create/update', () => {
  it('createEventoAction falla con el sentinel de auth antes de validar o escribir', async () => {
    requireAnyAdminMock.mockRejectedValue(authRedirect)

    const { createEventoAction } = await import('./eventos')

    await expect(
      createEventoAction(
        { ok: false, message: '' },
        makeFormData({
          agendaId: '',
          tipoEventoId: '',
          titulo: '',
          fecha: '',
        }),
      ),
    ).rejects.toBe(authRedirect)
    expect(prismaMock.evento.create).not.toHaveBeenCalled()
    expect(requireYearAdminForEventoIdMock).not.toHaveBeenCalled()
  })

  it('updateEventoAction falla con el sentinel de auth antes de validar o escribir', async () => {
    requireAnyAdminMock.mockRejectedValue(authRedirect)

    const { updateEventoAction } = await import('./eventos')

    await expect(
      updateEventoAction(
        { ok: false, message: '' },
        makeFormData({ id: '', agendaId: '', titulo: '', fecha: '' }),
      ),
    ).rejects.toBe(authRedirect)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(requireYearAdminForEventoIdMock).not.toHaveBeenCalled()
  })
})

describe('eventos actions: creación y edición con descripción Markdown', () => {
  it('createEvento guarda la descripción y revalida los tags de eventos', async () => {
    requireYearAdminForAgendaIdMock.mockResolvedValue(scope)
    prismaMock.evento.create.mockResolvedValue({
      id: 'evento-1',
      titulo: 'Parcial 1',
    })

    const { createEvento } = await import('./eventos')

    await createEvento(
      makeFormData({
        agendaId: 'agenda-1',
        tipoEventoId: 'tipo-1',
        titulo: 'Parcial 1',
        descripcion: 'Temas: **Unidad 1** y *Unidad 2*',
        fecha: '2026-08-20',
        hora: '10:00',
      }),
    )

    expect(prismaMock.evento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agendaId: 'agenda-1',
        tipoEventoId: 'tipo-1',
        titulo: 'Parcial 1',
        descripcion: 'Temas: **Unidad 1** y *Unidad 2*',
        hora: '10:00',
        createdByUserId: 'admin-1',
      }),
    })
    expect(updateTagMock).toHaveBeenCalledWith('upcoming-events')
    expect(updateTagMock).toHaveBeenCalledWith('subject:calculo')
  })

  it('updateEvento actualiza la descripción y revalida los tags de eventos', async () => {
    requireYearAdminForEventoIdMock.mockResolvedValue(scope)
    requireYearAdminForAgendaIdMock.mockResolvedValue(scope)
    prismaMock.evento.findUnique.mockResolvedValue({ createdByUserId: 'admin-1' })
    const updateMock = vi.fn().mockResolvedValue(undefined)
    const deleteManyMock = vi.fn().mockResolvedValue(undefined)
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        evento: { update: updateMock },
        apunteEvento: { deleteMany: deleteManyMock, createMany: vi.fn() },
      }),
    )

    const { updateEvento } = await import('./eventos')

    await updateEvento(
      makeFormData({
        id: 'evento-1',
        agendaId: 'agenda-1',
        tipoEventoId: 'tipo-1',
        titulo: 'Parcial 1 Modificado',
        descripcion: 'Temas actualizados: **Unidad 1 a 3**',
        fecha: '2026-08-21',
        hora: '11:00',
      }),
    )

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'evento-1' },
      data: expect.objectContaining({
        titulo: 'Parcial 1 Modificado',
        descripcion: 'Temas actualizados: **Unidad 1 a 3**',
        hora: '11:00',
      }),
    })
    expect(updateTagMock).toHaveBeenCalledWith('upcoming-events')
    expect(updateTagMock).toHaveBeenCalledWith('subject:calculo')
  })
})

