import type { Lesson, Params, Parameter, Motion, Step } from './types';
import { clamp } from './math';
export type SceneState = { id: string; step: number; progress: number; params: Params };
export function effectiveParameter(l: Lesson, key: string, step = 0): Parameter | undefined {
  const p = l.parameters.find((p) => p.key === key);
  return p ? { ...p, ...l.steps[step]?.limits?.[key] } : undefined;
}
export function parameterValue(l: Lesson, key: string, value: number, step = 0) {
  const p = effectiveParameter(l, key, step);
  if (!p) return value;
  if (!Number.isFinite(value)) return p.value;
  const v = clamp(value, p.min, p.max);
  return p.step && p.step >= 1
    ? clamp(p.min + Math.round((v - p.min) / p.step) * p.step, p.min, p.max)
    : v;
}
export const defaults = (l: Lesson): Params =>
  Object.fromEntries(l.parameters.map((p) => [p.key, p.value]));
export function interpolate(from: number, to: number, t: number, log = false) {
  return log && from > 0 && to > 0 ? from * (to / from) ** t : from + (to - from) * t;
}
export function stepMotions(step: Step): Motion[] {
  return step.motion ? (Array.isArray(step.motion) ? step.motion : [step.motion]) : [];
}
export function motionProgress(m: Motion, value: number) {
  if (m.from === m.to) return 0;
  const v = clamp(value, Math.min(m.from, m.to), Math.max(m.from, m.to));
  return clamp(
    m.log && m.from > 0 && m.to > 0 && v > 0
      ? Math.log(v / m.from) / Math.log(m.to / m.from)
      : (v - m.from) / (m.to - m.from),
    0,
    1,
  );
}
export function atStep(l: Lesson, index = 0, base?: Params, progress?: number): SceneState {
  const step = clamp(Math.round(index), 0, l.steps.length - 1),
    st = l.steps[step],
    params = { ...defaults(l), ...base, ...st.pose };
  for (const p of l.parameters) params[p.key] = parameterValue(l, p.key, params[p.key], step);
  let position = progress ?? 0;
  for (const [index, m] of stepMotions(st).entries()) {
    if (progress !== undefined)
      params[m.key] = parameterValue(l, m.key, interpolate(m.from, m.to, progress, m.log), step);
    else if (m.from === m.to) params[m.key] = parameterValue(l, m.key, m.from, step);
    else {
      const value = clamp(params[m.key], Math.min(m.from, m.to), Math.max(m.from, m.to));
      params[m.key] = parameterValue(l, m.key, value, step);
      if (index === 0) position = motionProgress(m, value);
    }
  }
  return { id: l.id, step, progress: position, params };
}
export function decodeState(hash: string, lessons: Lesson[]): SceneState {
  const [id, query] = hash.replace(/^#/, '').split('?'),
    l =
      lessons.find((l) => l.id === id) ||
      lessons.find((l) => l.entrySteps?.[id] !== undefined) ||
      lessons.find((l) => l.tickets.includes(id)) ||
      lessons[0],
    q = new URLSearchParams(query),
    number = (key: string, fallback = 0) => {
      const v = q.get(key);
      return v !== null && Number.isFinite(+v) ? +v : fallback;
    };
  let state = atStep(
    l,
    clamp(Math.round(number('step', l.entrySteps?.[id] ?? 0)), 0, l.steps.length - 1),
    undefined,
    q.has('progress') ? clamp(number('progress'), 0, 1) : undefined,
  );
  const selectedStep = l.steps[state.step];
  for (const p of l.parameters)
    if (q.has(p.key)) {
      const locked = selectedStep.locked?.includes(p.key);
      // A fixed pose is a mathematical constraint. Other locked values can be
      // inherited from the previous step and must survive a shared-link reload.
      if (locked && selectedStep.pose?.[p.key] !== undefined) continue;
      const value = number(p.key, state.params[p.key]);
      if (q.has('progress') || locked)
        state.params[p.key] = parameterValue(l, p.key, value, state.step);
      else state = changeParam(state, l, p.key, value);
    }
  return state;
}
export function encodeState(s: SceneState) {
  const q = new URLSearchParams({ step: String(s.step), progress: String(+s.progress.toFixed(4)) });
  for (const [k, v] of Object.entries(s.params)) q.set(k, String(+v.toFixed(6)));
  return '#' + s.id + '?' + q;
}
export function seekState(s: SceneState, l: Lesson, progress: number): SceneState {
  const p = clamp(progress, 0, 1),
    params = { ...s.params };
  for (const m of stepMotions(l.steps[s.step]))
    params[m.key] = parameterValue(l, m.key, interpolate(m.from, m.to, p, m.log), s.step);
  return { ...s, progress: p, params };
}
export function changeParam(s: SceneState, l: Lesson, key: string, value: number): SceneState {
  if (l.steps[s.step].locked?.includes(key)) return s;
  const v = parameterValue(l, key, value, s.step),
    m = stepMotions(l.steps[s.step])[0];
  let progress = s.progress;
  if (m?.key === key && m.to !== m.from) progress = motionProgress(m, v);
  return { ...s, progress, params: { ...s.params, [key]: v } };
}
