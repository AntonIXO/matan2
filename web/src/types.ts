export type Params = Record<string, number>;
export type Parameter = {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
};
export type Step = {
  title: string;
  text: string;
  formula: string;
  focus?: string;
  pose?: Params;
  motion?: { key: string; from: number; to: number; log?: boolean };
  duration?: number;
  locked?: string[];
  limits?: Record<string, { min?: number; max?: number; step?: number }>;
};
export type Lesson = {
  id: string;
  title: string;
  subtitle: string;
  group: string;
  dimension: '2D' | '3D';
  tickets: string[];
  scene: string;
  conditions: string;
  insight: string;
  parameters: Parameter[];
  steps: Step[];
  presets?: { name: string; values: Params }[];
  note?: string;
  blender?: string;
  entrySteps?: Record<string, number>;
  sources?: { label: string; url: string }[];
};
export type SceneProps = {
  lesson: Lesson;
  params: Params;
  step: number;
  focus: string;
  onParam: (key: string, value: number) => void;
  cameraKey: number;
};
