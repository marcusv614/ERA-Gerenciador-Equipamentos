import { test, expect } from './test.mjs';

test.beforeEach(async ({ page }) => { await page.goto('/qa-browser/fixture.html'); });

test('QA-A11Y-01: modal captura Tab e Shift+Tab e restaura foco ao fechar', async ({ page }) => {
  const abrir = page.getByRole('button', { name: 'Abrir diálogo', exact: true });
  await abrir.click();
  const modal = page.getByRole('dialog', { name: 'Diálogo QA', exact: true });
  await expect(modal).toBeFocused(); await expect(modal).toHaveAttribute('aria-modal', 'true');
  await page.keyboard.press('Tab'); await expect(modal.getByRole('button', { name: 'Fechar', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(modal.getByRole('button', { name: 'Abrir filho' })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(modal.getByRole('button', { name: 'Fechar', exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(modal).toHaveCount(0); await expect(abrir).toBeFocused();
});

test('QA-A11Y-02: Escape fecha somente o modal superior e mantém rolagem bloqueada', async ({ page }) => {
  await page.getByRole('button', { name: 'Abrir diálogo', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir filho' }).click();
  await expect(page.getByRole('dialog', { name: 'Filho QA', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Filho QA', exact: true })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Diálogo QA', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await expect(page.getByRole('button', { name: 'Abrir filho' })).toBeFocused();
  await page.keyboard.press('Escape'); expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('QA-A11Y-03: abertura repetida não deixa listeners ou bloqueio de rolagem', async ({ page }) => {
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Abrir diálogo', exact: true }).click();
    await page.getByRole('dialog', { name: 'Diálogo QA', exact: true }).getByRole('button', { name: 'Fechar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  }
});
