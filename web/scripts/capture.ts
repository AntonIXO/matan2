import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { lessons } from '../src/lessons';
import { launchOptions } from './browser';
const browser = await chromium.launch(launchOptions),
  page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
await mkdir('test-results/visual', { recursive: true });
await mkdir('test-results/visual/steps', { recursive: true });
const hero: Record<string, number> = {
  differentiability: 2,
  staircase: 2,
  composition: 3,
  lagrange: 2,
  gradient: 3,
  path: 3,
  'path-length': 4,
  'polar-length': 3,
  'polar-area': 2,
  'parametric-area': 2,
  'diameter-area': 3,
  revolution: 3,
  shells: 2,
  torus: 2,
  integral: 1,
  substitution: 1,
  convexity: 1,
  jumps: 2,
  'convex-set': 2,
  jensen: 2,
  extrema: 3,
  quadrature: 4,
  'euler-maclaurin': 2,
  wallis: 2,
  poisson: 1,
  improper: 3,
  gamma: 1,
  topology: 2,
  compactness: 1,
  jacobian: 3,
  products: 2,
  cantor: 2,
  brouwer: 2,
  norms: 2,
};
for (const lesson of lessons) {
  await page.goto('http://127.0.0.1:5173/s2/#' + lesson.id);
  await page.locator('h1').filter({ hasText: lesson.title }).waitFor();
  const indices = lesson.steps.map((_, i) => i);
  for (const step of indices) {
    await page.locator('.steps button').nth(step).click();
    const timeline = page.getByRole('slider', { name: 'Ход текущего шага', exact: true });
    // Midpoint is informative for moving sections; retain exact locked poses.
    if (lesson.steps[step].motion?.from !== lesson.steps[step].motion?.to)
      await timeline.evaluate((node) => {
        const input = node as HTMLInputElement;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
          input,
          '0.5',
        );
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    await page.locator('[data-testid="scene"] canvas,[data-testid="scene"] svg').first().waitFor();
    await page.waitForTimeout(220);
    await page.locator('.lesson-surface').screenshot({
      path: 'test-results/visual/steps/' + lesson.id + '-' + step + '.png',
    });
    if (step === (hero[lesson.id] ?? 0))
      await page
        .locator('[data-testid="scene"]')
        .screenshot({ path: 'test-results/visual/' + lesson.id + '.png' });
  }
}
for (const id of ['gradient', 'composition', 'substitution', 'brouwer', 'quadrature']) {
  await page.setViewportSize({ width: 375, height: 1050 });
  await page.goto('http://127.0.0.1:5173/s2/#' + id + '?step=2');
  await page.locator('[data-testid="scene"] canvas,[data-testid="scene"] svg').first().waitFor();
  await page.waitForTimeout(180);
  await page.screenshot({ path: 'test-results/visual/mobile-' + id + '.png', fullPage: true });
}
await browser.close();
console.log('Captured all 156 steps, 34 scenes, and 5 mobile pages');
