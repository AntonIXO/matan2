import { test, expect, type Page } from '@playwright/test';
import { lessons } from '../../src/lessons';
import { stepMotions } from '../../src/state';

test.setTimeout(60_000);

const play = (page: Page) => page.getByRole('button', { name: 'Воспроизвести шаг', exact: true });
const pause = (page: Page) => page.getByRole('button', { name: 'Пауза', exact: true });
const slider = (page: Page, label: string) =>
  page.getByRole('slider', { name: label, exact: true });
const value = async (page: Page, label = 'Параметр u') =>
  Number(await slider(page, label).inputValue());
const parameterButton = (page: Page, label: string, running = false) =>
  page.getByRole('button', {
    name: `${running ? 'Пауза параметра' : 'Запустить параметр'} ${label}`,
    exact: true,
  });

async function controlled(page: Page, hash: string) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('./#' + hash);
  await expect(
    page.locator('[data-testid="scene"] svg,[data-testid="scene"] canvas').first(),
  ).toBeVisible();
  await page.clock.pauseAt(new Date('2026-01-01T02:00:00Z'));
}

test('Движение проходит несколько полных циклов; общая пауза и скорость не меняют направление', async ({
  page,
}) => {
  await controlled(page, 'path?progress=0.9');
  const before = await page.locator('[data-testid="scene"] svg').first().innerHTML();
  await play(page).click();
  await page.clock.runFor(1800);
  expect(await value(page)).toBeCloseTo(0.8, 1);
  await expect(pause(page)).toBeVisible();
  expect(await page.locator('[data-testid="scene"] svg').first().innerHTML()).not.toBe(before);
  await pause(page).click();
  const paused = await value(page);
  await page.clock.runFor(600);
  expect(await value(page)).toBe(paused);
  await play(page).click();
  await page.clock.runFor(600);
  const resumed = await value(page);
  expect(paused - resumed).toBeCloseTo(0.1, 2);
  await page.getByLabel('Скорость воспроизведения', { exact: true }).selectOption('.5');
  expect(await value(page)).toBe(resumed);
  // Let the new frame loop start before measuring its steady speed.
  await page.clock.runFor(32);
  const slowStart = await value(page);
  await page.clock.runFor(600);
  const slow = await value(page);
  expect(slowStart - slow).toBeCloseTo(0.05, 2);
  await page.getByLabel('Скорость воспроизведения', { exact: true }).selectOption('2');
  expect(await value(page)).toBe(slow);
  await page.clock.runFor(32);
  const fastStart = await value(page);
  await page.clock.runFor(600);
  const fast = await value(page);
  expect(fastStart - fast).toBeCloseTo(0.2, 2);
  // At 2× speed, 12 seconds contain two full forward/backward cycles.
  await page.clock.runFor(12000);
  expect(await value(page)).toBeCloseTo(fast, 2);
  await expect(pause(page)).toBeVisible();
  await expect(page.locator('.steps button').first()).toHaveAttribute('aria-current', 'step');
});

test('Параметры запускаются отдельно, помнят обратный ход и не мешают ручному вводу', async ({
  page,
}) => {
  await controlled(page, 'path?step=1&progress=0.9');
  const k = 'Неравномерность κ';
  await play(page).click();
  await parameterButton(page, k).click();
  await page.clock.runFor(1200);
  await parameterButton(page, 'Параметр u', true).click();
  const held = await value(page);
  const kBefore = await value(page, k);
  await page.clock.runFor(600);
  expect(await value(page)).toBe(held);
  expect(await value(page, k)).toBeGreaterThan(kBefore);
  await parameterButton(page, 'Параметр u').click();
  await page.clock.runFor(600);
  expect(await value(page)).toBeLessThan(held - 0.05);
  await slider(page, 'Параметр u').press('ArrowRight');
  const manual = await value(page);
  const other = await value(page, k);
  await page.clock.runFor(600);
  expect(await value(page)).toBe(manual);
  expect(await value(page, k)).not.toBe(other);
  await expect(parameterButton(page, 'Параметр u')).toHaveAttribute('aria-pressed', 'false');
  await expect(parameterButton(page, k, true)).toHaveAttribute('aria-pressed', 'true');
  await parameterButton(page, k, true).click();
  const lastPaused = await value(page, k);
  await page.clock.runFor(600);
  expect(await value(page, k)).toBe(lastPaused);
  await play(page).click();
  await page.clock.runFor(600);
  expect(await value(page, k)).toBeLessThan(lastPaused);
  expect(await value(page)).toBe(manual);
});

