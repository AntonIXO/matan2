import { lessons } from './lessons';
import type { SceneState } from './state';
import { atStep, changeParam, parameterValue, seekState } from './state';
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown | Promise<unknown>;
};
type ModelContext = {
  registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void>;
};
type Controller = {
  read: () => SceneState;
  write: (state: SceneState, resetCamera?: boolean) => void;
};
const empty = { type: 'object', properties: {}, additionalProperties: false };
const object = (input: unknown): Record<string, unknown> => {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Ожидается объект');
  return input as Record<string, unknown>;
};
const nextPaint = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
export function registerSceneTools(
  controller: Controller,
  context = (document as Document & { modelContext?: ModelContext }).modelContext,
) {
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const report = () => {
    const state = controller.read(),
      lesson = lessons.find((l) => l.id === state.id)!;
    return {
      ...state,
      title: lesson.title,
      stepTitle: lesson.steps[state.step].title,
      formula: lesson.steps[state.step].formula,
    };
  };
  const tools: Tool[] = [
    {
      name: 'read_matan_catalog',
      title: 'Каталог математических сцен',
      description: 'Прочитать доступные уроки, их билеты и количество шагов.',
      inputSchema: empty,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () =>
        lessons.map((l) => ({
          id: l.id,
          title: l.title,
          tickets: l.tickets,
          steps: l.steps.length,
        })),
    },
    {
      name: 'read_matan_scene',
      title: 'Текущее состояние сцены',
      description: 'Прочитать выбранный шаг, формулу и математические параметры.',
      inputSchema: empty,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: report,
    },
    {
      name: 'open_matan_scene',
      title: 'Открыть математическую сцену',
      description: 'Открыть урок и смысловой шаг на паузе. Нумерация шагов с нуля.',
      inputSchema: {
        type: 'object',
        properties: {
          lessonId: { type: 'string', enum: lessons.map((l) => l.id) },
          step: { type: 'integer', minimum: 0 },
        },
        required: ['lessonId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const data = object(input),
          lesson = lessons.find((l) => l.id === data.lessonId),
          step = data.step ?? 0;
        if (
          !lesson ||
          typeof step !== 'number' ||
          !Number.isInteger(step) ||
          step < 0 ||
          step >= lesson.steps.length
        )
          throw new Error('Неизвестная сцена или неверный шаг');
        controller.write(atStep(lesson, step), true);
        await nextPaint();
        return report();
      },
    },
    {
      name: 'configure_matan_scene',
      title: 'Изменить параметры сцены',
      description:
        'Изменить сразу несколько параметров текущего урока или ход шага; остановить воспроизведение. Все значения проверяются до изменения.',
      inputSchema: {
        type: 'object',
        properties: {
          params: { type: 'object', additionalProperties: { type: 'number' } },
          progress: { type: 'number', minimum: 0, maximum: 1 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const data = object(input),
          current = controller.read(),
          lesson = lessons.find((l) => l.id === current.id)!;
        let next = current;
        if (data.progress !== undefined) {
          if (
            typeof data.progress !== 'number' ||
            !Number.isFinite(data.progress) ||
            data.progress < 0 ||
            data.progress > 1
          )
            throw new Error('Ход шага должен быть от 0 до 1');
          next = seekState(next, lesson, data.progress);
        }
        if (data.params !== undefined)
          for (const [key, value] of Object.entries(object(data.params))) {
            if (
              !lesson.parameters.some((p) => p.key === key) ||
              typeof value !== 'number' ||
              !Number.isFinite(value) ||
              Math.abs(parameterValue(lesson, key, value, next.step) - value) > 1e-9
            )
              throw new Error('Неверное значение параметра ' + key);
            if (lesson.steps[next.step].locked?.includes(key) && value !== next.params[key])
              throw new Error('Параметр зафиксирован на этом шаге: ' + key);
            next = changeParam(next, lesson, key, value);
          }
        controller.write(next);
        await nextPaint();
        return report();
      },
    },
  ];
  for (const tool of tools)
    try {
      Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch((error) =>
        console.warn('WebMCP registration failed', error),
      );
    } catch (error) {
      console.warn('WebMCP registration failed', error);
    }
  return () => lifecycle.abort();
}
