import { describe, expect, test } from 'bun:test';
import {
  BROUWER_EPS as eps,
  BROUWER_DELTA as delta,
  brouwerGrid,
  brouwerDisplacement,
  brouwerColor,
  brouwerPair,
  BROUWER_SIGN_EXAMPLE,
  firstNegativePair,
  brouwerHexPosition,
  BROUWER_COLOR_EXAMPLES,
  displacementColor,
  hexBoard,
  hexPath,
  fixedMap,
} from '../../src/models';
import { lessons } from '../../src/lessons';
import { atStep, decodeState, seekState, stepMotions } from '../../src/state';

const lesson = lessons.find((l) => l.id === 'brouwer')!;
describe('Брауэр: разные переходы и строгое противоречие', () => {
  test('образ в квадрате, смещение знаковое, минимум примера равен нулю', () => {
    for (let x = 0; x <= 1; x += 0.1)
      for (let y = 0; y <= 1; y += 0.1) {
        for (const coordinate of fixedMap([x, y])) {
          expect(coordinate).toBeGreaterThanOrEqual(0);
          expect(coordinate).toBeLessThanOrEqual(1);
        }
      }
    expect(brouwerDisplacement([0.2, 0.4]).displacement[0]).toBeCloseTo(0.1, 12);
    expect(brouwerDisplacement([0.8, 0.4]).displacement[0]).toBeCloseTo(-0.5, 12);
    expect(brouwerDisplacement([0.2, 0.6]).g).toBeCloseTo(0, 12);
    expect(brouwerColor([0.2, 0.6])).toBe(0);
    expect(brouwerColor([0, 0])).toBe(1); // first matching index when both work
    expect(brouwerColor([0.4, 0.2])).toBe(2);
  });
  test('n=14 ещё не подходит, n=15 уже да; диагональные соседи учтены', () => {
    expect(brouwerGrid(14).fine).toBe(false);
    expect(brouwerGrid(15).fine).toBe(true);
    expect(brouwerGrid(15).minimumN).toBe(15);
    for (let n = 4; n <= 24; n++) {
      const g = brouwerGrid(n);
      expect(g.diagonal).toBeCloseTo(Math.hypot(g.side, g.side), 12);
      expect(g.side).toBeLessThan(g.diagonal);
      expect(g.fine).toBe(g.diagonal < delta);
    }
  });
  test('изменение разности включает оба слагаемых с противоположными знаками', () => {
    const p = brouwerPair(20);
    expect(p.v).toEqual([0.2, 0.4]);
    expect(p.next).toEqual([0.25, 0.45]);
    expect(p.first.displacement[0]).toBeCloseTo(0.1, 12);
    expect(p.second.displacement[0]).toBeCloseTo(0.025, 12);
    expect(p.imageChange).toBeCloseTo(-0.025, 12);
    expect(p.inputChange).toBeCloseTo(0.05, 12);
    expect(p.change).toBeCloseTo(0.075, 12);
    for (let n = 15; n <= 24; n++)
      for (const x of [0, 0.2, 1]) {
        const p = brouwerPair(n, x, 0.4);
        expect(Math.hypot(p.next[0] - p.v[0], p.next[1] - p.v[1])).toBeLessThan(delta);
        expect(p.change).toBeLessThanOrEqual(p.bound + 1e-12);
        expect(p.bound).toBeLessThan(2 * eps);
        expect(p.next.every((v) => v >= 0 && v <= 1)).toBe(true);
      }
  });
  test('первая смена знака выделяет соседей и требует не меньше 2ε', () => {
    const pair = firstNegativePair(BROUWER_SIGN_EXAMPLE);
    expect(pair.index).toBe(3);
    expect(pair.before).toBe(eps);
    expect(pair.after).toBe(-eps);
    expect(pair.jump).toBe(2 * eps);
    for (const positive of [eps, 0.2, 0.7])
      for (const negative of [-eps, -0.2, -0.9])
        expect(firstNegativePair([positive, negative]).jump).toBeGreaterThanOrEqual(2 * eps);
    expect(() => firstNegativePair([0.1, 0.2])).toThrow();
  });
  test('цвет определяется модулем координаты, а не знаком', () => {
    expect(BROUWER_COLOR_EXAMPLES.map((d) => displacementColor(d))).toEqual([1, 1, 2, 2]);
    expect(displacementColor([eps, 0.2])).toBe(1);
    expect(displacementColor([-eps, -0.2])).toBe(1);
    expect(displacementColor([0, 0])).toBe(0);
  });
  test('шестиугольные центры имеют шесть равноудалённых соседей', () => {
    const n = 7,
      center = 24,
      neighbours = [23, 25, 17, 31, 18, 30];
    const at = brouwerHexPosition(center, n, 0);
    for (const k of neighbours) {
      const neighbour = brouwerHexPosition(k, n, 0);
      expect(Math.hypot(neighbour[0] - at[0], neighbour[1] - at[1])).toBeCloseTo(220 / 6, 10);
    }
    for (const morph of [0, 0.25, 0.5, 0.75, 1]) {
      const positions = Array.from({ length: 49 }, (_, k) => brouwerHexPosition(k, n, morph));
      expect(new Set(positions.map((p) => p.join(','))).size).toBe(49);
    }
    expect(brouwerHexPosition(42, 7, 1)).toEqual([80, 340]);
    expect(brouwerHexPosition(6, 7, 1)).toEqual([380, 40]);
  });
  test('квадратная доска сохраняет соседство Гекса и нужные стороны', () => {
    const n = 7;
    for (let seed = 1; seed <= 100; seed++) {
      const board = hexBoard(seed, n),
        { color, path } = hexPath(board, n);
      const pos = (cell: number) => [cell % n, n - 1 - Math.floor(cell / n)];
      const start = pos(path[0]),
        end = pos(path.at(-1)!);
      expect(start[color]).toBe(color ? n - 1 : 0);
      expect(end[color]).toBe(color ? 0 : n - 1);
      path.forEach((cell, k) => {
        expect(board[cell]).toBe(color);
        if (!k) return;
        const a = pos(cell),
          b = pos(path[k - 1]);
        const dx = a[0] - b[0],
          dy = a[1] - b[1];
        expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(Math.SQRT2);
        if (dx && dy) expect(dx).toBe(dy);
      });
    }
  });
  test('старый маршрут, билет и движения восьми шагов доступны', () => {
    expect(decodeState('#th-b1-02', lessons).id).toBe('brouwer');
    expect(decodeState('#brouwer?seed=77.7', lessons).params.seed).toBe(78);
    expect(lesson.steps).toHaveLength(8);
    for (const [index, step] of lesson.steps.entries()) {
      const motion = stepMotions(step)[0];
      expect(step.locked?.includes(motion.key)).toBe(false);
      const state = atStep(lesson, index);
      expect(seekState(state, lesson, 0).params[motion.key]).not.toBe(
        seekState(state, lesson, 1).params[motion.key],
      );
    }
  });
});
