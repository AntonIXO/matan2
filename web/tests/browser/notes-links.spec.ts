import { test, expect } from '@playwright/test';
import { lessons } from '../../src/lessons';
import { marks } from '../../src/Highlight';
import notes from '../../src/generated/notes.json' with { type: 'json' };

test('Каталог следует порядку основных билетов в конспекте', async ({ page }) => {
  await page.goto('./#path');
  const labels = await page.locator('.lesson-index').allTextContents();
  const numbers = labels.map((label) => label.match(/\d+\.\d+\.\d+/)![0]);
  const expected = Object.values(notes.tickets)
    .filter((t) => lessons.some((l) => l.tickets[0] === t.id))
    .flatMap((t) => lessons.filter((l) => l.tickets[0] === t.id).map(() => t.number));
  expect(numbers).toEqual(expected);
  expect(await page.locator('.nav-group h2').allTextContents()).toEqual([
    '1.1 · Определения',
    '1.2 · Теоремы',
    '2.1 · Определения',
    '2.2 · Теоремы',
    '3.1 · Определения',
    '3.2 · Теоремы',
  ]);
});

test('Под формулой нет наложения на подписи при средней и мобильной ширине', async ({ page }) => {
  for (const width of [375, 768, 1144, 1200, 1440]) {
    await page.setViewportSize({ width, height: 1078 });
    for (const lesson of lessons.filter((l) => marks[l.scene])) {
      await page.goto('./#' + lesson.id + '?step=1');
      const card = page.locator('.formula-card'),
        chips = page.locator('.formula-marks');
      await expect(chips).toBeVisible();
      const a = (await card.boundingBox())!,
        b = (await chips.boundingBox())!;
      expect(b.y - a.y - a.height, lesson.id + ' at ' + width).toBeGreaterThanOrEqual(8);
    }
  }
});

test('Страница /s2/ загружает ассеты и PDF внутри того же пути', async ({ page }) => {
  const bad: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) bad.push(r.url());
  });
  await page.goto('./#path?step=1');
  await expect(page.locator('[data-testid="scene"] svg').first()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/s2/');
  const link = page.locator('.ticket-links a').first();
  expect(await link.getAttribute('href')).toMatch(/^\/s2\/notes\.pdf#page=\d+$/);
  const response = await page.request.get('./notes.pdf');
  expect(response.ok()).toBe(true);
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  expect(bad).toEqual([]);
});
