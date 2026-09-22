import { test, expect } from '@playwright/test';
import { asymptotics } from '../../src/content/asymptotics';

test('каждый новый шаг первообразных и асимптотик меняет рисунок', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const lesson of asymptotics) {
    await page.goto('./#' + lesson.id);
    await expect(page.locator('[data-testid="scene"] svg').first()).toBeVisible();
    for (let step = 0; step < lesson.steps.length; step++) {
      await page.locator('.steps button').nth(step).click();
      const timeline = page.getByRole('slider', { name: 'Ход текущего шага', exact: true });
      await timeline.press('Home');
      const before = await page
        .locator('[data-testid="scene"] svg')
        .evaluateAll((nodes) => nodes.map((node) => node.innerHTML).join(''));
      await timeline.press('End');
      await expect
        .poll(() =>
          page
            .locator('[data-testid="scene"] svg')
            .evaluateAll((nodes) => nodes.map((node) => node.innerHTML).join('')),
        )
        .not.toBe(before);
      await expect(page.locator('.katex-error')).toHaveCount(0);
    }
  }
  expect(errors).toEqual([]);
});

test('заблокированный на следующем шаге параметр сохраняется после перезагрузки', async ({
  page,
}) => {
  await page.goto('./#series-tail?step=2');
  await page.getByRole('slider', { name: 'Членов в хвосте m', exact: true }).press('End');
  await page.locator('.steps button').nth(3).click();
  const before = await page.locator('.scene-metrics').innerText();
  const url = page.url();
  await page.reload();
  await expect.poll(() => page.locator('.scene-metrics').innerText()).toBe(before);
  await expect(page.getByRole('slider', { name: 'Членов в хвосте m', exact: true })).toHaveValue(
    '24',
  );
  expect(page.url()).toBe(url);
});

test('поиск по номеру открывает относящийся к билету шаг', async ({ page }) => {
  await page.goto('./#path');
  await page.getByLabel('Поиск билета', { exact: true }).fill('1.2.14');
  await page.locator('.lesson-link').click();
  await expect(page.locator('.explanation h2')).toHaveText('Штольц: телескоп вместо Коши');
});
