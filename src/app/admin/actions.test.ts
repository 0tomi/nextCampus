import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePathMock = vi.fn()
const updateTagMock = vi.fn()
const requireGeneralAdminMock = vi.fn()
const requireAcademicManagerMock = vi.fn()
const requireAnyAdminMock = vi.fn()
const getSubjectDeleteImpactMock = vi.fn()
const requireYearAdminForAgendaIdMock = vi.fn()
const requireYearAdminForApunteIdMock = vi.fn()
const requireYearAdminForCommissionIdMock = vi.fn()
const requireYearAdminForEventoIdMock = vi.fn()
const requireYearAdminForSubjectIdMock = vi.fn()
const requireYearAdminForSubjectSlugMock = vi.fn()
const requireYearAdminForYearIdMock = vi.fn()
const sanitizeRichHtmlMock = vi.fn()
const detectarRecursoMock = vi.fn()
const recordAuditMock = vi.fn()
const uploadApunteHtmlMock = vi.fn()
const deleteApunteHtmlMock = vi.fn()
const awardApunteCreatedMock = vi.fn()
const adjustContributionScoreMock = vi.fn()
const revokeApunteCreatedMock = vi.fn()
const revokeContributionBatchMock = vi.fn()
const listQuizBankContributionRevocationsMock = vi.fn()

const prismaMock = {
  subject: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  academicYear: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  apunte: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  apunteRecurso: {
    createMany: vi.fn(),
  },
  categoria: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
  updateTag: updateTagMock,
}))

vi.mock('@/lib/auth', () => ({
  requireGeneralAdmin: requireGeneralAdminMock,
  requireAcademicManager: requireAcademicManagerMock,
  requireAnyAdmin: requireAnyAdminMock,
  requireYearAdminForAgendaId: requireYearAdminForAgendaIdMock,
  requireYearAdminForApunteId: requireYearAdminForApunteIdMock,
  requireYearAdminForCommissionId: requireYearAdminForCommissionIdMock,
  requireYearAdminForEventoId: requireYearAdminForEventoIdMock,
  requireYearAdminForSubjectId: requireYearAdminForSubjectIdMock,
  requireYearAdminForSubjectSlug: requireYearAdminForSubjectSlugMock,
  requireYearAdminForYearId: requireYearAdminForYearIdMock,
  ensureCanManageContribution: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/sanitize', () => ({
  sanitizeRichHtml: sanitizeRichHtmlMock,
}))

vi.mock('@/lib/slug', () => ({
  slugify: vi.fn((text: string) => String(text).toLowerCase().replace(/\s+/g, '-')),
  uniqueSlug: vi.fn((base: string) => base),
  ensureUniqueSlug: vi.fn((base: string) => base),
}))

vi.mock('@/lib/storage', () => ({
  uploadQuizBank: vi.fn(),
  uploadApunteHtml: uploadApunteHtmlMock,
  deleteApunteHtml: deleteApunteHtmlMock,
  MAX_APUNTE_HTML_BYTES: 3 * 1024 * 1024,
  APUNTE_HTML_MIME: 'text/html; charset=utf-8',
  deleteQuizBank: vi.fn(),
  deleteSubjectStorage: vi.fn(),
  deleteYearStorage: vi.fn(),
  listQuizBankContributionRevocations: listQuizBankContributionRevocationsMock,
}))

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
  getSubjectDeleteImpact: getSubjectDeleteImpactMock,
  getYearDeleteImpact: vi.fn(),
}))

vi.mock('@/lib/recursos', () => ({
  detectarRecurso: detectarRecursoMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  AUDIT_ACTIONS: {
    APUNTE_CREATED: 'APUNTE_CREATED',
    APUNTE_UPDATED: 'APUNTE_UPDATED',
    APUNTE_DELETED: 'APUNTE_DELETED',
  },
  recordAudit: recordAuditMock,
}))

