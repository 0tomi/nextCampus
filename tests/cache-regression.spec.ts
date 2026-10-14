/**
 * Production hypotheses: bounded feeds preserve every preference subset; lean
 * counts retain history; content actions refresh dependent readers only; logout
 * removes private access without expiring warmed academic cache entries.
 * Each test logs in independently. Only disposable fixture rows are mutated.
 */
import { readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { test, expect, type Page } from '@playwright/test'

const state = JSON.parse(readFileSync(process.env.CACHE_FIXTURE_PATH!, 'utf8')) as {
  email: string; password: string; bucket: string; bankId: string; htmlKey: string
}
type Event = { id: string; titulo: string; fecha: string; apuntes: { titulo: string }[] }
type Snapshot = {
  equivalent: boolean; fullCount: number; admin: boolean; recent: { id: string }[];
  note: { apunte: { titulo: string } }; sibling: unknown; quiz: unknown;
  events: Event[]; history: unknown[];
  mobile: { subjects: { slug: string; commissions: { id: string }[]; agenda: { eventos: { commissionId: string | null }[] } | null }[] }
}
async function snapshot(page: Page): Promise<Snapshot> {
  return JSON.parse(await page.getByTestId('cache-snapshot').innerText()) as Snapshot
}
async function counts() {
  const lines = (await readFile(process.env.CACHE_COUNTER_FILE!, 'utf8')).trim().split('\n').filter(Boolean)
  return lines.reduce<Record<string, number>>((result, line) => {
    const entry = JSON.parse(line) as { name: string; args: string[] }
    const key = `${entry.name}:${entry.args.join(':')}`
    result[key] = (result[key] ?? 0) + 1
    return result
  }, {})
}
async function warm(page: Page) {
  await page.goto('/cache-regression-probe')
  await expect(page.getByTestId('cache-snapshot')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('cache-snapshot')).toBeVisible()
  return counts()
}
async function submitMutation(page: Page, button: string) {
  const completed = page.waitForResponse((response) => response.url().includes('/cache-regression-probe') && response.request().method() === 'POST')
  await page.getByRole('button', { name: button, exact: true }).click()
  expect((await completed).ok()).toBe(true)
}
function resetCacheMutationFixture(kind: 'event' | 'note') {
  // Prisma's generated ESM client is executed through tsx, not Playwright's CJS loader.
  execFileSync('pnpm', ['--config.verify-deps-before-run=false', 'exec', 'tsx', 'tests/fixtures/cache-regression.ts', `--reset-${kind}`], { env: process.env, stdio: 'pipe' })
}
test.beforeEach(async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByLabel('Email', { exact: true }).fill(state.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(state.password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page).not.toHaveURL(/\/admin\/login/)
})

test('real bounded SQL preserves preferences, count DTOs and calendar history', async ({ page }) => {
  await warm(page)
  const data = await snapshot(page)
  expect(data.admin).toBe(true)
  expect(data.equivalent).toBe(true)
  expect(data.fullCount).toBe(24)
  expect(data.recent).toHaveLength(10)
  expect(data.history).toHaveLength(4)
  expect(data.events.some((event) => event.fecha === '2026-01-01')).toBe(true)
  expect(data.events.some((event) => event.fecha === '2099-01-01')).toBe(true)
  for (const subject of data.mobile.subjects) {
    expect(subject.agenda?.eventos).toHaveLength(2)
    expect(subject.agenda?.eventos).toEqual([{ commissionId: null }, { commissionId: `commission-${subject.slug}` }])
    expect(Object.keys(subject.commissions[0]).sort()).toEqual(['id', 'nombre', 'slug'])
  }
  const before = await counts()
  await page.reload()
  await expect(page.getByTestId('cache-snapshot')).toBeVisible()
  expect(await counts()).toEqual(before)
})

test('real event action refreshes event readers without evicting note, quiz or another year', async ({ page, request }) => {
  await resetCacheMutationFixture('event')
  const before = await warm(page)
  await submitMutation(page, 'Update fixture event')
  await expect.poll(async () => (await snapshot(page)).events.find((event) => event.id === 'event-noisy-1')?.titulo).toBe('Updated fixture event')
  await page.reload()
  await expect(page.getByTestId('cache-snapshot')).toBeVisible()
  const after = await counts()
  for (const key of ['getApuntePageBySlug:noisy:note-0', 'getApuntePageBySlug:noisy:note-1', 'getSubjectQuizMeta:noisy', 'getYearBySlug:segundo']) expect(after[key]).toBe(before[key])
  for (const key of ['getSubjectPageBySlug:noisy', 'getYearBySlug:primero', 'getHomeCalendarEvents:']) expect(after[key]).toBeGreaterThan(before[key])
  const publicSubject = await request.get('/primero/noisy')
  expect(publicSubject.ok()).toBe(true)
  expect(await publicSubject.text()).toContain('Updated fixture event')
})

test('linked note title refreshes note and event projections, preserving sibling and quiz', async ({ page, request }) => {
  await resetCacheMutationFixture('note')
  const before = await warm(page)
  await submitMutation(page, 'Update fixture note')
  await expect.poll(async () => (await snapshot(page)).events.find((event) => event.id === 'event-noisy-1')?.apuntes[0]?.titulo).toBe('Updated linked fixture note')
  await page.reload()
  await expect(page.getByTestId('cache-snapshot')).toBeVisible()
  const after = await counts()
  for (const key of ['getApuntePageBySlug:noisy:note-1', 'getSubjectQuizMeta:noisy', 'getYearBySlug:segundo']) expect(after[key]).toBe(before[key])
  for (const key of ['getApuntePageBySlug:noisy:note-0', 'getHomeCalendarEvents:', 'getLatestApuntes:', 'getLatestApuntesByYear:primero']) expect(after[key]).toBeGreaterThan(before[key])
  expect((await snapshot(page)).equivalent).toBe(true)
  const publicNote = await request.get('/primero/noisy/apuntes/note-0')
  expect(publicNote.ok()).toBe(true)
  expect(await publicNote.text()).toContain('Updated linked fixture note')
})

test('logout clears session and private access while keeping academic entries warm', async ({ page, request }) => {
  await warm(page)
  // Capture the real browser action protocol, not a guessed multipart action ID.
  const isAction = (url: string, method: string) => url.includes('/cache-regression-probe') && method === 'POST'
  const [actionRequest] = await Promise.all([
    page.waitForRequest((req) => isAction(req.url(), req.method())),
    page.waitForResponse((response) => isAction(response.url(), response.request().method())),
    page.getByRole('button', { name: 'Update fixture event', exact: true }).click(),
  ])
  const actionHeaders = actionRequest.headers()
  const actionBody = actionRequest.postDataBuffer()
  expect(actionHeaders['next-action']).toBeTruthy()
  expect(actionBody).toBeTruthy()
  await page.reload()
  await expect(page.getByTestId('cache-snapshot')).toBeVisible()
  const before = await counts()
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await expect(page).toHaveURL('http://127.0.0.1:3100/')
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toHaveCount(0)
  const protectedResponse = await page.request.get('/admin/perfil')
  expect(protectedResponse.url()).toContain('/admin/login')
  const probe = await page.request.get('/cache-regression-probe')
  expect(await probe.text()).not.toContain('data-testid="cache-snapshot"')
  const deniedAction = await request.post('/cache-regression-probe', {
    headers: {
      Origin: 'http://127.0.0.1:3100', Accept: 'text/x-component',
      'Next-Action': actionHeaders['next-action'], 'Content-Type': actionHeaders['content-type'],
    },
    data: actionBody!,
  })
  expect(deniedAction.headers()['x-action-redirect'] ?? deniedAction.url()).toContain('/admin/login')
  // Anonymous public rendering must not contain admin details or bank answers.
  const subject = await request.get('/primero/noisy')
  const html = await subject.text()
  expect(html).not.toContain(state.email)
  expect(html).not.toContain('PRIVATE_ANSWER_SENTINEL')
  expect(html).not.toContain(process.env.SUPABASE_SECRET_KEY!)
  const privateObject = await request.get(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${state.bucket}/${state.htmlKey}`)
  expect(privateObject.ok()).toBe(false)
  const after = await counts()
  for (const [key, value] of Object.entries(before)) expect(after[key]).toBe(value)
  await page.goBack()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toHaveCount(0)
})
