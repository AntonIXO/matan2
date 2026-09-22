import { test, expect } from '@playwright/test';
import { foundations } from '../../src/content/foundations';

test('Новые сцены: каждый шаг действительно меняет геометрию', async ({ page }) => {
  for (const lesson of foundations) {
    await page.goto('./#' + lesson.id);
    await expect(page.locator('h1')).toHaveText(lesson.title);
    for (let index = 0; index < lesson.steps.length; index++) {
      await page.locator('.steps button').nth(index).click();
      const timeline = page.getByRole('slider', { name: 'Ход текущего шага', exact: true });
      await timeline.press('Home');
      await expect(timeline).toHaveValue('0');
      const before = await page
        .locator('[data-testid="scene"] svg')
        .evaluateAll((svgs) => svgs.map((svg) => svg.innerHTML).join(''));
      await timeline.press('End');
      await expect(timeline).toHaveValue('1');
      const after = await page
        .locator('[data-testid="scene"] svg')
        .evaluateAll((svgs) => svgs.map((svg) => svg.innerHTML).join(''));
      expect(after, `${lesson.id}, шаг ${index + 1}`).not.toBe(before);
      await expect(page.locator('.katex-error')).toHaveCount(0);
    }
  }
});

test('Ссылка на билет Штольца открывает его собственный шаг', async ({ page }) => {
  await page.goto('./#th-b1-14');
  await expect(page.locator('h1')).toHaveText('От отношения приращений к отношению величин');
  await expect(page.locator('.explanation h2')).toHaveText('Штольц: телескоп вместо Коши');
});

test('Непрерывность склейки и значение в одной точке проверяются отдельно', async ({ page }) => {
  await page.goto('./#piecewise-primitive?step=1');
  const timeline = page.getByRole('slider', { name: 'Ход текущего шага', exact: true });
  await timeline.press('Home');
  await expect(page.locator('.scene-metrics')).toContainText('разрыв 1,2');
  await timeline.press('End');
  await expect(page.locator('.scene-metrics')).toContainText('разрыв 0');
  await page.locator('.steps button').nth(3).click();
  await timeline.press('Home');
  await expect(page.locator('.scene-metrics')).toContainText('∫₋₁.₅¹.⁵ f 0');
  await timeline.press('End');
  await expect(page.locator('.scene-metrics')).toContainText('∫₋₁.₅¹.⁵ f 0');
});