vi.mock('@/lib/contributions', () => ({
  awardApunteCreated: awardApunteCreatedMock,
  adjustContributionScore: adjustContributionScoreMock,
  awardEventoCreated: vi.fn(),
  awardQuizBankCreated: vi.fn(),
  revokeApunteCreated: revokeApunteCreatedMock,
  revokeContributionBatch: revokeContributionBatchMock,
  revokeEventoCreated: vi.fn(),
  revokeQuizBankCreated: vi.fn(),
}))

vi.mock('@/lib/domain/quiz-bank', () => ({
  parseQuizBank: vi.fn(),
}))

function makeFormData(entries: Record<string, string>) {
  const formData = new FormData()
  if (!('categoriaIdsJson' in entries)) {
    formData.set('categoriaIdsJson', JSON.stringify(['cat-otro']))
  }

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value)
  }

  return formData
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()

  sanitizeRichHtmlMock.mockImplementation((html) => String(html))
  detectarRecursoMock.mockImplementation((url: string) => {
    if (url.includes('youtube.com')) return { tipo: 'YOUTUBE' }
    if (url.includes('drive.google.com')) return { tipo: 'DRIVE' }
    return null
  })
  prismaMock.subject.findUnique.mockResolvedValue({
    year: { slug: 'primer-anio' },
    commissions: [],
  })
  prismaMock.apunte.findMany.mockResolvedValue([])
  prismaMock.apunte.findFirst.mockResolvedValue(null)
  prismaMock.apunteRecurso.createMany.mockResolvedValue(undefined)
  prismaMock.categoria.findMany.mockResolvedValue([{ id: 'cat-otro' }])
  prismaMock.$transaction.mockImplementation(async (callback) => callback({
    apunte: {
      create: prismaMock.apunte.create,
      update: vi.fn().mockResolvedValue(undefined),
    },
    apunteRecurso: {
      deleteMany: vi.fn().mockResolvedValue(undefined),
      createMany: vi.fn().mockResolvedValue(undefined),
    },
    apunteCategoria: {
      deleteMany: vi.fn().mockResolvedValue(undefined),
      createMany: vi.fn().mockResolvedValue(undefined),
    },
  }))
  requireAnyAdminMock.mockResolvedValue({ id: 'admin-1' })
  recordAuditMock.mockResolvedValue(undefined)
  uploadApunteHtmlMock.mockResolvedValue('apuntes/primer-anio/calculo/apunte-1/html-1.html')
  deleteApunteHtmlMock.mockResolvedValue(undefined)
  awardApunteCreatedMock.mockResolvedValue(undefined)
  adjustContributionScoreMock.mockResolvedValue(undefined)
  revokeApunteCreatedMock.mockResolvedValue(undefined)
  revokeContributionBatchMock.mockResolvedValue(undefined)
  listQuizBankContributionRevocationsMock.mockResolvedValue([])
})

