import { expect, test, type Page } from '@playwright/test';
import { brouwer } from '../../src/content/brouwer';
const timeline = (page: Page) =>
  page.getByRole('slider', { name: 'Ход текущего шага', exact: true });
const drawing = (page: Page) => page.locator('.brouwer-diagram').evaluate((el) => el.innerHTML);

test('все шаги: работающие управления, изменения геометрии и LaTeX', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./#th-b1-02');
  await expect(page.locator('h1')).toHaveText('Смещение и одноцветная тропинка');
  for (let step = 0; step < 8; step++) {
    await page.locator('.steps button').nth(step).click();
    await expect(page.locator('.section-label').filter({ hasText: 'МЕХАНИЗМ' })).toContainText(
      String(step + 1).padStart(2, '0'),
    );
    await timeline(page).press('Home');
    const before = await drawing(page),
      metrics = await page.locator('.scene-metrics').innerText();
    await timeline(page).press('End');
    await expect.poll(() => drawing(page)).not.toBe(before);
    await expect.poll(() => page.locator('.scene-metrics').innerText()).not.toBe(metrics);
    await expect(page.locator('.katex-error')).toHaveCount(0);
    expect(await page.locator('.brouwer-ledger .katex').count()).toBeGreaterThan(0);
    if (brouwer.steps[step].text.includes('$'))
      expect(await page.locator('.step-text .katex').count()).toBeGreaterThan(0);
    expect(await page.locator('.brouwer-diagram .katex').count()).toBeGreaterThan(0);
    expect(await page.getByTestId('scene').innerText()).not.toMatch(/NaN|Infinity|undefined/);
  }
  expect(errors).toEqual([]);
});
test('Гекс: клетки, центры и квадратная схема сохраняют путь', async ({ page }) => {
  await page.goto('./#brouwer?step=4');
  await expect(page.locator('[data-testid="hex-cells"] polygon')).toHaveCount(49);
  const path = page.getByTestId('hex-winning-path');
  const hexPath = await path.getAttribute('points');
  await page.getByRole('button', { name: '2. Их центры', exact: true }).click();
  await expect(page.getByTestId('hex-cells')).toHaveAttribute('opacity', '0');
  await expect(path).toHaveAttribute('points', hexPath!);
  await page.getByRole('button', { name: '3. Квадратная схема', exact: true }).click();
  await expect.poll(() => path.getAttribute('points')).not.toBe(hexPath);
  await page.getByRole('button', { name: '1. Шестиугольники', exact: true }).click();
  await expect(path).toHaveAttribute('points', hexPath!);
  await page.goto('./#brouwer?step=1&node=4');
  await expect(page.locator('[data-testid="six-neighbours"] > g')).toHaveCount(6);
  await expect(page.locator('[data-edge="diagonal"]')).toHaveCount(100);
  await expect(
    page.getByRole('slider', { name: 'Номер узла по горизонтали', exact: true }),
  ).toHaveValue('4');
});
test('сетка и противоречие: последовательно выделяются два соседа и две оценки', async ({
  page,
}) => {
  await page.goto('./#brouwer?step=3&n=14');
  await expect(page.locator('.brouwer-ledger')).toContainText('Сетка ещё слишком крупная');
  await page
    .getByRole('slider', { name: 'Число делений стороны', exact: true })
    .press('ArrowRight');
  await expect(page.locator('.brouwer-ledger')).toContainText('Сетка подходит');
  await page.goto('./#brouwer?step=7');
  await expect(page.getByTestId('contradiction-pair')).toHaveCount(0);
  await page.getByRole('button', { name: '2. Выделить соседей', exact: true }).click();
  await expect(page.getByTestId('contradiction-pair')).toBeVisible();
  await expect(page.locator('.brouwer-ledger')).toContainText('Выбраны именно соседние узлы');
  await page.getByRole('button', { name: '3. Сравнить оценки', exact: true }).click();
  await expect(page.getByTestId('required-jump')).toBeVisible();
  await expect(page.getByTestId('brouwer-contradiction')).toContainText('Невозможно');
  await expect(page.locator('.brouwer-ledger')).toContainText('Требование цвета: скачок не меньше');
  await expect(page.locator('.brouwer-ledger')).toContainText(
    'Оценка непрерывности: скачок строго меньше',
  );
  const url = page.url();
  await page.reload();
  await expect(page.getByTestId('required-jump')).toBeVisible();
  expect(page.url()).toBe(url);
});
test('воспроизведение и reduced motion используют новый ход доказательства', async ({ page }) => {
  await page.goto('./#brouwer?step=4&morph=0');
  const slider = page.getByRole('slider', { name: 'От шестиугольников к узлам', exact: true });
  await page.getByRole('button', { name: 'Воспроизвести шаг', exact: true }).click();
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#brouwer?step=7');
  await page.getByRole('button', { name: 'Воспроизвести шаг', exact: true }).click();
  await expect(page.getByTestId('brouwer-contradiction')).toBeVisible();
});
for (const width of [375, 768, 1067, 1440]) {
  test(`LaTeX и рисунки не обрезаются при ширине ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1050 });
    for (let step = 0; step < 8; step++) {
      await page.goto(`./#brouwer?step=${step}&progress=1`);
      await expect(page.locator('.brouwer-diagram')).toBeVisible();
      await expect(page.locator('.katex-error')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const overflow = await page.locator('.brouwer-diagram foreignObject').evaluateAll((nodes) =>
        nodes
          .filter((node) => {
            const bounds = node.getBoundingClientRect(),
              math = node.querySelector('.katex-html')?.getBoundingClientRect();
            return (
              math &&
              (math.left < bounds.left - 1 ||
                math.right > bounds.right + 1 ||
                math.top < bounds.top - 1 ||
                math.bottom > bounds.bottom + 1)
            );
          })
          .map((node) => node.textContent),
      );
      expect(overflow).toEqual([]);
      if (width === 1440 && step === 7)
        await page.locator('.brouwer-content').screenshot({ path: '/tmp/matan-brouwer-final.png' });
    }
  });
}
