export const EULER_GAMMA = 0.5772156649015329;
export function harmonic(n: number) {
  let sum = 0;
  for (let k = 1; k <= n; k++) sum += 1 / k;
  return sum;
}
export function logFactorial(n: number) {
  let sum = 0;
  for (let k = 2; k <= n; k++) sum += Math.log(k);
  return sum;
}
export const harmonicRemainder = (n: number) => harmonic(n) - Math.log(n);
export const stirlingConstant = (n: number) => logFactorial(n) - (n + 0.5) * Math.log(n) + n;
export const wallisFactorials = (n: number) =>
  Math.exp(2 * n * Math.log(2) + 2 * logFactorial(n) - 0.5 * Math.log(n) - logFactorial(2 * n));
export const primitiveFunction = (kind: number, x: number) =>
  kind === 0 ? x : kind === 1 ? Math.sin(x) : 1 / (1 + x * x);
export const primitiveArea = (kind: number, x: number) =>
  kind === 0 ? (x * x) / 2 : kind === 1 ? 1 - Math.cos(x) : Math.atan(x);

export const piBoundLog = (n: number, q: number) =>
  Math.log(Math.PI) + n * Math.log(10 * q) - logFactorial(n);
export const piDensity = (n: number, x: number) => {
  const base = Math.max(0, Math.PI ** 2 / 4 - x * x);
  return (
    (n === 0 ? 1 : base === 0 ? 0 : Math.exp(n * Math.log(base) - logFactorial(n))) *
    Math.max(0, Math.cos(x))
  );
};
