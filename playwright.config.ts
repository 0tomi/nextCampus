import { defineConfig, devices } from '@playwright/test'

/**
 * Configuración base de Playwright para NextCampus (Next.js / web).
 *
 * - Levanta el dev server con `pnpm dev` y reutiliza uno ya corriendo en local.
 * - Solo Chromium por ahora: alcanza para smoke tests de UI sin multiplicar tiempo.
 * - Los tests viven en `tests/e2e`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
