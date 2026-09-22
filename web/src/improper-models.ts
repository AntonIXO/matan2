import { integrate, linspace, type V2 } from './math';

export function powerIntegral(p: number, a: number, b: number) {
  const exponent = 1 - p;
  return Math.abs(exponent) < 1e-10
    ? Math.log(b / a)
    : (a ** exponent * Math.expm1(exponent * Math.log(b / a))) / exponent;
}
export const powerLogConverges = (alpha: number, beta: number) =>
  alpha > 1 || (alpha === 1 && beta > 1);
export const logDensity = (u: number, alpha: number, beta: number) =>
  Math.exp((1 - alpha) * u) / u ** beta;
export const sinc = (x: number) => (Math.abs(x) < 1e-7 ? 1 - (x * x) / 6 : Math.sin(x) / x);
export const kernelDifference = (x: number) =>
  x === 0
    ? 0
    : Math.abs(x) < 1e-3
      ? -x / 24 - (7 * x ** 3) / 5760
      : 1 / x - 1 / (2 * Math.sin(x / 2));
export const dirichletKernel = (x: number, n: number) =>
  Math.abs(x) < 1e-7 ? n + 0.5 : Math.sin((n + 0.5) * x) / (2 * Math.sin(x / 2));

// Split at the zeros of sin: signed/absolute areas use the same quadrature accuracy.
export function oscillatoryIntegral(a: number, b: number, p: number, absolute = false) {
  const points = [a];
  for (let k = Math.floor(a / Math.PI) + 1; k * Math.PI < b; k++) points.push(k * Math.PI);
  points.push(b);
  return points.slice(1).reduce(
    (sum, end, i) =>
      sum +
      integrate(
        (x) => {
          const value = Math.sin(x) / x ** p;
          return absolute ? Math.abs(value) : value;
        },
        points[i],
        end,
        40,
      ),
    0,
  );
}

export function accumulated(f: (x: number) => number, a: number, b: number, n = 360): V2[] {
  let sum = 0;
  const xs = linspace(a, b, n);
  return xs.map((x, i) => {
    if (i > 0) sum += integrate(f, xs[i - 1], x, 4);
    return [x, sum];
  });
}