describe('admin apunte actions', () => {
  it('revalida latest-apuntes al crear un apunte', async () => {
    requireYearAdminForSubjectIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      commissionSlugs: [],
      admin: { id: 'admin-1' },
    })
    prismaMock.apunte.create.mockResolvedValue({ id: 'apunte-1' })

    const { createApunteAction } = await import('./actions')
    const result = await createApunteAction(
      { ok: false, message: '' },
      makeFormData({
        subjectId: 'subject-1',
        titulo: 'Resumen parcial',
        descripcionHtml: '<p>Temas clave</p>',
        recursosJson: '[]',
      }),
    )

    expect(result).toMatchObject({ ok: true, message: 'Apunte creado correctamente.' })
    expect(updateTagMock).toHaveBeenCalledWith('latest-apuntes')
    expect(updateTagMock).toHaveBeenCalledWith('upcoming-events')
    expect(updateTagMock).toHaveBeenCalledWith('year:primer-anio')
    expect(prismaMock.subject.findUnique).not.toHaveBeenCalled()
  })

  it('revalida latest-apuntes al editar un apunte', async () => {
    requireYearAdminForApunteIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      yearId: 'year-1',
      commissionSlugs: [],
      admin: { id: 'admin-1' },
    })
    prismaMock.apunte.findUnique.mockResolvedValue({
      slug: 'resumen-actual',
      subjectId: 'subject-1',
      _count: { recursos: 0 },
      recursos: [],
    })

    const { updateApunteAction } = await import('./actions')
    const result = await updateApunteAction(
      { ok: false, message: '' },
      makeFormData({
        apunteId: 'apunte-1',
        titulo: 'Resumen actualizado',
        descripcionHtml: '<p>Más claro</p>',
        recursosJson: '[]',
      }),
    )

    expect(result).toEqual({ ok: true, message: 'Apunte actualizado correctamente.' })
    expect(updateTagMock).toHaveBeenCalledWith('latest-apuntes')
  })

  it('reemplaza un apunte interactivo sin borrar el archivo anterior antes de guardar', async () => {
    requireYearAdminForApunteIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      yearId: 'year-1',
      commissionSlugs: [],
      admin: { id: 'admin-1' },
    })
    prismaMock.apunte.findUnique.mockResolvedValue({
      slug: 'resumen-actual',
      subjectId: 'subject-1',
      createdByUserId: 'admin-1',
      _count: { recursos: 1 },
      recursos: [
        {
          storageKey: 'apuntes/primer-anio/calculo/apunte-1/old.html',
          mimeType: 'text/html; charset=utf-8',
          sizeBytes: 120,
        },
      ],
    })
    const formData = makeFormData({
      apunteId: 'apunte-1',
      titulo: 'Resumen actualizado',
      descripcionHtml: '<p>Más claro</p>',
      recursosJson: JSON.stringify([
        {
          tipo: 'HTML',
          localId: 'recurso-html-1',
          url: '',
          orden: 0,
          nombre: 'Interactivo nuevo',
        },
      ]),
    })
    formData.set(
      'htmlFile:recurso-html-1',
      new File(['<!doctype html><html><body>Nuevo</body></html>'], 'nuevo.html', {
        type: 'text/html',
      }),
    )

    const { updateApunteAction } = await import('./actions')
    const result = await updateApunteAction({ ok: false, message: '' }, formData)

    expect(result).toEqual({ ok: true, message: 'Apunte actualizado correctamente.' })
    expect(uploadApunteHtmlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apunteId: 'apunte-1',
        yearSlug: 'primer-anio',
        subjectSlug: 'calculo',
      }),
    )
    expect(deleteApunteHtmlMock).toHaveBeenCalledWith([
      'apuntes/primer-anio/calculo/apunte-1/old.html',
    ])
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        yearId: 'year-1',
        yearSlug: 'primer-anio',
      }),
    )
  })

  it('ajusta el puntaje del creador cuando cambia la cantidad de recursos', async () => {
    requireYearAdminForApunteIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      yearId: 'year-1',
      commissionSlugs: [],
      admin: { id: 'admin-2' },
    })
    prismaMock.apunte.findUnique.mockResolvedValue({
      slug: 'resumen-actual',
      subjectId: 'subject-1',
      createdByUserId: 'admin-1',
      _count: { recursos: 1 },
      recursos: [],
    })

    const { updateApunteAction } = await import('./actions')
    const result = await updateApunteAction(
      { ok: false, message: '' },
      makeFormData({
        apunteId: 'apunte-1',
        titulo: 'Resumen actualizado',
        descripcionHtml: '<p>Más claro</p>',
        recursosJson: JSON.stringify([
          { tipo: 'YOUTUBE', url: 'https://youtube.com/watch?v=abc', orden: 0, nombre: 'Video' },
          { tipo: 'DRIVE', url: 'https://drive.google.com/file/d/123/view', orden: 1, nombre: 'Guía' },
        ]),
      }),
    )

    expect(result).toEqual({ ok: true, message: 'Apunte actualizado correctamente.' })
    expect(adjustContributionScoreMock).toHaveBeenCalledWith('admin-1', 1)
  })

  it('revalida latest-apuntes al eliminar un apunte', async () => {
    requireYearAdminForApunteIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      commissionSlugs: [],
      admin: { id: 'admin-1' },
    })
    prismaMock.apunte.findUnique.mockResolvedValue({
      titulo: 'Resumen viejo',
      createdByUserId: 'admin-1',
      _count: { recursos: 2 },
      recursos: [],
    })
    prismaMock.apunte.delete.mockResolvedValue(undefined)

    const { deleteApunteAction } = await import('./actions')
    await deleteApunteAction(makeFormData({ id: 'apunte-1' }))

    expect(updateTagMock).toHaveBeenCalledWith('latest-apuntes')
    expect(revokeApunteCreatedMock).toHaveBeenCalledWith('admin-1', 2)
  })

  it('valida backend antes de subir un apunte interactivo', async () => {
    requireYearAdminForSubjectIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      commissionSlugs: [],
      admin: { id: 'admin-1' },
    })
    prismaMock.apunte.create.mockResolvedValue({ id: 'apunte-1' })

    const formData = makeFormData({
      subjectId: 'subject-1',
      titulo: 'Laboratorio HTML',
      descripcionHtml: '<p>Interactivo</p>',
      recursosJson: JSON.stringify([
        { tipo: 'HTML', localId: 'html-1', orden: 0, nombre: 'Demo' },
      ]),
    })
    formData.set('htmlFile:html-1', new File(['no soy html'], 'demo.txt', { type: 'text/plain' }))

    const { createApunteAction } = await import('./actions')
    const result = await createApunteAction({ ok: false, message: '' }, formData)

    expect(result).toEqual({ ok: false, message: 'El archivo debe ser HTML, JSX o TSX.' })
    expect(uploadApunteHtmlMock).not.toHaveBeenCalled()
    expect(prismaMock.apunte.delete).toHaveBeenCalledWith({ where: { id: 'apunte-1' } })
  })

  it('rechaza un apunte interactivo que supera el límite de 3 MB sin escribir', async () => {
    requireYearAdminForSubjectIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      commissionSlugs: [],
      admin: { id: 'admin-1' },
    })
    prismaMock.apunte.create.mockResolvedValue({ id: 'apunte-1' })

    const formData = makeFormData({
      subjectId: 'subject-1',
      titulo: 'Laboratorio HTML',
      descripcionHtml: '<p>Interactivo</p>',
      recursosJson: JSON.stringify([
        { tipo: 'HTML', localId: 'html-1', orden: 0, nombre: 'Demo' },
      ]),
    })
    const oversized = new File(
      [`<!doctype html><html><body>${'x'.repeat(3 * 1024 * 1024 + 1 - '<!doctype html><html><body></body></html>'.length)}</body></html>`],
      'oversized.html',
      { type: 'text/html' },
    )
    expect(oversized.size).toBeGreaterThan(3 * 1024 * 1024)
    formData.set('htmlFile:html-1', oversized)

    const { createApunteAction } = await import('./actions')
    const result = await createApunteAction({ ok: false, message: '' }, formData)

    expect(result).toEqual({ ok: false, message: 'El HTML no puede superar los 3 MB.' })
    expect(uploadApunteHtmlMock).not.toHaveBeenCalled()
    expect(prismaMock.apunteRecurso.createMany).not.toHaveBeenCalled()
  })

  it('sube recursos HTML validados y los registra en el apunte', async () => {
    requireYearAdminForSubjectIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      commissionSlugs: [],
      admin: { id: 'admin-1' },
    })
    prismaMock.apunte.create.mockResolvedValue({ id: 'apunte-1' })

    const formData = makeFormData({
      subjectId: 'subject-1',
      titulo: 'Laboratorio HTML',
      descripcionHtml: '<p>Interactivo</p>',
      recursosJson: JSON.stringify([
        { tipo: 'HTML', localId: 'html-1', orden: 0, nombre: 'Demo' },
      ]),
    })
    formData.set(
      'htmlFile:html-1',
      new File(['<!doctype html><html><body>Demo</body></html>'], 'demo.html', { type: 'text/html' }),
    )

    const { createApunteAction } = await import('./actions')
    const result = await createApunteAction({ ok: false, message: '' }, formData)

    expect(result).toMatchObject({ ok: true, message: 'Apunte creado correctamente.' })
    expect(uploadApunteHtmlMock).toHaveBeenCalledWith({
      yearSlug: 'primer-anio',
      subjectSlug: 'calculo',
      apunteId: 'apunte-1',
      html: '<!doctype html><html><body>Demo</body></html>',
    })
    expect(prismaMock.apunteRecurso.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        tipo: 'HTML',
        storageKey: 'apuntes/primer-anio/calculo/apunte-1/html-1.html',
        mimeType: 'text/html; charset=utf-8',
      })],
    })
  })

  it('sube recursos interactivos en paralelo y conserva el orden del formulario', async () => {
    requireYearAdminForSubjectIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      commissionSlugs: [],
      admin: { id: 'admin-1' },
    })
    prismaMock.apunte.create.mockResolvedValue({ id: 'apunte-1' })

    let resolveFirst!: (key: string) => void
    let resolveSecond!: (key: string) => void
    uploadApunteHtmlMock
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve }))

    const formData = makeFormData({
      subjectId: 'subject-1',
      titulo: 'Laboratorios',
      descripcionHtml: '<p>Interactivos</p>',
      recursosJson: JSON.stringify([
        { tipo: 'HTML', localId: 'html-1', orden: 7, nombre: 'Primero' },
        { tipo: 'HTML', localId: 'html-2', orden: 3, nombre: 'Segundo' },
      ]),
    })
    formData.set(
      'htmlFile:html-1',
      new File(['<!doctype html><html><body>Uno</body></html>'], 'uno.html', {
        type: 'text/html',
      }),
    )
    formData.set(
      'htmlFile:html-2',
      new File(['<!doctype html><html><body>Dos</body></html>'], 'dos.html', {
        type: 'text/html',
      }),
    )

    const { createApunteAction } = await import('./actions')
    const action = createApunteAction({ ok: false, message: '' }, formData)

    await vi.waitFor(() => expect(uploadApunteHtmlMock).toHaveBeenCalledTimes(2))
    resolveSecond('apuntes/primer-anio/calculo/apunte-1/segundo.html')
    resolveFirst('apuntes/primer-anio/calculo/apunte-1/primero.html')

    await expect(action).resolves.toMatchObject({ ok: true })
    expect(prismaMock.apunteRecurso.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          nombre: 'Primero',
          orden: 0,
          storageKey: 'apuntes/primer-anio/calculo/apunte-1/primero.html',
        }),
        expect.objectContaining({
          nombre: 'Segundo',
          orden: 1,
          storageKey: 'apuntes/primer-anio/calculo/apunte-1/segundo.html',
        }),
      ],
    })
  })

  it('compila recursos TSX y registra el HTML resultante', async () => {
    requireYearAdminForSubjectIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      commissionSlugs: [],
      admin: { id: 'admin-1' },
    })
    prismaMock.apunte.create.mockResolvedValue({ id: 'apunte-1' })

    const formData = makeFormData({
      subjectId: 'subject-1',
      titulo: 'Calculadora interactiva',
      descripcionHtml: '<p>Interactivo</p>',
      recursosJson: JSON.stringify([
        { tipo: 'HTML', localId: 'react-1', orden: 0, nombre: 'Calculadora' },
      ]),
    })
    formData.set(
      'htmlFile:react-1',
      new File([
        `import { useState } from 'react'

        export default function Calculadora() {
          const [valor, setValor] = useState(1)
          return <button onClick={() => setValor(valor + 1)}>Resultado {valor}</button>
        }`,
      ], 'calculadora.tsx', { type: '' }),
    )

    const { createApunteAction } = await import('./actions')
    const result = await createApunteAction({ ok: false, message: '' }, formData)

    expect(result).toMatchObject({ ok: true, message: 'Apunte creado correctamente.' })
    expect(uploadApunteHtmlMock).toHaveBeenCalledWith(expect.objectContaining({
      yearSlug: 'primer-anio',
      subjectSlug: 'calculo',
      apunteId: 'apunte-1',
      html: expect.stringContaining('<div id="root"></div>'),
    }))
    expect(prismaMock.apunteRecurso.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        tipo: 'HTML',
        storageKey: 'apuntes/primer-anio/calculo/apunte-1/html-1.html',
        mimeType: 'text/html; charset=utf-8',
      })],
    })
  })
})

