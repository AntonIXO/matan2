import { expect, test } from 'bun:test';
import { lp } from '../../src/models';
import { integrate } from '../../src/math';
import { improperExtra } from '../../src/content/improper-extra';
import {
  powerIntegral,
  powerLogConverges,
  logDensity,
  sinc,
  kernelDifference,
  dirichletKernel,
  oscillatoryIntegral,
} from '../../src/improper-models';
import katex from 'katex';

test('Гёльдер сохраняется при p→1: сопряжённая норма не обращается в ноль', () => {
  const a = [0.7, 0.2],
    b = [0.6, 0.25];
  for (const p of [1.01, 1.001, 1.0001, 1.000001]) {
    const q = p / (p - 1);
    expect(lp(b, q)).toBeGreaterThanOrEqual(0.6);
    expect(lp(a, p) * lp(b, q)).toBeGreaterThanOrEqual(0.47);
  }
  expect(lp([0, 0], 10000)).toBe(0);
  expect(lp([3e100, 4e100], 2) / 1e100).toBeCloseTo(5, 12);
});

test('степенные эталоны устойчивы около p=1 и имеют противоположные пороги на концах', () => {
  for (const p of [0, 0.5, 0.999999, 1, 1.000001, 1.5, 2]) {
    expect(powerIntegral(p, 1, Math.exp(3))).toBeCloseTo(
      integrate((u) => Math.exp((1 - p) * u), 0, 3),
      8,
    );
    expect(powerIntegral(p, Math.exp(-3), 1)).toBeCloseTo(
      integrate((u) => Math.exp((1 - p) * u), -3, 0),
      8,
    );
  }
  expect(powerLogConverges(1, 1)).toBe(false);
  expect(powerLogConverges(1, 1.01)).toBe(true);
  expect(powerLogConverges(1.01, -2)).toBe(true);
  expect(powerLogConverges(0.99, 3)).toBe(false);
  for (const alpha of [0.7, 1, 1.3])
    for (const beta of [-2, 1, 3]) {
      const transformed = integrate((u) => logDensity(u, alpha, beta), Math.log(10), Math.log(30));
      expect(transformed).toBeCloseTo(
        integrate((x) => 1 / (x ** alpha * Math.log(x) ** beta), 10, 30),
        8,
      );
    }
});

test('знаки полуволн, абсолютная площадь и равномерная оценка хвоста Дирихле', () => {
  for (const k of [1, 3, 12]) {
    const a = 2 * Math.PI * k;
    expect(oscillatoryIntegral(a, a + Math.PI, 0)).toBeCloseTo(2, 5);
    for (const p of [0.1, 1, 2]) {
      for (const width of [Math.PI, 7, 4 * Math.PI]) {
        const signed = oscillatoryIntegral(a, a + width, p);
        expect(Math.abs(signed)).toBeLessThanOrEqual(2 / a ** p + 1e-7);
        expect(oscillatoryIntegral(a, a + width, p, true)).toBeGreaterThanOrEqual(
          Math.abs(signed) - 1e-9,
        );
      }
    }
  }
});

test('ядро Дирихле имеет точную площадь π/2; отличие sinc удовлетворяет оценке', () => {
  for (const n of [1, 3, 10, 20]) {
    const lambda = n + 0.5;
    expect(integrate((x) => dirichletKernel(x, n), 0, Math.PI, n * 128)).toBeCloseTo(
      Math.PI / 2,
      8,
    );
    const error = integrate((x) => kernelDifference(x) * Math.sin(lambda * x), 0, Math.PI, n * 128);
    const truncated = integrate(sinc, 0, lambda * Math.PI, n * 128);
    expect(truncated - Math.PI / 2).toBeCloseTo(error, 8);
    expect(Math.abs(error)).toBeLessThanOrEqual((0.5 - 1 / Math.PI) / lambda);
  }
  expect(sinc(0)).toBe(1);
  expect(kernelDifference(0)).toBe(0);
});

test('формулы новых интегральных сцен отображаются без скрытых управляющих символов', () => {
  for (const l of improperExtra)
    for (const step of l.steps) {
      expect(step.formula).not.toMatch(/[\u0000-\u001f]/);
      expect(() => katex.renderToString(step.formula, { throwOnError: true })).not.toThrow();
    }
});
