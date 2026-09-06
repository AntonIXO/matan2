import type { Lesson } from './types';
import { catalog } from './content/catalog';
import { geometry } from './content/geometry';
import { differential } from './content/differential';
export const lessons: Lesson[] = [
  {
    id: 'differentiability',
    title: 'Одна плоскость для всех направлений',
    subtitle: 'Дифференцируемость и малый остаток',
    group: 'Дифференцирование',
    dimension: '3D',
    scene: 'differentiability',
    tickets: ['op-b3-09', 'op-b3-10', 'op-b3-11', 'op-b3-07', 'op-b3-08'],
    conditions:
      'Точка a внутренняя. Линейное приближение должно работать при h → 0 по всем направлениям.',
    insight: 'При увеличении окрестности исчезает ошибка относительно шага.',
    parameters: [
      {
        key: 'radius',
        label: 'Размер окрестности',
        min: 0.04,
        max: 0.65,
        step: 0.005,
        value: 0.65,
      },
      { key: 'angle', label: 'Направление h', min: 0, max: 2 * Math.PI, step: 0.01, value: 0.56 },
    ],
    blender: '01a_local_model.png',
    steps: [
      {
        title: 'Поверхность и точка',
        text: 'Зафиксируем a = (½, ¼) на графике. h — приращение аргумента, а не высоты.',
        formula: 'f(x,y)=x^2+2y^2,\\quad a=(1/2,1/4)',
        pose: { radius: 0.65 },
        motion: { key: 'angle', from: 0, to: 2 * Math.PI },
      },
      {
        title: 'Линейная часть',
        text: 'Частные наклоны в a равны 1. Они задают одну плоскость для всех направлений h.',
        formula: 'df_a(h)=h_1+h_2',
        focus: 'linear',
        motion: { key: 'angle', from: 0, to: 2 * Math.PI },
      },
      {
        title: 'Увеличиваем окрестность',
        text: 'Все три оси увеличиваются одинаково. Поверхность приближается к плоскости, хотя масштаб изображения остаётся большим.',
        formula: 'f(a+h)-f(a)=df_a(h)+r(h)',
        focus: 'error',
        pose: { radius: 0.65 },
        motion: { key: 'radius', from: 0.65, to: 0.04, log: true },
      },
      {
        title: 'Остаток относительно шага',
        text: 'Красный отрезок — точная высота минус линейное приближение. Оценка справа относится ко всем направлениям.',
        formula: '0\\le\\frac{r(h)}{\\|h\\|}=\\frac{h_1^2+2h_2^2}{\\|h\\|}\\le2\\|h\\|\\to0',
        focus: 'error',
        pose: { radius: 0.04 },
        motion: { key: 'angle', from: 0, to: 2 * Math.PI },
      },
    ],
  },
  ...differential,
  ...geometry,
  ...catalog,
];

const entries: Record<string, Record<string, number>> = {
  integral: {
    'op-b1-05': 0,
    'op-b1-06': 0,
    'op-b1-07': 1,
    'op-b1-08': 5,
    'th-b1-04': 2,
    'th-b1-05': 3,
    'th-b1-06': 4,
    'th-b1-16': 5,
    'th-b1-18': 5,
  },
  convexity: {
    'op-b1-13': 0,
    'op-b1-16': 3,
    'th-b1-21': 1,
    'th-b1-22': 2,
    'th-b1-24': 3,
    'th-b1-25': 4,
  },
  'convex-set': { 'op-b1-14': 0, 'op-b1-15': 2 },
  'path-length': { 'op-b1-11': 0, 'th-b1-20': 4 },
  'polar-length': { 'op-b1-12': 0 },
  topology: { 'op-b3-01': 0, 'op-b3-02': 1, 'op-b3-03': 3, 'op-b3-04': 4 },
  jacobian: {
    'op-b3-06': 0,
    'op-b3-10': 1,
    'op-b3-11': 1,
    'th-b3-01': 3,
    'th-b3-02': 4,
    'th-b3-03': 1,
  },
  differentiability: { 'op-b3-07': 3, 'op-b3-08': 3, 'op-b3-09': 0 },
  quadrature: { 'op-b1-17': 0, 'th-b1-28': 1, 'th-b1-29': 2 },
  'euler-maclaurin': { 'th-b1-30': 0, 'th-b1-15': 3 },
  extrema: { 'th-b1-10': 1, 'th-b1-11': 0, 'th-b1-13': 3 },
  norms: { 'th-b1-34': 2, 'th-b1-35': 3, 'th-b1-36': 1 },
};
for (const lesson of lessons) lesson.entrySteps = entries[lesson.id];

export function ticketOrder(id: string) {
  const match = /^(op|th)-b(\d+)-(\d+)$/.exec(id);
  if (!match) throw new Error('Unknown ticket label: ' + id);
  return Number(match[2]) * 10_000 + (match[1] === 'op' ? 1 : 2) * 1000 + Number(match[3]);
}

// The first reference is the scene's main ticket; the rest are related material.
lessons.sort((a, b) => ticketOrder(a.tickets[0]) - ticketOrder(b.tickets[0]));
