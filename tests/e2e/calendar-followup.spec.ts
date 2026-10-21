import { test, expect } from '@playwright/test'

/**
 * Public, read-only home regression checks. No shared data writes.
 * H1 (visual regression): a closed navigation dialog paints nothing, including its shadow.
 * H2 (agenda ambiguity): selecting a day hides the independent upcoming list;
 * clearing selection, changing month, and closing the calendar restore it.
 */
test.beforeEach(async ({ page, context }) => {
  const prefs = { hiddenYears: [], hiddenSubjects: [], hiddenCommissions: [] }
  await context.addCookies([{ name: 'nextcampus_user_preferences_v1', value: encodeURIComponent(JSON.stringify(prefs)), domain: 'localhost', path: '/' }])
  await page.addInitScript((value) => localStorage.setItem('nextcampus_user_preferences_v1', JSON.stringify(value)), prefs)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
})

test('mobile drawer › closed and reopened › paints only while open', async ({ page }) => {
  const drawer = page.getByRole('dialog', { name: 'Menú principal', includeHidden: true })
  await expect(drawer).toHaveCSS('display', 'none')
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click()
  await expect(drawer).toBeVisible()
  await expect(drawer).toHaveAttribute('open', '')
  await page.getByRole('button', { name: 'Cerrar menú', exact: true }).click()
  await expect(drawer).toHaveCSS('display', 'none')
  await expect(page.getByRole('button', { name: 'Abrir menú', exact: true })).toBeFocused()
})

test('mobile agenda › day selection › only the selected day remains until cleared', async ({ page }) => {
  await page.getByRole('button', { name: 'Ver calendario', exact: true }).click()
  const calendar = page.locator('#home-mobile-calendar')
  // This adjacent list is the independent home upcoming agenda, not calendar results.
  const upcoming = page.locator('#home-mobile-calendar + div')
  await expect(upcoming).toBeVisible()
  const day = calendar.getByRole('button', { name: '21', exact: true })
  await day.click()
  await expect(calendar.getByRole('button', { name: 'Ver mes', exact: true })).toBeVisible()
  await expect(upcoming).toBeHidden()
  await page.screenshot({ path: 'test-results/mobile-selected-day.png', fullPage: true, animations: 'disabled' })
  await calendar.getByRole('button', { name: 'Ver mes', exact: true }).click()
  await expect(upcoming).toBeVisible()
  await day.click()
  await expect(upcoming).toBeHidden()
  await day.click()
  await expect(upcoming).toBeVisible()
  await day.click()
  await calendar.getByRole('button', { name: 'Mes siguiente', exact: true }).click()
  await expect(upcoming).toBeVisible()
  await calendar.getByRole('button', { name: '21', exact: true }).click()
  await expect(upcoming).toBeHidden()
  await page.getByRole('button', { name: 'Ocultar calendario', exact: true }).click()
  await expect(upcoming).toBeVisible()
  await page.getByRole('button', { name: 'Ver calendario', exact: true }).click()
  await expect(calendar.getByRole('button', { name: 'Ver mes', exact: true })).toHaveCount(0)
  await expect(upcoming).toBeVisible()
})

test('desktop home › server-rendered shell slots › no missing-key warnings', async ({ page }) => {
  const keyWarnings: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /Each child in a list should have a unique/.test(message.text())) {
      keyWarnings.push(message.text())
    }
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Licenciatura en Sistemas de Información' })).toBeVisible()
  // Opening a hydrated control ensures the RSC slots have been reconciled.
  await page.getByRole('button', { name: 'Nosotros', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Sobre nosotros' })).toBeVisible()
  expect(keyWarnings).toEqual([])
  await page.getByRole('dialog', { name: 'Sobre nosotros' }).getByRole('button', { name: 'Cerrar', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Sobre nosotros' })).toBeHidden()
  await page.screenshot({ path: 'test-results/desktop-home-followup.png', fullPage: true, animations: 'disabled' })
})
