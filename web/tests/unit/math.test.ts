import { describe, test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import katex from 'katex';
import { formulaRows } from '../../src/Formula';
import { lessons } from '../../src/lessons';
import metadata from '../../src/generated/notes.json';
import {
  F,
  G,
  A,
  B,
  quad,
  remainder,
  gradient,
  ellipse,
  ellipseVelocity,
  sigma,
  sigmaPrime,
  integrate,
  norm,
  mul,
  sub,
  dot,
  cross2,
  TAU,
  polarExtrema,
  polarArea,
  polarRadius,
  diameterRadius,
  helix,
  helixVelocity,
  torusVolume,
  trapezoidKernel,
  linspace,
} from '../../src/math';
import {
  atStep,
  decodeState,
  encodeState,
  changeParam,
  seekState,
  parameterValue,
  effectiveParameter,
} from '../../src/state';
import {
  quadrature,
  wallisIntegral,
  wallisBounds,
  gaussianBounds,
  gammaTruncated,
  lp,
  unitP,
  fixedMap,
  hexBoard,
  hexPath,
  hexCenter,
  elementaryExtrema,
  elementary,
} from '../../src/models';
const close = (a: number, b: number, tol = 1e-8) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
describe('Модели перенесённых Blender-сцен', () => {
  test('разложение параболоида и равномерная оценка по всем направлениям', () => {
    for (const r of [0.65, 0.2, 0.06, 0.04])
      for (const a of linspace(0, TAU, 40)) {
        const h = mul([Math.cos(a), Math.sin(a)], r);
        close(quad(0.5 + h[0], 0.25 + h[1]) - quad(0.5, 0.25), h[0] + h[1] + remainder(h));
        expect(remainder(h) / norm(h)).toBeLessThanOrEqual(2 * norm(h) + 1e-12);
        close(remainder(mul(h, 0.5)) / norm(mul(h, 0.5)), (0.5 * remainder(h)) / norm(h));
      }
  });
  test('лесенка имеет точные промежуточные точки Blender', () => {
    const d1 = quad(1.05, 0.1) - quad(0.2, 0.1),
      d2 = quad(1.05, 0.75) - quad(1.05, 0.1);
    close(d1, 2 * 0.625 * 0.85);
    close(d2, 4 * 0.425 * 0.65);
    close(d1 + d2, quad(1.05, 0.75) - quad(0.2, 0.1));
  });
  test('матрицы в порядке BA и нелинейная композиция', () => {
    for (const h of [
      [0.5, 0.3],
      [-0.7, 0.2],
      [0, 0],
    ] as [number, number][]) {
      const ba = B(A(h));
      close(ba[0], 1.22 * h[0] + 1.15 * h[1]);
      close(ba[1], -0.12 * h[0] + 0.75 * h[1]);
    }
    const h: [number, number] = [0.2, -0.3];
    close(F(h)[0], 0.077);
    close(F(h)[1], -0.25);
    const error = (r: number) => norm(sub(G(F(mul(h, r))), B(A(mul(h, r))))) / (r * norm(h));
    expect(error(0.01)).toBeLessThan(error(0.1) / 5);
    expect(norm(sub(A(B(h)), B(A(h))))).toBeGreaterThan(0.01);
  });
  test('скалярная Лагранжа и ненулевая скорость окружности', () => {
    const v = helix(Math.PI).map((x, i) => x - helix(0)[i]),
      c = Math.asin(2 / Math.PI);
    close(dot(v, v), dot(v, helixVelocity(c)) * Math.PI);
    for (const a of linspace(0, TAU, 20)) close(Math.hypot(-Math.sin(a), Math.cos(a)), 1);
  });
  test('три экстремальных направления градиента', () => {
    const g = gradient(0.5, 0.25);
    [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4].forEach((a, i) =>
      close(dot(g, [Math.cos(a), Math.sin(a)]), [Math.sqrt(2), 0, -Math.sqrt(2)][i]),
    );
  });
});
describe('Пути, площади и объёмы', () => {
  test('перепараметризация без остановок сохраняет длину', () => {
    const length = integrate((t) => norm(ellipseVelocity(t)), 0, TAU, 2048);
    for (const k of [-0.75, 0, 0.75]) {
      for (const u of linspace(0, 1, 100))
        expect(sigmaPrime(u, k)).toBeGreaterThanOrEqual(0.25 - 1e-12);
      close(
        integrate(
          (u) => norm(ellipseVelocity(TAU * sigma(u, k))) * TAU * sigmaPrime(u, k),
          0,
          1,
          2048,
        ),
        length,
        1e-7,
      );
    }
  });
  test('обратный обход меняет знак ориентированной площади, не обычную площадь', () => {
    for (const direction of [-1, 1])
      close(
        integrate(
          (t) => cross2(ellipse(direction * t), mul(ellipseVelocity(direction * t), direction)) / 2,
          0,
          TAU,
        ),
        direction * 2 * Math.PI,
      );
  });
  test('аналитический зажим полярной площади при крайних параметрах', () => {
    for (const c of [0, 0.1, 0.4])
      for (const a of linspace(0, TAU, 24))
        for (const delta of [0.02, 0.3, 1.5, TAU]) {
          const { min, max } = polarExtrema(a, a + delta, c),
            area = polarArea(a, a + delta, c);
          for (const t of linspace(a, a + delta, 50)) {
            expect(polarRadius(t, c) + 1e-12).toBeGreaterThanOrEqual(min);
            expect(polarRadius(t, c) - 1e-12).toBeLessThanOrEqual(max);
          }
          expect(area + 1e-10).toBeGreaterThanOrEqual((min * min * delta) / 2);
          expect(area - 1e-10).toBeLessThanOrEqual((max * max * delta) / 2);
          close(
            area,
            integrate((t) => polarRadius(t, c) ** 2 / 2, a, a + delta, 1024),
            1e-8,
          );
        }
  });
  test('перпендикулярные лучи, Пифагор и диаметр 1', () => {
    for (const q of [0.2, 0.4, 0.7, 1])
      for (const t of linspace(0, Math.PI / 2, 80)) {
        const u: [number, number] = [Math.cos(t), Math.sin(t)],
          v: [number, number] = [Math.sin(t), -Math.cos(t)],
          ra = diameterRadius(t, q),
          rb = diameterRadius(t - Math.PI / 2, q);
        close(dot(u, v), 0);
        close(norm(sub(mul(u, ra), mul(v, rb))) ** 2, ra * ra + rb * rb);
        expect(ra * ra + rb * rb).toBeLessThanOrEqual(1 + 1e-12);
      }
    close(polarArea(0, TAU, 0), Math.PI);
    close(
      0.5 * integrate((t) => diameterRadius(t, 1) ** 2, -Math.PI / 2, Math.PI / 2),
      Math.PI / 4,
    );
  });
  test('диски, цилиндрические слои, тор включая r=R', () => {
    close(
      integrate((u) => Math.PI * (1 - u * u) ** 2, 0, 1),
      (8 * Math.PI) / 15,
    );
    close(
      integrate((r) => TAU * r * (1 - r * r), 0, 1),
      Math.PI / 2,
    );
    for (const R of [0.7, 1, 1.5])
      for (const ratio of [0.1, 0.5, 1]) {
        const r = R * ratio;
        // Слои тора: радиус s=R+r sin t, высота 2r cos t.
        const volume = integrate(
          (t) => 4 * Math.PI * r * r * (R + r * Math.sin(t)) * Math.cos(t) ** 2,
          -Math.PI / 2,
          Math.PI / 2,
          2048,
        );
        close(volume, torusVolume(R, r), 1e-7);
      }
  });
});
describe('Квадратуры, специальные функции, топология', () => {
  test('ошибка трапеции равна минус интеграл f″Ψ и удовлетворяет оценке', () => {
    for (const n of [1, 2, 8, 32]) {
      const q = quadrature(n, 0.5),
        err = q.exact - q.trapezoid;
      close(err, -n * integrate((x) => 2 * trapezoidKernel(x, 0, 1 / n), 0, 1 / n));
      expect(Math.abs(err)).toBeLessThanOrEqual(q.bound + 1e-12);
      expect(Math.abs(q.riemann - q.exact)).toBeLessThan(Math.abs(err));
    }
  });
  test('средние высоты лежат между аналитическими экстремумами', () => {
    for (const kind of [0, 1, 2])
      for (const b of linspace(-0.8, 2, 20)) {
        const [lo, hi] = elementaryExtrema(kind, -1, b),
          average = integrate((x) => elementary(kind, x), -1, b) / (b + 1);
        expect(average).toBeGreaterThanOrEqual(lo - 1e-8);
        expect(average).toBeLessThanOrEqual(hi + 1e-8);
      }
  });
  test('зажим Валлиса и гауссового интеграла', () => {
    for (const k of [1, 2, 10, 40, 60]) {
      const w = wallisBounds(k);
      expect(w.lower).toBeLessThan(Math.PI / 2);
      expect(w.upper).toBeGreaterThan(Math.PI / 2);
      expect(w.upper - w.lower).toBeLessThanOrEqual(Math.PI / (4 * k));
      const g = gaussianBounds(k);
      expect(g.lower).toBeLessThan(Math.sqrt(Math.PI) / 2);
      expect(g.upper).toBeGreaterThan(Math.sqrt(Math.PI) / 2);
      close(
        wallisIntegral(2 * k + 1),
        integrate((x) => Math.sin(x) ** (2 * k + 1), 0, Math.PI / 2, 2048),
        1e-9,
      );
    }
  });
  test('гамма-площадь имеет правильные обрезанные пределы', () => {
    for (const epsilon of [0.005, 0.05, 0.2])
      close(gammaTruncated(1, epsilon, 8), Math.exp(-epsilon) - Math.exp(-8), 1e-8);
    close(gammaTruncated(2, 0.005, 12), (1 + 0.005) * Math.exp(-0.005) - 13 * Math.exp(-12), 1e-7);
  });
  test('шары lp, Гёльдер и Минковский в двумерных примерах', () => {
    for (const p of [1, 1.05, 2, 3, 8])
      for (const t of linspace(0, TAU, 50)) {
        close(lp(unitP(t, p), p), 1);
        const a = [0.7, 0.2],
          b = [0.65 * Math.cos(t), 0.65 * Math.sin(t)],
          sum = a.map((x, i) => x + b[i]),
          q = p === 1 ? Infinity : p / (p - 1);
        expect(lp(sum, p)).toBeLessThanOrEqual(lp(a, p) + lp(b, p) + 1e-10);
        expect(a.reduce((s, x, i) => s + Math.abs(x * b[i]), 0)).toBeLessThanOrEqual(
          lp(a, p) * lp(b, q) + 1e-10,
        );
      }
  });
  test('неподвижная точка и сохранение квадрата', () => {
    const q = fixedMap([0.2, 0.6]);
    close(q[0], 0.2);
    close(q[1], 0.6);
    for (const x of linspace(0, 1, 10))
      for (const y of linspace(0, 1, 10))
        for (const v of fixedMap([x, y])) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
  });
  test('Гекс: найденный путь одноцветен, соседний и соединяет нужные стороны', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const board = hexBoard(seed),
        { path, color } = hexPath(board);
      expect(path.length).toBeGreaterThanOrEqual(7);
      path.forEach((cell, i) => {
        expect(board[cell]).toBe(color);
        if (i) close(norm(sub(hexCenter(cell), hexCenter(path[i - 1]))), 1);
      });
      if (color === 0) {
        expect(path[0] % 7).toBe(0);
        expect(path.at(-1)! % 7).toBe(6);
      } else {
        expect(Math.floor(path[0] / 7)).toBe(0);
        expect(Math.floor(path.at(-1)! / 7)).toBe(6);
      }
    }
  });
});
describe('Каталог, состояния и PDF', () => {
  test('все сцены имеют 3–6 шагов, валидные ссылки и формулы', () => {
    expect(lessons.length).toBe(34);
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
    for (const l of lessons) {
      expect(l.steps.length).toBeGreaterThanOrEqual(3);
      expect(l.steps.length).toBeLessThanOrEqual(6);
      for (const id of l.tickets) expect(id in metadata.tickets).toBe(true);
      l.steps.forEach((st, i) => {
        expect(() =>
          katex.renderToString(st.formula, { throwOnError: true, strict: 'error' }),
        ).not.toThrow();
        for (const row of formulaRows(st.formula))
          expect(() =>
            katex.renderToString(row, { throwOnError: true, strict: 'error' }),
          ).not.toThrow();
        const state = atStep(l, i);
        for (const base of l.parameters) {
          const p = effectiveParameter(l, base.key, i)!;
          expect(state.params[p.key]).toBeGreaterThanOrEqual(p.min - 1e-8);
          expect(state.params[p.key]).toBeLessThanOrEqual(p.max + 1e-8);
        }
        if (st.motion) {
          expect(l.parameters.some((p) => p.key === st.motion!.key)).toBe(true);
        }
      });
    }
  });
  test('ссылка восстанавливает шаг и параметры на всех сценах', () => {
    for (const l of lessons)
      l.steps.forEach((_, i) => {
        const s = seekState(atStep(l, i), l, 0.42),
          d = decodeState(encodeState(s), lessons);
        expect(d.id).toBe(l.id);
        expect(d.step).toBe(i);
        close(d.progress, 0.42);
        for (const [key, value] of Object.entries(s.params)) close(d.params[key], value, 1e-6);
      });
  });
  test('повреждённые ссылки и дискретные ползунки нормализуются', () => {
    for (const hash of [
      '#staircase?step=Infinity&t=NaN',
      '#path?direction=0&laps=1.3&step=2.7',
      '#bad?step=-30',
      '#brouwer?seed=77.7',
      '#gamma?epsilon=-100&t=Infinity',
    ]) {
      const s = decodeState(hash, lessons),
        l = lessons.find((l) => l.id === s.id)!;
      expect(Number.isInteger(s.step)).toBe(true);
      for (const p of l.parameters) {
        expect(Number.isFinite(s.params[p.key])).toBe(true);
        expect(s.params[p.key]).toBeGreaterThanOrEqual(p.min);
        expect(s.params[p.key]).toBeLessThanOrEqual(p.max);
      }
    }
    expect(decodeState('#th-b1-23', lessons).id).toBe('jumps');
  });
  test('ручное изменение синхронизирует ход шага, seek обратим', () => {
    const l = lessons.find((l) => l.id === 'differentiability')!,
      s = atStep(l, 2),
      half = changeParam(s, l, 'radius', Math.sqrt(0.65 * 0.04));
    close(half.progress, 0.5);
    close(seekState(half, l, 0.5).params.radius, half.params.radius);
    close(seekState(half, l, 0).params.radius, 0.65);
    const locked = lessons.find((l) => l.id === 'lagrange')!;
    expect(changeParam(atStep(locked, 3), locked, 't', 0).params.t).toBe(Math.asin(2 / Math.PI));
  });
  test('PDF и скачиваемый Blender существуют', () => {
    expect(readFileSync('public/notes.pdf').subarray(0, 5).toString()).toBe('%PDF-');
    expect(existsSync('public/blender/differentiation_live.blend')).toBe(true);
    for (const t of Object.values(metadata.tickets)) expect(t.page).toBeGreaterThan(0);
  });
});

