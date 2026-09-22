import { test, expect } from '@playwright/test';

test('Пятый шаг накапливает площадь при воспроизведении и ручном перемещении', async ({ page }) => {
  await page.goto('./#euler-maclaurin?step=4');
  const slider = page.getByRole('slider', { name: 'Положение на интервале', exact: true });
  const area = page.locator('.scene-metrics span').filter({ hasText: 'Накоплено:' }).locator('b');
  await expect(slider).toHaveValue('0');
  await expect(area).toHaveText('0');
  const before = await page.locator('.board svg').innerHTML();
  await page.getByRole('button', { name: 'Воспроизвести шаг', exact: true }).click();
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(0.05);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  expect(await page.locator('.board svg').innerHTML()).not.toBe(before);
  await slider.fill('0.5');
  await expect(area).toHaveText('0,083');
  await slider.fill('1');
  await expect(area).toHaveText('0,167');
});

test('Дробная часть сбрасывается на целом конце, площадь ядра сохраняется', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./#euler-maclaurin?step=1&t=0.4');
  const metrics = page.locator('.scene-metrics');
  await expect(metrics).toContainText('0,4');
  const slider = page.getByRole('slider', { name: 'Положение на интервале', exact: true });
  await slider.fill('1');
  await expect(
    metrics.locator('span').filter({ hasText: '{x} = x − ⌊x⌋' }).locator('b'),
  ).toHaveText('0');
  await expect(metrics.locator('span').filter({ hasText: '∫₂ˣ {s} ds' }).locator('b')).toHaveText(
    '0,5',
  );
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1050 });
    for (const step of [2, 3, 4, 5, 6]) {
      await page.goto(`./#euler-maclaurin?step=${step}`);
      await expect(page.locator('.katex-error')).toHaveCount(0);
      await expect(page.locator('.board')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (step === 4) await expect(metrics).toContainText('19/3');
    }
    await page.goto('./#euler-maclaurin?step=3&t=1');
    await expect(metrics).toContainText('1/12');
    await page.screenshot({ path: `test-results/euler-${width}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});
