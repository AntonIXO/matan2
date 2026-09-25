import { linspace, integrate, type V2 } from './math';
export const elementary = (kind: number, x: number) =>
  kind === 0 ? x : kind === 1 ? x * x : Math.sin(x);
export const primitive = (kind: number, x: number) =>
  kind === 0 ? (x * x) / 2 : kind === 1 ? (x * x * x) / 3 : -Math.cos(x);
export function elementaryExtrema(kind: number, a: number, b: number) {
  const values = [elementary(kind, a), elementary(kind, b)];
  if (kind === 1 && a <= 0 && b >= 0) values.push(0);
  if (kind === 2)
    for (
      let k = Math.ceil((a - Math.PI / 2) / Math.PI);
      k <= Math.floor((b - Math.PI / 2) / Math.PI);
      k++
    )
      values.push(Math.sin(Math.PI / 2 + k * Math.PI));
  return [Math.min(...values), Math.max(...values)];
}
export const convex = (kind: number, x: number) => (kind === 0 ? x * x : Math.abs(x));
export const jumpFunction = (x: number) => (Math.abs(x + 1) + Math.abs(x) + Math.abs(x - 1)) / 4;
export const oneSidedFunction = (x: number) =>
  x * x + 0.4 * Math.abs(x + 0.6) + 0.2 * Math.abs(x - 0.6);
export function secantSlope(f: (x: number) => number, a: number, b: number) {
  return (f(b) - f(a)) / (b - a);
}
function sideSign(x: number, side: -1 | 1) {
  return Math.abs(x) < 1e-12 ? side : Math.sign(x);
}
export function oneSidedDerivative(x: number, side: -1 | 1) {
  return 2 * x + 0.4 * sideSign(x + 0.6, side) + 0.2 * sideSign(x - 0.6, side);
}
export function jumpDerivative(x: number, side: -1 | 1 = -1) {
  return (sideSign(x + 1, side) + sideSign(x, side) + sideSign(x - 1, side)) / 4;
}
export function tangentGap(
  f: (x: number) => number,
  derivative: (x: number) => number,
  x0: number,
  z: number,
) {
  return f(z) - (f(x0) + derivative(x0) * (z - x0));
}
export function jensenWeights(w: number, third: number) {
  return [(1 - third) * w, (1 - third) * (1 - w), third];
}
export function quadrature(n: number, tag: number) {
  n = Math.round(n);
  let riemann = 0,
    trapezoid = 0;
  for (let i = 0; i < n; i++) {
    const a = i / n,
      b = (i + 1) / n;
    riemann += (a + (b - a) * tag) ** 2 / n;
    trapezoid += (a * a + b * b) / (2 * n);
  }
  return { riemann, trapezoid, exact: 1 / 3, bound: 1 / (4 * n * n) };
}
export function wallisIntegral(n: number) {
  let result = n % 2 === 0 ? Math.PI / 2 : 1;
  for (let k = n % 2 === 0 ? 2 : 3; k <= n; k += 2) result *= (k - 1) / k;
  return result;
}
export function wallisBounds(k: number) {
  let d = 1;
  for (let j = 1; j <= k; j++) d *= (2 * j) / (2 * j - 1);
  return { lower: (d * d) / (2 * k + 1), upper: (d * d) / (2 * k) };
}
export const gaussianBounds = (n: number) => ({
  lower: Math.sqrt(n) * wallisIntegral(2 * n + 1),
  upper: Math.sqrt(n) * wallisIntegral(2 * n - 2),
});
export const gammaDensity = (x: number, t: number) => Math.exp((t - 1) * Math.log(x) - x);
export function gammaTruncated(t: number, epsilon: number, R: number) {
  return integrate(
    (u) => {
      const x = Math.exp(u);
      return gammaDensity(x, t) * x;
    },
    Math.log(epsilon),
    Math.log(R),
    768,
  );
}
export function lp(v: number[], p: number) {
  const scale = Math.max(0, ...v.map(Math.abs));
  if (scale === 0 || p === Infinity) return scale;
  // Conjugate q tends to infinity as p tends to 1: normalize before taking powers.
  return (
    scale *
    Math.pow(
      v.reduce((sum, x) => sum + (Math.abs(x) / scale) ** p, 0),
      1 / p,
    )
  );
}
export const unitP = (angle: number, p: number): V2 => {
  const q: V2 = [Math.cos(angle), Math.sin(angle)];
  const n = lp(q, p);
  return [q[0] / n, q[1] / n];
};
export const fixedMap = ([x, y]: V2): V2 => [(1 - y) / 2, (1 + x) / 2];
export function hexBoard(seed: number, n = 7) {
  let state = seed >>> 0;
  return Array.from({ length: n * n }, () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state >>> 27) & 1;
  });
}
export function hexPath(board: number[], n = 7): { color: number; path: number[] } {
  for (const color of [0, 1]) {
    const parent = new Map<number, number>(),
      queue: number[] = [];
    for (let i = 0; i < n; i++) {
      const cell = color === 0 ? i * n : i;
      if (board[cell] === color) {
        queue.push(cell);
        parent.set(cell, -1);
      }
    }
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const cell = queue[cursor],
        r = Math.floor(cell / n),
        c = cell % n;
      if (color === 0 ? c === n - 1 : r === n - 1) {
        const path = [];
        let k = cell;
        while (k !== -1) {
          path.push(k);
          k = parent.get(k)!;
        }
        return { color, path: path.reverse() };
      }
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, -1],
        [-1, 1],
      ]) {
        const nr = r + dr,
          nc = c + dc,
          next = nr * n + nc;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n && board[next] === color && !parent.has(next)) {
          parent.set(next, cell);
          queue.push(next);
        }
      }
    }
  }
  throw new Error('Hex board must have a crossing');
}
export const hexCenter = (cell: number, n = 7): V2 => {
  const r = Math.floor(cell / n),
    c = cell % n;
  return [c + 0.5 * r, (Math.sqrt(3) / 2) * r];
};
export const graphSample = (f: (x: number) => number, a: number, b: number, n = 160): V2[] =>
  linspace(a, b, n).map((x) => [x, f(x)]);
