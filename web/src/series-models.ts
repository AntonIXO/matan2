import type { V2 } from './math';

export function partialSums(term: (n: number) => number, count: number): number[] {
  const sums = [0];
  for (let n = 1; n <= Math.floor(count); n++) sums.push(sums[n - 1] + term(n));
  return sums;
}

export function harmonicBlock(n: number) {
  let sum = 0;
  for (let k = n + 1; k <= 2 * n; k++) sum += 1 / k;
  return sum;
}

export const alternatingTerm = (n: number, power = 1) => (n % 2 ? 1 : -1) / n ** power;

export function abelParts(n: number, power: number) {
  const boundary = (n % 2) / n ** power;
  let transformed = 0;
  for (let k = 1; k < n; k++) transformed += (k % 2) * (k ** -power - (k + 1) ** -power);
  return { boundary, transformed };
}

// The order is 1,3,2,5,7,4,...: every odd and every even index occurs exactly once.
export function rearrangedIndex(position: number) {
  const block = Math.floor((position - 1) / 3);
  const offset = (position - 1) % 3;
  return offset === 2 ? 2 * block + 2 : 4 * block + 2 * offset + 1;
}

export function seriesDiagnostics(n: number, power: number) {
  return {
    root: Math.exp((-power * Math.log(n)) / n),
    ratio: (n / (n + 1)) ** power,
    raabe: n * Math.expm1(power * Math.log1p(1 / n)),
  };
}

export function squareEnumeration(count: number): V2[] {
  const pairs: V2[] = [];
  for (let side = 1; pairs.length < count; side++) {
    for (let j = 1; j < side && pairs.length < count; j++) pairs.push([side, j]);
    for (let i = 1; i <= side && pairs.length < count; i++) pairs.push([i, side]);
  }
  return pairs;
}

export function diagonalEnumeration(count: number): V2[] {
  const pairs: V2[] = [];
  for (let sum = 2; pairs.length < count; sum++)
    for (let i = 1; i < sum && pairs.length < count; i++) pairs.push([i, sum - i]);
  return pairs;
}

export const productTerm = ([i, j]: V2) => 2 ** -i * 3 ** -j;
export const productSum = (pairs: V2[]) => pairs.reduce((sum, pair) => sum + productTerm(pair), 0);
export const productSquareSum = (n: number) => ((1 - 2 ** -n) * (1 - 3 ** -n)) / 2;
export const productDiagonalSum = (n: number) => 0.5 - 2 ** -n + 0.5 * 3 ** -n;
