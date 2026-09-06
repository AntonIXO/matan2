import { test, expect } from '@playwright/test';

test('Перетаскивание мышью и стрелки меняют параметр, сохраняя шаг', async ({ page }) => {
  await page.goto('./#path');
  const point = page.locator('.mafs-movable-point-point').first();
  await point.waitFor();
  await point.scrollIntoViewIfNeeded();
  const input = page.getByRole('slider', { name: 'Параметр u', exact: true }),
    before = Number(await input.inputValue()),
    box = (await point.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 55, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  expect(Number(await input.inputValue())).toBeGreaterThan(before + 0.02);
  const after = Number(await input.inputValue());
  await page.locator('.mafs-movable-point').first().focus();
  await page.keyboard.press('ArrowRight');
  expect(Number(await input.inputValue())).toBeGreaterThan(after);
  expect(new URL(page.url()).hash).toContain('step=0');
});
test('Настоящие сенсорные события Chromium перетаскивают точку', async ({ browser }) => {
  const context = await browser.newContext({
      viewport: { width: 375, height: 900 },
      isMobile: true,
      hasTouch: true,
    }),
    page = await context.newPage();
  await page.goto(new URL('#path', process.env.MATAN_BASE_URL || 'http://127.0.0.1:5173/s2/').href);
  const point = page.locator('.mafs-movable-point-point').first();
  await point.waitFor();
  await point.scrollIntoViewIfNeeded();
  const input = page.getByRole('slider', { name: 'Параметр u', exact: true }),
    before = Number(await input.inputValue()),
    box = (await point.boundingBox())!,
    x = box.x + box.width / 2,
    y = box.y + box.height / 2,
    session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  for (let i = 1; i <= 8; i++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + (40 * i) / 8, y, id: 1 }],
    });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(Number(await input.inputValue())).toBeGreaterThan(before + 0.04);
  await context.close();
});
test('На паузе 3D не рисует новые кадры; проигрывание возобновляет рендер', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__matanDraws = 0;
    for (const name of ['drawElements', 'drawArrays'] as const) {
      const original = WebGL2RenderingContext.prototype[name];
      (WebGL2RenderingContext.prototype as any)[name] = function (
        this: WebGL2RenderingContext,
        ...args: unknown[]
      ) {
        (window as any).__matanDraws++;
        return (original as Function).apply(this, args);
      };
    }
  });
  await page.goto('./#differentiability?step=2');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(700);
  const before = await page.evaluate(() => (window as any).__matanDraws);
  expect(before).toBeGreaterThan(0);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__matanDraws)).toBe(before);
  await page.getByRole('button', { name: 'Воспроизвести шаг', exact: true }).click();
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => (window as any).__matanDraws)).toBeGreaterThan(before);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
});
test('WebMCP: контракт действий через тестовый реестр', async ({ page }) => {
  await page.addInitScript(() => {
    const registry: Record<string, any> = {};
    (window as any).__sceneTools = registry;
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool(tool: any, { signal }: any) {
          registry[tool.name] = tool;
          signal.addEventListener('abort', () => {
            if (registry[tool.name] === tool) delete registry[tool.name];
          });
        },
      },
    });
  });
  await page.goto('./#path');
  await expect
    .poll(() => page.evaluate(() => Object.keys((window as any).__sceneTools).length))
    .toBe(4);
  const catalog = await page.evaluate(() =>
    (window as any).__sceneTools.read_matan_catalog.execute({}),
  );
  expect(catalog).toHaveLength(34);
  await page.evaluate(() =>
    (window as any).__sceneTools.open_matan_scene.execute({ lessonId: 'polar-area', step: 2 }),
  );
  await expect(page.locator('h1')).toHaveText('Зажать сектор двумя круговыми');
  await page.evaluate(() =>
    (window as any).__sceneTools.configure_matan_scene.execute({ params: { c: 0.2, delta: 0.5 } }),
  );
  const state = await page.evaluate(() =>
    (window as any).__sceneTools.read_matan_scene.execute({}),
  );
  expect(state.params.c).toBe(0.2);
  expect(state.params.delta).toBe(0.5);
  const rejected = await page.evaluate(async () => {
    try {
      await (window as any).__sceneTools.configure_matan_scene.execute({
        params: { c: 0.3, delta: -1 },
      });
      return false;
    } catch {
      return true;
    }
  });
  expect(rejected).toBe(true);
  expect(
    await page.evaluate(() => (window as any).__sceneTools.read_matan_scene.execute({})),
  ).toEqual(state);
});
test('Совместная подсветка связывает AB с хордой', async ({ page }) => {
  await page.goto('./#diameter-area?step=3');
  const chip = page.getByRole('button', { name: 'AB · хорда', exact: true });
  await chip.focus();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  expect(
    await page
      .locator('[data-testid="scene"] polyline')
      .evaluateAll((lines) =>
        lines.some(
          (line) =>
            Number(line.getAttribute('stroke-width')) === 4 ||
            getComputedStyle(line).strokeWidth === '4px',
        ),
      ),
  ).toBe(true);
});
test('Шкала t у окружности переключается на полный оборот', async ({ page }) => {
  await page.goto('./#lagrange?step=4');
  const input = page.getByRole('slider', { name: 'Параметр t', exact: true });
  expect(Number(await input.getAttribute('max'))).toBe(2 * Math.PI);
  await input.press('End');
  expect(Number(await input.inputValue())).toBeCloseTo(2 * Math.PI, 6);
  await page.locator('.steps button').nth(2).click();
  expect(Number(await input.getAttribute('max'))).toBe(Math.PI);
  expect(Number(await input.inputValue())).toBeLessThanOrEqual(Math.PI);
});

test('Все шаги: автоматический переход и пауза после последнего', async ({ page }) => {
  await page.goto('./#path?step=4&progress=0.99');
  await page.getByLabel('Все шаги', { exact: true }).check();
  await page.getByRole('button', { name: 'Воспроизвести шаг', exact: true }).click();
  await expect(page.locator('.steps button').nth(5)).toHaveAttribute('aria-current', 'step');
  expect(
    Number(
      await page.getByRole('slider', { name: 'Направление обхода', exact: true }).inputValue(),
    ),
  ).toBe(-1);
  await page.goto('./#path?step=5&progress=0.99');
  await page.getByLabel('Все шаги', { exact: true }).check();
  await page.getByRole('button', { name: 'Воспроизвести шаг', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Воспроизвести шаг', exact: true })).toBeVisible();
  expect(
    Number(await page.getByRole('slider', { name: 'Ход текущего шага', exact: true }).inputValue()),
  ).toBe(1);
});
