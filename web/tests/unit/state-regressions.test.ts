import { expect, test } from 'bun:test';
import { lessons } from '../../src/lessons';
import { atStep, changeParam, decodeState, encodeState, effectiveParameter } from '../../src/state';

test('ссылка сохраняет унаследованные параметры при переходах между шагами', () => {
  for (const lesson of lessons)
    for (let from = 0; from < lesson.steps.length; from++) {
      let state = atStep(lesson, from);
      for (const p of lesson.parameters)
        state = changeParam(state, lesson, p.key, effectiveParameter(lesson, p.key, from)!.max);
      for (let to = 0; to < lesson.steps.length; to++) {
        const next = atStep(lesson, to, state.params);
        const restored = decodeState(encodeState(next), lessons);
        for (const [key, value] of Object.entries(next.params))
          expect(
            Math.abs(restored.params[key] - value),
            `${lesson.id} ${from}→${to}: ${key}`,
          ).toBeLessThanOrEqual(1e-6);
      }
    }
});

test('ссылка не может переопределить фиксированную математическую позу', () => {
  expect(decodeState('#lagrange?step=3&t=0', lessons).params.t).toBeCloseTo(
    Math.asin(2 / Math.PI),
    12,
  );
  expect(decodeState('#oscillatory-integral?step=2&p=2', lessons).params.p).toBe(0);
});
