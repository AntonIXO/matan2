import { test, expect, type Page } from '@playwright/test';
import { lessons } from '../../src/lessons';
const ready = async (page: Page) => {
  await expect(
    page.locator('[data-testid="scene"] canvas,[data-testid="scene"] svg').first(),
  ).toBeVisible();
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
};
async function valid(page: Page) {
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(await page.locator('[data-testid="scene"]').textContent()).not.toMatch(
    /NaN|Infinity|undefined|Сцена готовится/,
  );
  const bad = await page
    .locator('[data-testid="scene"] svg')
    .evaluateAll((nodes) =>
      nodes
        .flatMap((svg) => Array.from(svg.querySelectorAll('*')))
        .some((node) =>
          Array.from(node.attributes).some((a) => /\b(?:NaN|Infinity)\b/.test(a.value)),
        ),
    );
  expect(bad).toBe(false);
}
test('Все 34 сцены: каждый смысловой шаг и оба края времени', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const l of lessons) {
    await page.goto('./#' + l.id);
    await expect(page.locator('h1')).toHaveText(l.title);
    await ready(page);
    for (let i = 0; i < l.steps.length; i++) {
      await page.locator('.steps button').nth(i).click();
      await expect(page.locator('.explanation h2')).toHaveText(l.steps[i].title);
      await page.getByRole('slider', { name: 'Ход текущего шага', exact: true }).press('Home');
      await ready(page);
      await valid(page);
      await page.getByRole('slider', { name: 'Ход текущего шага', exact: true }).press('End');
      await ready(page);
      await valid(page);
    }
  }
  expect(errors).toEqual([]);
});
test('Крайние значения всех параметров и сохранение ссылки', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const l of lessons) {
    await page.goto('./#' + l.id);
    await ready(page);
    for (const p of l.parameters) {
      const slider = page.getByRole('slider', { name: p.label, exact: true });
      if (await slider.isDisabled()) continue;
      await slider.press('Home');
      await valid(page);
      await slider.press('End');
      await valid(page);
    }
    const before = page.url();
    await page.reload();
    await ready(page);
    expect(page.url()).toBe(before);
    await valid(page);
  }
  expect(errors).toEqual([]);
});
test('Воспроизведение, ручная пауза, продолжение и сброс', async ({ page }) => {
  await page.goto('./#path');
  await ready(page);
  const slider = page.getByRole('slider', { name: 'Параметр u', exact: true });
  await slider.press('Home');
  for (let i = 0; i < 12; i++) await slider.press('ArrowRight');
  const before = Number(await slider.inputValue());
  await page.getByRole('button', { name: 'Воспроизвести шаг', exact: true }).click();
  await page.waitForTimeout(180);
  const running = Number(await slider.inputValue());
  expect(running).toBeGreaterThan(before);
  expect(running - before).toBeLessThan(0.12);
  await slider.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Воспроизвести шаг', exact: true })).toBeVisible();
  const paused = Number(await slider.inputValue());
  await page.waitForTimeout(120);
  expect(Number(await slider.inputValue())).toBe(paused);
  await page.getByRole('button', { name: 'Воспроизвести шаг', exact: true }).click();
  await page.waitForTimeout(120);
  expect(Number(await slider.inputValue())).toBeGreaterThanOrEqual(paused);
  await page.getByRole('button', { name: 'Сбросить', exact: true }).click();
  expect(Number(await slider.inputValue())).toBe(0.15);
  await expect(page.getByRole('button', { name: 'Воспроизвести шаг', exact: true })).toBeVisible();
});
test('Reduced motion, клавиатура, ссылка на PDF и поиск', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#differentiability?step=2');
  await ready(page);
  await page.getByRole('button', { name: 'Воспроизвести шаг', exact: true }).click();
  expect(
    Number(
      await page.getByRole('slider', { name: 'Размер окрестности', exact: true }).inputValue(),
    ),
  ).toBe(0.04);
  await page.locator('main').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.explanation h2')).toHaveText('Остаток относительно шага');
  await page.getByLabel('Поиск билета', { exact: true }).fill('1.2.23');
  await page.locator('.lesson-link').click();
  await expect(page.locator('h1')).toHaveText('Излому — свой промежуток наклонов');
  const href = await page.locator('.ticket-links a').first().getAttribute('href');
  expect(href).toMatch(/notes\.pdf#page=\d+/);
  const response = await page.request.get('./notes.pdf');
  expect(response.ok()).toBe(true);
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
});
for (const width of [375, 768, 1440])
  test('Раскладка ' + width + ' px без горизонтального выхода', async ({ page }) => {
    await page.setViewportSize({ width, height: 1050 });
    for (const id of [
      'differentiability',
      'gradient',
      'composition',
      'path',
      'diameter-area',
      'substitution',
      'jensen',
      'quadrature',
      'gamma',
      'brouwer',
    ]) {
      await page.goto('./#' + id);
      await ready(page);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);
      const canvas = await page.locator('[data-testid="scene"]').boundingBox();
      expect(canvas!.width).toBeGreaterThan(250);
    }
  });
test('Сенсорный ввод: каталог, шаг, перемещение точки', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 900 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(new URL('#path', process.env.MATAN_BASE_URL || 'http://127.0.0.1:5173/s2/').href);
  await ready(page);
  await page.getByRole('button', { name: 'Билеты ☰', exact: true }).tap();
  await expect(page.getByRole('navigation', { name: 'Каталог сцен' })).toBeVisible();
  await page.getByLabel('Поиск билета', { exact: true }).fill('Гекса');
  await page.getByLabel('Поиск билета', { exact: true }).fill('Смещение');
  await page.locator('.lesson-link').tap();
  await expect(page.locator('h1')).toHaveText('Смещение и одноцветная тропинка');
  await page.locator('.steps button').nth(2).tap();
  await expect(page.locator('.explanation h2')).toHaveText('Отдельная доска Гекса');
  await context.close();
});