test('Во всех совместных демонстрациях меняются оба параметра и сама геометрия', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    (window as any).__playbackDraws = 0;
    for (const name of ['drawArrays', 'drawElements'] as const) {
      const draw = WebGL2RenderingContext.prototype[name];
      (WebGL2RenderingContext.prototype as any)[name] = function (...args: unknown[]) {
        (window as any).__playbackDraws++;
        return (draw as Function).apply(this, args);
      };
    }
  });
  for (const lesson of lessons)
    for (const [index, step] of lesson.steps.entries()) {
      const motions = stepMotions(step);
      if (motions.length < 2) continue;
      await page.goto(`./#${lesson.id}?step=${index}&progress=0.25`);
      const scene = page.locator('[data-testid="scene"]');
      await expect(scene.locator('svg,canvas').first()).toBeVisible();
      const before = await scene
        .locator('svg')
        .evaluateAll((nodes) => nodes.map((node) => node.outerHTML).join(''));
      const draws = await page.evaluate(() => (window as any).__playbackDraws);
      const initial = await Promise.all(
        motions.map((motion) =>
          value(page, lesson.parameters.find((p) => p.key === motion.key)!.label),
        ),
      );
      await play(page).click();
      for (const [i, motion] of motions.entries()) {
        const label = lesson.parameters.find((p) => p.key === motion.key)!.label;
        await expect(parameterButton(page, label, true)).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(() => value(page, label)).not.toBe(initial[i]);
      }
      if (lesson.dimension === '3D')
        await expect
          .poll(() => page.evaluate(() => (window as any).__playbackDraws))
          .toBeGreaterThan(draws);
      else
        await expect
          .poll(() =>
            scene
              .locator('svg')
              .evaluateAll((nodes) => nodes.map((node) => node.outerHTML).join('')),
          )
          .not.toBe(before);
      await pause(page).click();
      expect(await scene.textContent()).not.toMatch(/NaN|Infinity|undefined/);
    }
  expect(errors).toEqual([]);
});

test('Перемотка, пресет, сброс и переход очищают активные и приостановленные параметры', async ({
  page,
}) => {
  await controlled(page, 'path?step=1&progress=0.4');
  const k = 'Неравномерность κ';
  const startBoth = async () => {
    await play(page).click();
    await parameterButton(page, k).click();
    await page.clock.runFor(300);
  };
  const stable = async () => {
    await expect(play(page)).toBeVisible();
    const before = [await value(page), await value(page, k)];
    await page.clock.runFor(500);
    expect([await value(page), await value(page, k)]).toEqual(before);
  };
  await startBoth();
  await slider(page, 'Ход текущего шага').press('End');
  await stable();
  expect(await value(page)).toBe(1);
  await startBoth();
  expect(await value(page)).toBeLessThan(1);
  await page.getByRole('button', { name: 'Другой закон', exact: true }).click();
  await stable();
  expect(await value(page, k)).toBe(0.7);
  await startBoth();
  await parameterButton(page, k, true).click();
  await page.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await stable();
  expect(await value(page)).toBe(0.15);
  expect(await value(page, k)).toBe(0);
  await startBoth();
  await page.locator('.steps button').first().click();
  await stable();
  await expect(parameterButton(page, k)).toBeDisabled();
  await page.locator('.steps button').nth(1).click();
  await startBoth();
  await page.evaluate(() => {
    location.hash = '#gamma?step=2';
  });
  await expect(page.locator('h1')).toHaveText(
    lessons.find((lesson) => lesson.id === 'gamma')!.title,
  );
  await expect(play(page)).toBeVisible();
  await expect(page.locator('.parameter-play[aria-pressed="true"]')).toHaveCount(0);
});

test('Скрытая вкладка и reduced motion останавливают все циклы', async ({ page }) => {
  await controlled(page, 'path?step=1');
  await play(page).click();
  await parameterButton(page, 'Неравномерность κ').click();
  await page.clock.runFor(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(play(page)).toBeVisible();
  const hidden = page.url();
  await page.clock.runFor(1000);
  expect(page.url()).toBe(hidden);
  await page.evaluate(() => {
    delete (document as any).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(play(page)).toBeVisible();
  await play(page).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(play(page)).toBeVisible();
  expect(await value(page)).toBe(1);
  await parameterButton(page, 'Неравномерность κ').click();
  expect(await value(page, 'Неравномерность κ')).toBe(0.75);
  const reduced = page.url();
  await page.clock.runFor(1000);
  expect(page.url()).toBe(reduced);
});

test('На узком экране доступны независимые кнопки; фиксированные параметры не запускаются', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('./#path?step=1');
  await parameterButton(page, 'Параметр u').click();
  await parameterButton(page, 'Неравномерность κ').click();
  await expect(page.locator('.parameter-play[aria-pressed="true"]')).toHaveCount(2);
  for (const button of await page.locator('.parameter-play').all()) {
    const box = (await button.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  }
  await pause(page).click();
  await page.locator('.parameters').screenshot({ path: 'test-results/playback-mobile.png' });
  await page.goto('./#lagrange?step=3');
  await expect(parameterButton(page, 'Параметр t')).toBeDisabled();
  await expect(play(page)).toBeDisabled();
  await page.goto('./#quadrature?step=2');
  await expect(play(page)).toBeDisabled();
  await page.getByLabel('Все шаги', { exact: true }).check();
  await expect(play(page)).toBeEnabled();
});
