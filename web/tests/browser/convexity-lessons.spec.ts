import { expect, test, type Page } from '@playwright/test';

const lessons = [
  { id: 'one-sided-slopes', ticket: '1.2.22', anchor: 'th-b1-22', title: 'Пять наклонов в одном порядке' },
  { id: 'jumps', ticket: '1.2.23', anchor: 'th-b1-23', title: 'Излом превращается в скачок' },
  { id: 'tangent-support', ticket: '1.2.24', anchor: 'th-b1-24', title: 'График выше каждой касательной' },
] as const;

async function drawing(page: Page) {
  return page
    .locator('[data-testid="scene"] svg')
    .evaluateAll((nodes) => nodes.map((node) => node.innerHTML).join(''));
}

test('1.2.22–1.2.24: каждый шаг двигает математическую геометрию', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  for (const lesson of lessons) {
    await page.goto('./#' + lesson.id);
    const steps = page.locator('.steps button');
    for (let i = 0; i < (await steps.count()); i++) {
      await steps.nth(i).click();
      const timeline = page.getByRole('slider', { name: 'Ход текущего шага', exact: true });
      await timeline.press('Home');
      const before = await drawing(page);
      const beforeMetrics = await page.locator('.scene-metrics').innerText();
      await timeline.press('End');
      await expect.poll(() => drawing(page)).not.toBe(before);
      await expect.poll(() => page.locator('.scene-metrics').innerText()).not.toBe(beforeMetrics);
      await expect(page.locator('.katex-error')).toHaveCount(0);
      expect(await page.locator('[data-testid="scene"]').innerText()).not.toMatch(/NaN|Infinity|undefined/);
    }
  }
  expect(errors).toEqual([]);
});

test('ползунки вручную меняют геометрию и численные показатели', async ({ page }) => {
  const cases = [
    { id: 'one-sided-slopes', step: 2, label: 'Правая точка x₂' },
    { id: 'jumps', step: 0, label: 'Выбранный излом' },
    { id: 'tangent-support', step: 3, label: 'Проверяемая точка z' },
  ] as const;

  for (const item of cases) {
    await page.goto(`./#${item.id}?step=${item.step}`);
    const slider = page.getByRole('slider', { name: item.label, exact: true });
    await slider.press('Home');
    const beforeDrawing = await drawing(page);
    const beforeMetrics = await page.locator('.scene-metrics').innerText();
    await slider.press('ArrowRight');
    await expect.poll(() => drawing(page)).not.toBe(beforeDrawing);
    await expect.poll(() => page.locator('.scene-metrics').innerText()).not.toBe(beforeMetrics);
  }

  await page.goto('./#one-sided-slopes?step=2&x2=0.6');
  await expect(page.locator('.scene-metrics')).toContainText('k₁₂ 0,2');
  await expect(page.locator('.scene-metrics')).toContainText('f′₋(x₂) 1,4');
  await expect(page.locator('.scene-metrics')).toContainText('x₂ 0,6');
});

test('поиск и прямые якоря 1.2.22–1.2.24 открывают отдельные уроки', async ({ page }) => {
  for (const lesson of lessons) {
    await page.goto('./#' + lesson.anchor);
    await expect(page.locator('h1')).toHaveText(lesson.title);

    await page.goto('./#path');
    await page.getByLabel('Поиск билета', { exact: true }).fill(lesson.ticket);
    await page.locator('.lesson-link').click();
    await expect(page.locator('h1')).toHaveText(lesson.title);
  }
});