describe('getSubjectDeleteImpactAction', () => {
  it('exige permiso de gestión académica antes de leer el impacto', async () => {
    // Un ayudante: requireAcademicManager redirige (modelado como throw).
    const redirectError = new Error('NEXT_REDIRECT')
    requireAcademicManagerMock.mockRejectedValue(redirectError)

    const { getSubjectDeleteImpactAction } = await import('./actions')

    await expect(
      getSubjectDeleteImpactAction(makeFormData({ id: 'subject-1' })),
    ).rejects.toThrow('NEXT_REDIRECT')

    // La compuerta corre ANTES de resolver el scope o leer el impacto.
    expect(requireYearAdminForSubjectIdMock).not.toHaveBeenCalled()
    expect(getSubjectDeleteImpactMock).not.toHaveBeenCalled()
  })

  it('devuelve el impacto cuando el usuario es gestor académico del año', async () => {
    requireAcademicManagerMock.mockResolvedValue({ id: 'admin-1' })
    requireYearAdminForSubjectIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      admin: { id: 'admin-1' },
    })
    const impact = { apuntes: 3, eventos: 1, comisiones: 2, bancos: 0 }
    getSubjectDeleteImpactMock.mockResolvedValue(impact)

    const { getSubjectDeleteImpactAction } = await import('./actions')
    const result = await getSubjectDeleteImpactAction(makeFormData({ id: 'subject-1' }))

    expect(requireAcademicManagerMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(impact)
  })
})

