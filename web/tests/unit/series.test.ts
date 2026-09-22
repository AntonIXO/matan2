import { describe, expect, test } from 'bun:test';
import katex from 'katex';
import { series } from '../../src/content/series';
import { atStep, seekState } from '../../src/state';
import {
  partialSums,
  harmonicBlock,
  alternatingTerm,
  abelParts,
  rearrangedIndex,
  seriesDiagnostics,
  squareEnumeration,
  diagonalEnumeration,
  productSum,
  productSquareSum,
  productDiagonalSum,
} from '../../src/series-models';

describe('Числовые ряды: конечные тождества и границы', () => {
  test('геометрический хвост ограничен независимо от числа членов; гармонический — нет', () => {
    for (const n of [1, 5, 32]) {
      expect(harmonicBlock(n)).toBeGreaterThanOrEqual(0.5);
      for (const q of [0.2, 0.7, 0.85]) {
        const sums = partialSums((k) => (1 - q) * q ** (k - 1), n + 24);
        expect(sums[n]).toBeCloseTo(1 - q ** n, 12);
        for (const m of [1, 8, 24]) {
          expect(sums[n + m] - sums[n]).toBeCloseTo(q ** n * (1 - q ** m), 12);
          expect(sums[n + m] - sums[n]).toBeLessThanOrEqual(q ** n + 1e-14);
        }
      }
    }
  });
  test('чётные/нечётные суммы зажимают ln2 с правильной шириной', () => {
    for (const n of [1, 5, 30]) {
      const sums = partialSums((k) => alternatingTerm(k), 2 * n + 1);
      expect(sums[2 * n]).toBeLessThan(Math.log(2));
      expect(sums[2 * n + 1]).toBeGreaterThan(Math.log(2));
      expect(sums[2 * n + 1] - sums[2 * n]).toBeCloseTo(1 / (2 * n + 1), 12);
    }
  });
  test('преобразование Абеля сохраняет и чётные, и нечётные конечные суммы', () => {
    for (const power of [0.2, 1, 2.5])
      for (let n = 1; n <= 61; n++) {
        const parts = abelParts(n, power);
        expect(parts.boundary + parts.transformed).toBeCloseTo(
          partialSums((k) => alternatingTerm(k, power), n)[n],
          12,
        );
        expect(parts.transformed).toBeGreaterThanOrEqual(0);
        expect(parts.transformed).toBeLessThanOrEqual(1);
      }
  });
  test('перестановка берёт разные индексы и меняет условную сумму на 3/2 ln2', () => {
    const N = 30000;
    const indices = Array.from({ length: N }, (_, i) => rearrangedIndex(i + 1));
    expect(new Set(indices).size).toBe(N);
    expect(indices.slice(0, 9)).toEqual([1, 3, 2, 5, 7, 4, 9, 11, 6]);
    const harmonic = partialSums((k) => alternatingTerm(rearrangedIndex(k)), N)[N];
    const absolute = partialSums((k) => alternatingTerm(rearrangedIndex(k), 2), N)[N];
    expect(harmonic).toBeCloseTo(1.5 * Math.log(2), 4);
    expect(absolute).toBeCloseTo(Math.PI ** 2 / 12, 4);
  });
  test('Раабе различает степенные ряды при одинаковых пределах корня и отношения', () => {
    for (const power of [0.5, 1, 2]) {
      const d = seriesDiagnostics(100000, power);
      expect(d.root).toBeCloseTo(1, 3);
      expect(d.ratio).toBeCloseTo(1, 4);
      expect(d.raabe).toBeCloseTo(power, 4);
    }
    for (const n of [2, 30, 80]) expect(seriesDiagnostics(n, 1).raabe).toBeCloseTo(1, 12);
  });
  test('нумерации клеток уникальны, квадратные и диагональные суммы точны', () => {
    for (let n = 1; n <= 10; n++) {
      const square = squareEnumeration(n * n);
      const diagonal = diagonalEnumeration((n * (n + 1)) / 2);
      expect(new Set(square.map(String)).size).toBe(n * n);
      expect(square.every(([i, j]) => i <= n && j <= n)).toBe(true);
      expect(diagonal.every(([i, j]) => i + j <= n + 1)).toBe(true);
      expect(productSum(square)).toBeCloseTo(productSquareSum(n), 12);
      expect(productSum(diagonal)).toBeCloseTo(productDiagonalSum(n), 12);
      expect(productSum(square)).toBeLessThan(0.5);
      expect(productSum(diagonal)).toBeLessThan(0.5);
    }
  });
  test('все формулы разбираются; каждый шаг двигает реальный параметр', () => {
    for (const lesson of series)
      for (let i = 0; i < lesson.steps.length; i++) {
        const step = lesson.steps[i];
        expect(() => katex.renderToString(step.formula, { throwOnError: true })).not.toThrow();
        const state = atStep(lesson, i);
        const first = seekState(state, lesson, 0);
        const last = seekState(state, lesson, 1);
        expect(step.motion).toBeDefined();
        expect(first.params[step.motion!.key]).not.toBe(last.params[step.motion!.key]);
        expect(step.locked ?? []).not.toContain(step.motion!.key);
      }
  });
});
