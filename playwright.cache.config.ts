import { defineConfig, devices } from '@playwright/test'
if (process.env.CACHE_REGRESSION_ISOLATED !== '1') {
  throw new Error('Use pnpm test:cache with a disposable local fixture; never run this config in the main checkout')
}
export default defineConfig({
  testDir: './tests', testMatch: 'cache-regression.spec.ts',
  workers: 1, fullyParallel: false, retries: 0, timeout: 120_000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3100', ...devices['Desktop Chrome'], trace: 'off', screenshot: 'off' },
  webServer: {
    command: 'pnpm --config.verify-deps-before-run=false exec next start --hostname 127.0.0.1 -p 3100',
    url: 'http://127.0.0.1:3100', reuseExistingServer: false, timeout: 120_000,
  },
})
