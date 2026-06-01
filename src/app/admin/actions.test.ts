import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePathMock = vi.fn()
const revalidateTagRawMock = vi.fn()
const requireGeneralAdminMock = vi.fn()
const requireAcademicManagerMock = vi.fn()
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

const prismaMock = {
  subject: {
    findUnique: vi.fn(),
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
  revalidateTag: revalidateTagRawMock,
}))

vi.mock('@/lib/auth', () => ({
  requireGeneralAdmin: requireGeneralAdminMock,
  requireAcademicManager: requireAcademicManagerMock,
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
  MAX_APUNTE_HTML_BYTES: 2 * 1024 * 1024,
  APUNTE_HTML_MIME: 'text/html; charset=utf-8',
  deleteQuizBank: vi.fn(),
  deleteSubjectStorage: vi.fn(),
  deleteYearStorage: vi.fn(),
  quizBanksCacheTag: vi.fn(() => 'quiz-bank-tag'),
}))

vi.mock('@/lib/queries', () => ({
  queryTags: {
    career: 'career',
    tiposEvento: 'tipos-evento',
    latestApuntes: 'latest-apuntes',
    upcomingEvents: 'upcoming-events',
    year: (slug: string) => `year:${slug}`,
    subject: (slug: string) => `subject:${slug}`,
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
  awardEventoCreated: vi.fn(),
  awardQuizBankCreated: vi.fn(),
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
  recordAuditMock.mockResolvedValue(undefined)
  uploadApunteHtmlMock.mockResolvedValue('apuntes/primer-anio/calculo/apunte-1/html-1.html')
  deleteApunteHtmlMock.mockResolvedValue(undefined)
  awardApunteCreatedMock.mockResolvedValue(undefined)
})

describe('admin apunte actions', () => {
  it('revalida latest-apuntes al crear un apunte', async () => {
    requireYearAdminForSubjectIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
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
    expect(revalidateTagRawMock).toHaveBeenCalledWith('latest-apuntes', 'max')
  })

  it('revalida latest-apuntes al editar un apunte', async () => {
    requireYearAdminForApunteIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      yearId: 'year-1',
      admin: { id: 'admin-1' },
    })
    prismaMock.apunte.findUnique.mockResolvedValue({
      slug: 'resumen-actual',
      subjectId: 'subject-1',
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
    expect(revalidateTagRawMock).toHaveBeenCalledWith('latest-apuntes', 'max')
  })

  it('reemplaza un apunte interactivo sin borrar el archivo anterior antes de guardar', async () => {
    requireYearAdminForApunteIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      yearId: 'year-1',
      admin: { id: 'admin-1' },
    })
    prismaMock.apunte.findUnique.mockResolvedValue({
      slug: 'resumen-actual',
      subjectId: 'subject-1',
      createdByUserId: 'admin-1',
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

  it('revalida latest-apuntes al eliminar un apunte', async () => {
    requireYearAdminForApunteIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
      admin: { id: 'admin-1' },
    })
    prismaMock.apunte.findUnique.mockResolvedValue({ titulo: 'Resumen viejo', recursos: [] })
    prismaMock.apunte.delete.mockResolvedValue(undefined)

    const { deleteApunteAction } = await import('./actions')
    await deleteApunteAction(makeFormData({ id: 'apunte-1' }))

    expect(revalidateTagRawMock).toHaveBeenCalledWith('latest-apuntes', 'max')
  })

  it('valida backend antes de subir un apunte interactivo', async () => {
    requireYearAdminForSubjectIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
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

  it('sube recursos HTML validados y los registra en el apunte', async () => {
    requireYearAdminForSubjectIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
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

  it('compila recursos TSX y registra el HTML resultante', async () => {
    requireYearAdminForSubjectIdMock.mockResolvedValue({
      subjectSlug: 'calculo',
      yearSlug: 'primer-anio',
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
