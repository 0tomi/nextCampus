import { describe, expect, it, vi } from 'vitest'

const findUniqueMock = vi.fn()
const readApunteHtmlMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    apunteRecurso: {
      findUnique: findUniqueMock,
    },
  },
}))

vi.mock('@/lib/storage', () => ({
  readApunteHtml: readApunteHtmlMock,
}))

describe('apunte recurso preview route', () => {
  it('sirve apuntes interactivos con sandbox mínimo de scripts', async () => {
    findUniqueMock.mockResolvedValue({ tipo: 'HTML', storageKey: 'apuntes/demo.html' })
    readApunteHtmlMock.mockResolvedValue('<!doctype html><html><body><script>window.ok = true</script></body></html>')

    const { GET } = await import('./route')
    const response = await GET(new Request('https://nextcampus.test/api/apuntes/recursos/r1/preview'), {
      params: Promise.resolve({ recursoId: 'r1' }),
    })

    const csp = response.headers.get('Content-Security-Policy') ?? ''
    expect(response.status).toBe(200)
    expect(csp).toContain('sandbox allow-scripts')
    expect(csp).not.toContain('allow-popups')
    expect(csp).not.toContain('allow-downloads')
    expect(csp).not.toContain('allow-forms')
    expect(csp).not.toContain('allow-same-origin')
    expect(csp).toContain("connect-src https://esm.sh")
    expect(csp).toContain("form-action 'none'")
  })

  it('adjunta Content-Disposition si viene download=1 con el nombre sanitizado', async () => {
    findUniqueMock.mockResolvedValue({
      tipo: 'HTML',
      storageKey: 'apuntes/demo.html',
      nombre: 'Mi Recurso Eñe / Barra',
      apunte: { titulo: 'Titulo Apunte' },
    })
    readApunteHtmlMock.mockResolvedValue('<html></html>')

    const { GET } = await import('./route')
    const response = await GET(new Request('https://nextcampus.test/api/apuntes/recursos/r1/preview?download=1'), {
      params: Promise.resolve({ recursoId: 'r1' }),
    })

    expect(response.status).toBe(200)
    const contentDisposition = response.headers.get('Content-Disposition') ?? ''
    expect(contentDisposition).toContain('attachment;')
    expect(contentDisposition).toContain('filename="Mi Recurso E_e _ Barra.html"')
    expect(contentDisposition).toContain("filename*=UTF-8''Mi%20Recurso%20E%C3%B1e%20_%20Barra.html")
  })
})
