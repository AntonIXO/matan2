import type { Lesson, Motion } from './types';
import { effectiveParameter, interpolate, motionProgress, stepMotions } from './state';

export type PlaybackTrack = {
  motion: Motion;
  progress: number;
  direction: 1 | -1;
  anchorProgress: number;
  anchorValue: number;
};

export function parameterMotion(lesson: Lesson, step: number, key: string): Motion | undefined {
  const selected = lesson.steps[step];
  if (selected.locked?.includes(key)) return;
  const motion = stepMotions(selected).find((motion) => motion.key === key);
  if (motion) return motion.from !== motion.to ? motion : undefined;
  // A pose outside the step's motion holds a condition of the demonstration fixed.
  if (selected.pose?.[key] !== undefined) return;
  const p = effectiveParameter(lesson, key, step);
  if (p && p.min < p.max) return { key, from: p.min, to: p.max };
}

export function createTrack(
  motion: Motion,
  value: number,
  forwardProgress?: number,
): PlaybackTrack {
  const progress = forwardProgress ?? motionProgress(motion, value);
  return {
    motion,
    progress,
    direction: forwardProgress === undefined && progress >= 1 ? -1 : 1,
    anchorProgress: progress,
    anchorValue: value,
  };
}

export function advanceTrack(
  initial: PlaybackTrack,
  seconds: number,
  duration: number,
  loop = true,
): { track: PlaybackTrack; value: number } {
  if (!Number.isFinite(seconds) || !Number.isFinite(duration) || duration <= 0)
    throw new RangeError('Playback requires finite time and a positive duration');
  const track = { ...initial };
  let remaining = Math.max(0, seconds) / duration;
  while (remaining > 0) {
    const endpoint = track.direction === 1 ? 1 : 0;
    const available = Math.abs(endpoint - track.progress);
    const travel = Math.min(remaining, available);
    track.progress += track.direction * travel;
    remaining -= travel;
    if (travel === available) {
      track.progress = endpoint;
      if (!loop) break;
      track.direction = track.direction === 1 ? -1 : 1;
      track.anchorProgress = endpoint;
      track.anchorValue = endpoint === 1 ? track.motion.to : track.motion.from;
    }
  }
  // Progress is kept separately from the rounded slider value, so integer
  // parameters continue moving even when many frames show the same integer.
  const endpoint = track.direction === 1 ? 1 : 0;
  const span = Math.abs(endpoint - track.anchorProgress);
  const fraction = span ? Math.abs(track.progress - track.anchorProgress) / span : 1;
  return {
    track,
    value: interpolate(
      track.anchorValue,
      endpoint === 1 ? track.motion.to : track.motion.from,
      Math.min(1, fraction),
      track.motion.log,
    ),
  };
}
