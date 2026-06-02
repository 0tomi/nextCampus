import { test, expect } from '@playwright/test'

/**
 * Feature: Migración de los modales a <dialog> nativo.
 * Modal bajo prueba: NosotrosModal (público, accesible desde "/" sin login).
 *
 * Por qué este modal: es el único primitivo migrado que se alcanza sin auth,
 * así que sirve de smoke test de la migración a <dialog> sin montar fixtures de sesión.
 *
 * QUÉ verificamos (comportamiento del usuario, no implementación):
 *  H1 — Al tocar "Nosotros", el modal abre y queda accesible por su nombre.
 *  H2 — Escape cierra el modal (evento `cancel` nativo ruteado a onClose).
 *  H3 — El botón "Cerrar" cierra el modal.
 *  H4 — Mientras el modal está abierto, el scroll del body queda bloqueado.
 *
 * VERIFICACIÓN ADICIONAL:
 *  - Cierre por click en backdrop: NosotrosModal permite cerrarse haciendo
 *    click por fuera de su caja en la pantalla (backdrop del dialog).
 *  - Focus-trap y Esc son garantizados por el navegador vía showModal(); no
 *    re-testeamos la implementación de Chromium.
 */

test.describe('NosotrosModal · migración a <dialog> nativo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('inicio › toca "Nosotros" › abre el modal con su nombre accesible', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Sobre nosotros' })
    await expect(dialog).toBeHidden()

    await page.getByRole('button', { name: 'Nosotros' }).click()

    await expect(dialog).toBeVisible()
  })

  test('modal abierto › presiona Escape › se cierra', async ({ page }) => {
    await page.getByRole('button', { name: 'Nosotros' }).click()
    const dialog = page.getByRole('dialog', { name: 'Sobre nosotros' })
    await expect(dialog).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(dialog).toBeHidden()
  })

  test('modal abierto › toca "Cerrar" › se cierra', async ({ page }) => {
    await page.getByRole('button', { name: 'Nosotros' }).click()
    const dialog = page.getByRole('dialog', { name: 'Sobre nosotros' })
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'Cerrar' }).click()

    await expect(dialog).toBeHidden()
  })

  test('modal abierto › el scroll del body queda bloqueado', async ({ page }) => {
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .not.toBe('hidden')

    await page.getByRole('button', { name: 'Nosotros' }).click()
    await expect(page.getByRole('dialog', { name: 'Sobre nosotros' })).toBeVisible()

    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe('hidden')
  })

  test('modal abierto › toca fuera del modal (backdrop) › se cierra', async ({ page }) => {
    await page.getByRole('button', { name: 'Nosotros' }).click()
    const dialog = page.getByRole('dialog', { name: 'Sobre nosotros' })
    await expect(dialog).toBeVisible()

    // Hacemos click en una zona fuera de las dimensiones del modal (arriba a la izquierda, x:10, y:10)
    await page.mouse.click(10, 10)

    await expect(dialog).toBeHidden()
  })
})
