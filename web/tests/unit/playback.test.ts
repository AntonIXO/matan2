import { describe, expect, test } from 'bun:test';
import { lessons } from '../../src/lessons';
import { advanceTrack, createTrack, parameterMotion } from '../../src/playback';
import {
  atStep,
  changeParam,
  decodeState,
  effectiveParameter,
  encodeState,
  interpolate,
  parameterValue,
  seekState,
  stepMotions,
} from '../../src/state';

describe('Движение туда-обратно', () => {
  test('проходит обе границы и продолжает следующие циклы без остановки', () => {
    const motion = { key: 'x', from: 0, to: 8 };
    let track = createTrack(motion, 0);
    for (const [seconds, value, direction] of [
      [4, 8, -1],
      [1, 6, -1],
      [3, 0, 1],
      [0.5, 1, 1],
      [17, 3, 1],
    ] as const) {
      const next = advanceTrack(track, seconds, 4);
      expect(next.value).toBeCloseTo(value, 12);
      expect(next.track.direction).toBe(direction);
      track = next.track;
    }
  });

  test('остаток кадра после разворота не теряется; старт с конца едет назад', () => {
    const motion = { key: 'x', from: 0, to: 1 };
    const crossing = advanceTrack(createTrack(motion, 0.95), 0.6, 6);
    expect(crossing.value).toBeCloseTo(0.95, 12);
    expect(crossing.track.direction).toBe(-1);
    const endpoint = createTrack(motion, 1);
    expect(advanceTrack(endpoint, 0, 6).value).toBe(1);
    expect(advanceTrack(endpoint, 0.6, 6).value).toBeCloseTo(0.9, 12);
  });

  test('пауза и продолжение сохраняют обратное направление и точное значение', () => {
    const motion = { key: 'x', from: 0, to: 8 };
    const reverse = advanceTrack(createTrack(motion, 0), 5, 4);
    const paused = advanceTrack(reverse.track, 0, 4);
    expect(paused).toEqual(reverse);
    expect(advanceTrack(paused.track, 1, 4).value).toBe(4);
    expect(advanceTrack(paused.track, 2, 4).value).toBe(2);
  });

  test('логарифмический параметр проходит геометрическую середину в обе стороны', () => {
    const motion = { key: 'radius', from: 0.64, to: 0.04, log: true };
    const start = createTrack(motion, motion.from);
    expect(advanceTrack(start, 3, 6).value).toBeCloseTo(0.16, 12);
    const end = advanceTrack(start, 6, 6);
    expect(end.value).toBeCloseTo(0.04, 12);
    expect(advanceTrack(end.track, 3, 6).value).toBeCloseTo(0.16, 12);
    expect(advanceTrack(end.track, 6, 6).value).toBeCloseTo(0.64, 12);
  });

  test('ручное значение вне демонстрационного отрезка не скачет при запуске', () => {
    const motion = { key: 'x', from: 0.2, to: 0.8 };
    const track = createTrack(motion, 0.95);
    expect(advanceTrack(track, 0, 6).value).toBe(0.95);
    expect(advanceTrack(track, 0.06, 6).value).toBeCloseTo(0.9425, 12);
    expect(advanceTrack(track, 6, 6).value).toBeCloseTo(0.2, 12);
  });

  test('целочисленный ползунок не застревает из-за округления каждого кадра', () => {
    const lesson = lessons.find((lesson) => lesson.id === 'jumps')!;
    const motion = parameterMotion(lesson, 0, 'k')!;
    let track = createTrack(motion, motion.from);
    const values = new Set<number>();
    for (let frame = 0; frame < 720; frame++) {
      const next = advanceTrack(track, 1 / 60, 6);
      values.add(parameterValue(lesson, 'k', next.value));
      track = next.track;
    }
    expect([...values].sort()).toEqual([0, 1, 2]);
    expect(track.progress).toBeCloseTo(0, 10);
  });

  test('режим всех шагов доходит до конца без разворота', () => {
    const track = createTrack({ key: 'x', from: 0, to: 8 }, 4, 0.5);
    expect(advanceTrack(track, 1.5, 6, false).value).toBe(6);
    const end = advanceTrack(track, 10, 6, false);
    expect(end.value).toBe(8);
    expect(end.track.progress).toBe(1);
    expect(end.track.direction).toBe(1);
  });

  test('нечисловое время и неположительная длительность отклоняются', () => {
    const track = createTrack({ key: 'x', from: 0, to: 1 }, 0);
    for (const [seconds, duration] of [
      [NaN, 6],
      [Infinity, 6],
      [1, 0],
      [1, -1],
      [1, Infinity],
    ])
      expect(() => advanceTrack(track, seconds, duration)).toThrow(RangeError);
  });
});

describe('Несколько параметров и ограничения урока', () => {
  test('каждый заданный маршрут использует допустимые границы и не двигает locked', () => {
    for (const lesson of lessons)
      lesson.steps.forEach((step, index) => {
        const motions = stepMotions(step);
        expect(new Set(motions.map((motion) => motion.key)).size).toBe(motions.length);
        for (const motion of motions) {
          const parameter = effectiveParameter(lesson, motion.key, index)!;
          for (const value of [motion.from, motion.to]) {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(parameter.min);
            expect(value).toBeLessThanOrEqual(parameter.max);
          }
          if (motion.from !== motion.to) expect(step.locked ?? []).not.toContain(motion.key);
        }
      });
  });

  test('перемотка меняет все маршруты, а ссылка сохраняет независимо выбранные значения', () => {
    let checked = 0;
    for (const lesson of lessons)
      lesson.steps.forEach((step, index) => {
        const motions = stepMotions(step);
        if (motions.length < 2) return;
        checked++;
        for (const progress of [0, 0.25, 0.75, 1]) {
          const state = seekState(atStep(lesson, index), lesson, progress);
          for (const motion of motions)
            expect(state.params[motion.key]).toBeCloseTo(
              parameterValue(
                lesson,
                motion.key,
                interpolate(motion.from, motion.to, progress, motion.log),
                index,
              ),
              12,
            );
        }
        const state = seekState(atStep(lesson, index), lesson, 0.25);
        const second = motions[1];
        const independent = changeParam(state, lesson, second.key, second.to);
        expect(independent.progress).toBe(state.progress);
        expect(independent.params[motions[0].key]).toBe(state.params[motions[0].key]);
        const restored = decodeState(encodeState(independent), lessons);
        for (const [key, value] of Object.entries(independent.params))
          expect(restored.params[key]).toBeCloseTo(value, 5);
      });
    expect(checked).toBeGreaterThan(0);
  });

  test('фиксированные условия и статические шаги не получают кнопку анимации', () => {
    const lesson = (id: string) => lessons.find((lesson) => lesson.id === id)!;
    expect(parameterMotion(lesson('differentiability'), 0, 'radius')).toBeUndefined();
    expect(parameterMotion(lesson('differentiability'), 2, 'radius')).toBeDefined();
    expect(parameterMotion(lesson('lagrange'), 3, 't')).toBeUndefined();
    expect(parameterMotion(lesson('quadrature'), 2, 'n')).toBeUndefined();
    expect(parameterMotion(lesson('jacobian'), 1, 'angle')).toBeUndefined();
    expect(parameterMotion(lesson('path'), 1, 'k')).toEqual({ key: 'k', from: -0.75, to: 0.75 });
    expect(parameterMotion(lesson('path'), 0, 'k')).toBeUndefined();
  });
});
