import { test, expect } from '@playwright/test'

/**
 * Feature: Quiz navigation and the global home calendar.
 * H1: The banner's padding navigates just like its visible CTA (navigation risk).
 * H2: A public visitor never receives upload controls (permission risk).
 * H3: A configured mobile visitor can expand/collapse their calendar without leaving home.
 * H4: Desktop sidebar omits the redundant career heading (visual regression).
 * Public read-only routes; no accounts, uploads, or shared database writes.
 */
test('quiz banner › clicking its outer padding › opens the quiz', async ({ page }) => {
  await page.goto('/cuarto/bases-de-datos-avanzadas')
  const banner = page.getByRole('link', { name: /Quiz de Bases de Datos Avanzadas/ })
  await expect(banner).toBeVisible()
  await banner.click({ position: { x: 5, y: 5 } })
  await expect(page).toHaveURL(/\/cuarto\/bases-de-datos-avanzadas\/quiz$/)
  await expect(page.getByRole('heading', { name: /Quiz · Bases de Datos Avanzadas/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Subir banco de preguntas', exact: true })).toHaveCount(0)
})

test('mobile home › calendar toggle › expands and collapses without navigation', async ({ page, context }) => {
  await context.addCookies([{ name: 'nextcampus_user_preferences_v1', value: encodeURIComponent(JSON.stringify({ hiddenYears: [], hiddenSubjects: [], hiddenCommissions: [] })), domain: 'localhost', path: '/' }])
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => localStorage.setItem('nextcampus_user_preferences_v1', JSON.stringify({
    hiddenYears: [], hiddenSubjects: [], hiddenCommissions: [],
  })))
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver calendario', exact: true }).click()
  const toggle = page.getByRole('button', { name: 'Ocultar calendario', exact: true })
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#home-mobile-calendar')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mes anterior' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  await toggle.click()
  await expect(page.locator('#home-mobile-calendar')).toBeHidden()
  await expect(page).toHaveURL(/\/$/)
})

test('desktop home › sidebar › does not repeat the career heading', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Licenciatura en Sistemas de Información' })).toBeVisible()
  const sidebar = page.getByRole('complementary')
  await expect(sidebar.getByText('Licenciatura en Sistemas de Información')).toHaveCount(0)
  await expect(sidebar.getByText('Carrera', { exact: true })).toHaveCount(0)
})
