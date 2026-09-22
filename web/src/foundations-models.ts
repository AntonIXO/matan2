export function tailBounds(n: number, amplitude: number) {
  const even = n % 2 === 0 ? n : n + 1;
  const odd = n % 2 === 1 ? n : n + 1;
  return { upper: amplitude + 1 / even, lower: -amplitude - 1 / odd, even, odd };
}
export function tailValue(n: number, amplitude: number) {
  return (n % 2 === 0 ? 1 : -1) * (amplitude + 1 / n);
}
export function cauchySine(x: number, y: number) {
  const slope = (Math.sin(x) - Math.sin(y)) / (x - y);
  return { slope, xi: Math.acos(Math.min(1, Math.max(-1, slope))), correction: Math.sin(y) / x };
}
export function chebyshevDiscrete(n: number, slope: number) {
  const f = (n + 1) / (2 * n);
  const g = slope * f;
  const fg = (slope * (n + 1) * (2 * n + 1)) / (6 * n * n);
  return { f, g, fg, covariance: fg - f * g };
}
