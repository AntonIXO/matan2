export type V2 = [number, number];
export type V3 = [number, number, number];
export const TAU = 2 * Math.PI;
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const linspace = (a: number, b: number, n = 160) =>
  Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
export const norm = (v: number[]) => Math.hypot(...v);
export const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
export const mul = (v: V2, s: number): V2 => [v[0] * s, v[1] * s];
export const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
export const cross2 = (a: V2, b: V2) => a[0] * b[1] - a[1] * b[0];
export const quad = (x: number, y: number) => x * x + 2 * y * y;
export const gradient = (x: number, y: number): V2 => [2 * x, 4 * y];
export const remainder = (h: V2) => h[0] * h[0] + 2 * h[1] * h[1];
export const F = (p: V2): V2 => [
  p[0] + 0.5 * p[1] + 0.3 * p[1] ** 2,
  0.2 * p[0] + p[1] + 0.25 * p[0] ** 2,
];
export const G = (p: V2): V2 => [
  1.1 * p[0] + 0.6 * p[1] + 0.2 * p[1] ** 2,
  -0.3 * p[0] + 0.9 * p[1] + 0.15 * p[0] ** 2,
];
export const A = (p: V2): V2 => [p[0] + 0.5 * p[1], 0.2 * p[0] + p[1]];
export const B = (p: V2): V2 => [1.1 * p[0] + 0.6 * p[1], -0.3 * p[0] + 0.9 * p[1]];
export const ellipse = (t: number, a = 2, b = 1): V2 => [a * Math.cos(t), b * Math.sin(t)];
export const ellipseVelocity = (t: number, a = 2, b = 1): V2 => [-a * Math.sin(t), b * Math.cos(t)];
export const sigma = (u: number, k: number) => u + (k * Math.sin(TAU * u)) / TAU;
export const sigmaPrime = (u: number, k: number) => 1 + k * Math.cos(TAU * u);
export const polarRadius = (phi: number, c: number) => 1 + c * Math.cos(2 * phi);
export const polarPrime = (phi: number, c: number) => -2 * c * Math.sin(2 * phi);
export const polarPoint = (phi: number, c: number): V2 =>
  mul([Math.cos(phi), Math.sin(phi)], polarRadius(phi, c));
export function polarExtrema(a: number, b: number, c: number) {
  const vals = [polarRadius(a, c), polarRadius(b, c)];
  for (let k = Math.ceil(a / (Math.PI / 2)); k <= Math.floor(b / (Math.PI / 2)); k++)
    vals.push(polarRadius((k * Math.PI) / 2, c));
  return { min: Math.min(...vals), max: Math.max(...vals) };
}
export const polarArea = (a: number, b: number, c: number) =>
  0.5 *
  ((1 + (c * c) / 2) * (b - a) +
    c * (Math.sin(2 * b) - Math.sin(2 * a)) +
    ((c * c) / 8) * (Math.sin(4 * b) - Math.sin(4 * a)));
export const diameterRadius = (phi: number, q: number) =>
  Math.max(0, Math.cos(phi)) / (Math.cos(phi) ** 2 + Math.sin(phi) ** 2 / (q * q));
export function integrate(f: (x: number) => number, a: number, b: number, n = 512) {
  n = Math.max(2, Math.ceil(n / 2) * 2);
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * f(a + i * h);
  return (sum * h) / 3;
}
export const helix = (t: number): V3 => [Math.cos(t), Math.sin(t), 0.4 * t];
export const helixVelocity = (t: number): V3 => [-Math.sin(t), Math.cos(t), 0.4];
export const torusVolume = (R: number, r: number) => 2 * Math.PI ** 2 * R * r * r;
export const fmt = (v: number, digits = 3) => {
  if (v === 0) return '0';
  if (Math.abs(v) < 1e-12) return '≈0';
  if (Math.abs(v) < 10 ** -digits) {
    const [coefficient, exponent] = v.toExponential(2).split('e');
    const superscript: Record<string, string> = {
      '-': '⁻',
      '+': '',
      '0': '⁰',
      '1': '¹',
      '2': '²',
      '3': '³',
      '4': '⁴',
      '5': '⁵',
      '6': '⁶',
      '7': '⁷',
      '8': '⁸',
      '9': '⁹',
    };
    return (
      coefficient.replace('.', ',') +
      '·10' +
      String(+exponent)
        .split('')
        .map((c) => superscript[c])
        .join('')
    );
  }
  return v.toLocaleString('ru-RU', { maximumFractionDigits: digits });
};
export const trapezoidKernel = (x: number, a: number, b: number) => 0.5 * (x - a) * (b - x);
