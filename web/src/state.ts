import type { Lesson, Params, Parameter } from './types';
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
export function atStep(l: Lesson, index = 0, base?: Params, progress?: number): SceneState {
  const step = clamp(Math.round(index), 0, l.steps.length - 1),
    st = l.steps[step],
    params = { ...defaults(l), ...base, ...st.pose };
  for (const p of l.parameters) params[p.key] = parameterValue(l, p.key, params[p.key], step);
  let position = progress ?? 0;
  if (st.motion) {
    const m = st.motion;
    if (progress !== undefined)
      params[m.key] = parameterValue(l, m.key, interpolate(m.from, m.to, progress, m.log), step);
    else if (m.from === m.to) params[m.key] = parameterValue(l, m.key, m.from, step);
    else {
      const value = clamp(params[m.key], Math.min(m.from, m.to), Math.max(m.from, m.to));
      params[m.key] = parameterValue(l, m.key, value, step);
      position = clamp(
        m.log
          ? Math.log(value / m.from) / Math.log(m.to / m.from)
          : (value - m.from) / (m.to - m.from),
        0,
        1,
      );
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
  for (const p of l.parameters)
    if (q.has(p.key) && !l.steps[state.step].locked?.includes(p.key)) {
      const value = number(p.key, state.params[p.key]);
      if (q.has('progress')) state.params[p.key] = parameterValue(l, p.key, value, state.step);
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
  const m = l.steps[s.step].motion,
    p = clamp(progress, 0, 1),
    params = { ...s.params };
  if (m) params[m.key] = parameterValue(l, m.key, interpolate(m.from, m.to, p, m.log), s.step);
  return { ...s, progress: p, params };
}
export function changeParam(s: SceneState, l: Lesson, key: string, value: number): SceneState {
  if (l.steps[s.step].locked?.includes(key)) return s;
  const v = parameterValue(l, key, value, s.step),
    m = l.steps[s.step].motion;
  let progress = s.progress;
  if (m?.key === key && m.to !== m.from)
    progress = clamp(
      m.log && v > 0
        ? Math.log(v / m.from) / Math.log(m.to / m.from)
        : (v - m.from) / (m.to - m.from),
      0,
      1,
    );
  return { ...s, progress, params: { ...s.params, [key]: v } };
}