test('Полный оборот окружности имеет настоящий параметр t от 0 до 2π', () => {
  const l = lessons.find((l) => l.id === 'lagrange')!;
  const s = seekState(atStep(l, 4), l, 1);
  close(s.params.t, TAU);
  close(decodeState(encodeState(s), lessons).params.t, TAU, 1e-6);
  close(atStep(l, 2, s.params).params.t, Math.PI);
});

test('Ссылки конспекта ведут к существующим сценам и смысловым шагам', () => {
  const map = JSON.parse(readFileSync('../web-scenes.json', 'utf8')) as {
    site: string;
    tickets: Record<string, { lesson: string; step: number; url: string }[]>;
  };
  expect(map.site).toBe('https://math.devpins.org/s2/');
  for (const [id, links] of Object.entries(map.tickets)) {
    expect(id in metadata.tickets).toBe(true);
    for (const link of links) {
      const lesson = lessons.find((l) => l.id === link.lesson)!;
      expect(lesson.tickets).toContain(id);
      expect(link.step).toBe(lesson.entrySteps?.[id] ?? 0);
      const url = new URL(link.url);
      expect(url.origin + url.pathname).toBe(map.site);
      const state = decodeState(url.hash, lessons);
      expect(state.id).toBe(lesson.id);
      expect(state.step).toBe(link.step);
    }
  }
});
