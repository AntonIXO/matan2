import { expect, test } from 'bun:test';
import {
  EULER_GAMMA,
  harmonicRemainder,
  stirlingConstant,
  wallisFactorials,
  primitiveArea,
  primitiveFunction,
  piBoundLog,
  piDensity,
} from '../../src/asymptotic-models';
import { integrate } from '../../src/math';

test('положительный интеграл Hₙ согласуется с лекционной рекуррентой', () => {
  const H = (n: number) => integrate((x) => piDensity(n, x), -Math.PI / 2, Math.PI / 2, 1024);
  expect(H(0)).toBeCloseTo(2, 10);
  expect(H(1)).toBeCloseTo(4, 10);
  for (let n = 2; n <= 10; n++)
    expect(H(n)).toBeCloseTo((4 * n - 2) * H(n - 1) - Math.PI ** 2 * H(n - 2), 8);
  for (const q of [1, 2, 3]) {
    expect(piBoundLog(150, q)).toBeLessThan(0);
    expect(Math.exp(piBoundLog(21 * q, q) - piBoundLog(21 * q - 1, q))).toBeCloseTo(10 / 21, 10);
  }
});

test('хвосты Эйлера–Маклорена удовлетворяют показанным оценкам', () => {
  for (let n = 1; n <= 60; n++) {
    const error = harmonicRemainder(n) - EULER_GAMMA;
    expect(error).toBeGreaterThanOrEqual(1 / (2 * n) - 1 / (8 * n * n) - 1e-12);
    expect(error).toBeLessThanOrEqual(1 / (2 * n) + 1e-12);
    const r = stirlingConstant(n) - Math.log(2 * Math.PI) / 2;
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(1 / (8 * n));
  }
  expect(Math.abs(wallisFactorials(60) - Math.sqrt(Math.PI))).toBeLessThan(0.005);
});

test('первообразная с масштабированным аргументом даёт нужный наклон', () => {
  for (const kind of [0, 1, 2])
    for (const a of [0.5, 1, 2])
      for (const x of [-1.5, 0, 0.8, 1.5]) {
        const h = 1e-5;
        const derivative =
          (primitiveArea(kind, a * (x + h)) - primitiveArea(kind, a * (x - h))) / (2 * h * a);
        expect(Math.abs(derivative - primitiveFunction(kind, a * x))).toBeLessThan(1e-8);
      }
});