describe('deleteSubjectAction', () => {
  it('revoca tambien los quiz banks al borrar una materia', async () => {
    requireAcademicManagerMock.mockResolvedValue({ id: 'admin-1' })
    requireYearAdminForSubjectIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      yearId: 'year-1',
      admin: { id: 'admin-1' },
    })
    prismaMock.subject.findUnique.mockResolvedValue({
      nombre: 'Calculo',
      apuntes: [],
      agendas: [],
    })
    prismaMock.subject.delete.mockResolvedValue(undefined)
    listQuizBankContributionRevocationsMock.mockResolvedValue([
      { ownerId: 'user-1', unitsCount: 3 },
    ])

    const { deleteSubjectAction } = await import('./actions')
    await deleteSubjectAction(makeFormData({ id: 'subject-1' }))

    expect(revokeContributionBatchMock).toHaveBeenCalledWith('user-1', {
      apuntesCreados: 0,
      eventosCreados: 0,
      bancosPreguntasCreados: 1,
      puntaje: 4,
    })
  })
})

describe('deleteYearAction', () => {
  it('invalida los bancos de cada materia eliminada', async () => {
    requireGeneralAdminMock.mockResolvedValue({ id: 'admin-1' })
    prismaMock.academicYear.findUnique.mockResolvedValue({
      slug: 'primer-anio',
      nombre: 'Primer año',
      subjects: [
        {
          slug: 'calculo',
          apuntes: [],
          agendas: [],
        },
      ],
    })
    prismaMock.academicYear.delete.mockResolvedValue(undefined)

    const { deleteYearAction } = await import('./actions')
    await deleteYearAction(makeFormData({ id: 'year-1' }))

    expect(updateTagMock).toHaveBeenCalledWith('quiz-bank-tag')
  })
})
