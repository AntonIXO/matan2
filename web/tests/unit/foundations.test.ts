import { describe, expect, test } from 'bun:test';
import { cauchySine, chebyshevDiscrete, tailBounds, tailValue } from '../../src/foundations-models';

describe('Точные механизмы новых сцен', () => {
  test('Границы бесконечного хвоста достигаются первыми номерами нужной чётности', () => {
    for (const amplitude of [0, 0.2, 1])
      for (let n = 1; n <= 36; n++) {
        const b = tailBounds(n, amplitude);
        expect(tailValue(b.even, amplitude)).toBe(b.upper);
        expect(tailValue(b.odd, amplitude)).toBe(b.lower);
        for (let k = n; k <= 400; k++) {
          expect(tailValue(k, amplitude)).toBeLessThanOrEqual(b.upper);
          expect(tailValue(k, amplitude)).toBeGreaterThanOrEqual(b.lower);
        }
      }
  });
  test('Коши: ξ между концами, сумма двух поправок точно восстанавливает отношение', () => {
    for (const x of [0.02, 0.7, 1.5])
      for (const q of [0.001, 0.4, 0.8]) {
        const y = x * q,
          c = cauchySine(x, y);
        expect(c.xi).toBeGreaterThan(y);
        expect(c.xi).toBeLessThan(x);
        expect(c.correction + c.slope * (1 - q)).toBeCloseTo(Math.sin(x) / x, 12);
      }
  });
  test('Чебышёв: точные средние ступеней совпадают с явной суммой, смена порядка меняет знак', () => {
    for (let n = 2; n <= 12; n++)
      for (const slope of [-1, 0, 1]) {
        const d = chebyshevDiscrete(n, slope);
        const pairs = Array.from({ length: n }, (_, i) => ((i + 1) / n) ** 2 * slope);
        expect(d.fg).toBeCloseTo(pairs.reduce((a, b) => a + b) / n, 12);
        expect(d.covariance).toBeCloseTo((slope * (n * n - 1)) / (12 * n * n), 12);
      }
  });
});
