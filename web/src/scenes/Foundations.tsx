import type { SceneProps } from '../types';
import { Board, Curve, Dot, Seg, Fill, Label, Metrics, C } from './Plane';
import { linspace, type V2 } from '../math';
import { cauchySine, chebyshevDiscrete, tailBounds, tailValue } from '../foundations-models';

const graph = (f: (x: number) => number, a: number, b: number, n = 120): V2[] =>
  linspace(a, b, n).map((x) => [x, f(x)]);
const metric = (label: string, value: number | string, color?: string) => ({ label, value, color });
const rectangle = (a: number, b: number, low: number, high: number): V2[] => [
  [a, low],
  [b, low],
  [b, high],
  [a, high],
];

function Lhopital({ params: p, step, cameraKey }: SceneProps) {
  const x = p.x,
    y = x * p.q,
    { slope, xi, correction } = cauchySine(x, y);
  if (step === 2)
    return (
      <>
        <Board stretch x={[0, 52]} y={[-0.15, 2.3]} reset={cameraKey}>
          <Seg a={[0, 1]} b={[52, 1]} color={C.white} dashed />
          <Curve points={graph((t) => 1 + Math.sin(t) / t, 1, 50, 500)} color={C.cyan} width={3} />
          <Curve points={graph((t) => 1 + Math.cos(t), 1, 50, 500)} color={C.gold} />
          <Seg a={[p.X, 0]} b={[p.X, 2]} color={C.muted} dashed />
          <Dot p={[p.X, 1 + Math.sin(p.X) / p.X]} color={C.cyan} />
          <Dot p={[p.X, 1 + Math.cos(p.X)]} color={C.gold} />
        </Board>
        <Metrics
          items={[
            metric('f/g', 1 + Math.sin(p.X) / p.X, C.cyan),
            metric('f′/g′', 1 + Math.cos(p.X), C.gold),
            metric('|f/g−1| ≤', 1 / p.X),
          ]}
        />
        <div className="board-hint">Голубая f/g · золотая f′/g′</div>
      </>
    );
  if (step === 3)
    return (
      <>
        <Board stretch x={[0, 32]} y={[0.85, 2.7]} reset={cameraKey}>
          <Seg a={[0, 1]} b={[32, 1]} color={C.white} dashed />
          {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
            <g key={n}>
              <Dot p={[n, 1 + 1 / n]} color={n < p.n ? C.muted : C.cyan} />
              <Dot p={[n, 1 + 1 / n + 1 / (n + 1)]} color={n < p.n ? C.muted : C.gold} />
            </g>
          ))}
          <Fill
            points={rectangle(p.n, 31, 1, 1 + 1 / p.n + 1 / (p.n + 1))}
            color={C.gold}
            opacity={0.08}
          />
          <Seg a={[p.n, 0.9]} b={[p.n, 2.6]} color={C.white} />
        </Board>
        <Metrics
          items={[
            metric('xₙ/yₙ', 1 + 1 / p.n, C.cyan),
            metric('Δxₙ/Δyₙ', 1 + 1 / p.n + 1 / (p.n + 1), C.gold),
            metric('Σₖ≥ₙ Δyₖ = yₙ', 1 / p.n),
          ]}
        />
        <div className="board-hint">Голубая xₙ/yₙ · золотая Δxₙ/Δyₙ</div>
      </>
    );
  return (
    <>
      <Board stretch x={[-0.12, 1.7]} y={[-0.15, 1.45]} reset={cameraKey}>
        <Curve points={graph(Math.sin, 0, 1.55)} color={C.cyan} width={3} />
        <Seg a={[0, 0]} b={[x, Math.sin(x)]} color={C.gold} />
        <Dot p={[x, Math.sin(x)]} label="(g(x), f(x))" color={C.gold} attach="nw" />
        {step === 0 ? (
          <>
            <Curve
              points={graph(
                (t) => Math.sin(x) + Math.cos(x) * (t - x),
                Math.max(0, x - 0.5),
                Math.min(1.55, x + 0.5),
              )}
              color={C.purple}
            />
            <Seg a={[0, 0]} b={[1.3, 1.3]} color={C.muted} dashed />
          </>
        ) : (
          <>
            <Seg a={[y, Math.sin(y)]} b={[x, Math.sin(x)]} color={C.purple} />
            <Dot p={[y, Math.sin(y)]} label="(g(y), f(y))" color={C.purple} attach="se" />
            <Curve
              points={graph(
                (t) => Math.sin(xi) + slope * (t - xi),
                Math.max(0, xi - 0.38),
                xi + 0.38,
              )}
              color={C.white}
              dashed
            />
            <Dot p={[xi, Math.sin(xi)]} label="ξ" color={C.white} />
          </>
        )}
        <Label p={[1, 0.12]}>γ(t) = (t, sin t)</Label>
      </Board>
      <Metrics
        items={
          step === 0
            ? [
                metric('f(x)/g(x)', Math.sin(x) / x, C.gold),
                metric('f′(x)/g′(x)', Math.cos(x), C.purple),
                metric('x', x),
              ]
            : [
                metric('sin y / x', correction, C.purple),
                metric('y/x', p.q),
                metric('cos ξ', slope),
                metric('сумма', correction + slope * (1 - p.q), C.gold),
              ]
        }
      />
    </>
  );
}

function TailLimits({ params: p, step, cameraKey }: SceneProps) {
  const n = Math.round(p.n),
    a = p.a,
    bounds = tailBounds(n, a);
  const indices = Array.from({ length: 48 }, (_, i) => i + 1);
  const technicalN = Math.floor(1 / p.eps);
  const firstEven = technicalN + 1 + ((technicalN + 1) % 2);
  return (
    <>
      <Board stretch x={[0, 50]} y={[-2.25, 2.2]} reset={cameraKey}>
        {step === 4 ? (
          <>
            <Seg a={[0, 1]} b={[49, 1]} color={C.gold} dashed />
            <Seg a={[0, 0]} b={[49, 0]} color={C.white} />
            {indices.map((k) => (
              <g key={k}>
                <Dot p={[k, k % 2 === 0 ? 1 : -1]} color={k < n ? C.muted : C.cyan} />
                <Dot p={[k, k % 2 === 0 ? -1 : 1]} color={k < n ? C.muted : C.purple} />
                <Dot p={[k, 0]} color={k < n ? C.muted : C.white} />
              </g>
            ))}
            <Seg a={[n, -1.8]} b={[n, 1.8]} color={C.gold} />
          </>
        ) : (
          <>
            <Fill points={rectangle(n, 49, bounds.lower, bounds.upper)} opacity={0.065} />
            <Seg a={[n, bounds.upper]} b={[49, bounds.upper]} color={C.gold} />
            <Seg a={[n, bounds.lower]} b={[49, bounds.lower]} color={C.purple} />
            <Seg a={[0, a]} b={[49, a]} color={C.gold} dashed />
            <Seg a={[0, -a]} b={[49, -a]} color={C.purple} dashed />
            {step === 2 && (
              <>
                <Fill
                  points={rectangle(technicalN + 1, 49, a - p.eps, a + p.eps)}
                  color={C.gold}
                  opacity={0.12}
                />
                <Seg a={[technicalN, -2]} b={[technicalN, 2]} color={C.white} dashed />
                <Label p={[technicalN + 3, 1.95]} color={C.white}>
                  N(ε)
                </Label>
                <Dot
                  p={[firstEven, tailValue(firstEven, a)]}
                  color={C.white}
                  label="чётный k > N"
                />
              </>
            )}
            {indices.map((k) => (
              <Dot
                key={k}
                p={[k, tailValue(k, a)]}
                color={k < n && step !== 2 ? C.muted : k % 2 === 0 ? C.gold : C.purple}
              />
            ))}
            <Seg a={[n, -2.15]} b={[n, 1.75]} color={C.cyan} dashed />
          </>
        )}
      </Board>
      <Metrics
        items={
          step === 4
            ? [
                metric('limsup xₙ', 1, C.cyan),
                metric('limsup tₙ', 1, C.purple),
                metric('limsup(xₙ+tₙ)', 0, C.white),
              ]
            : step === 2
              ? [
                  metric('ε', p.eps),
                  metric('N(ε)', technicalN),
                  metric('A−ε', a - p.eps),
                  metric('A+ε', a + p.eps),
                ]
              : [
                  metric('yₙ = sup хвоста', bounds.upper, C.gold),
                  metric('zₙ = inf хвоста', bounds.lower, C.purple),
                  metric('limsup − liminf', 2 * a),
                ]
        }
      />
      <div className="board-hint">
        {step === 4
          ? 'Голубая xₙ · фиолетовая tₙ · белая сумма'
          : 'Пунктир ±A — пределы · хвост бесконечен'}
      </div>
    </>
  );
}

function Piecewise({ params: p, step, cameraKey }: SceneProps) {
  const bad = step === 4,
    integral = bad ? 0 : Math.abs(p.x) - 1.5;
  const left = (x: number) => (bad ? 0 : -x);
  const right = (x: number) => (bad ? p.j : x + p.c);
  return (
    <>
      <div className="dual-boards">
        <div>
          <div className="pane-title">f · высота со знаком</div>
          <Board stretch x={[-1.8, 1.8]} y={[-2.35, 2.4]} reset={cameraKey}>
            {step === 2 && (
              <>
                <Fill
                  points={rectangle(-1.5, Math.min(p.x, 0), -1, 0)}
                  color={C.red}
                  opacity={0.3}
                />
                {p.x > 0 && <Fill points={rectangle(0, p.x, 0, 1)} color={C.cyan} opacity={0.3} />}
              </>
            )}
            <Seg a={[-1.5, bad ? 0 : -1]} b={[-0.012, bad ? 0 : -1]} color={C.cyan} />
            <Seg a={[0.012, bad ? 0 : 1]} b={[1.5, bad ? 0 : 1]} color={C.cyan} />
            <Dot p={[0, bad ? 0 : p.v]} color={C.gold} label="f(0)" />
            {(step === 0 || step === 2) && (
              <>
                <Seg a={[p.x, -2]} b={[p.x, 2]} color={C.muted} dashed />
                <Dot p={[p.x, p.x < 0 ? -1 : p.x > 0 ? 1 : p.v]} color={C.white} />
              </>
            )}
          </Board>
        </div>
        <div>
          <div className="pane-title">
            {bad ? 'Кандидат F · разрыв недопустим' : 'F · склейка первообразных'}
          </div>
          <Board stretch x={[-1.8, 1.8]} y={[-0.4, 3]} reset={cameraKey}>
            <Curve points={graph(left, -1.5, 0)} color={C.purple} width={3} />
            <Curve points={graph(right, 0.003, 1.5)} color={C.gold} width={3} />
            <Dot p={[0, left(0)]} color={C.purple} />
            <Dot p={[0, right(0)]} color={C.gold} />
            {right(0) !== left(0) && (
              <Seg a={[0, left(0)]} b={[0, right(0)]} color={C.red} dashed />
            )}
            {(step === 0 || step === 2) && (
              <>
                <Dot p={[p.x, p.x < 0 ? left(p.x) : right(p.x)]} color={C.white} label="F(b)" />
                {step === 2 && (
                  <>
                    <Seg a={[-1.5, 1.5]} b={[1.5, 1.5]} color={C.muted} dashed />
                    <Seg a={[p.x, 1.5]} b={[p.x, Math.abs(p.x)]} color={C.cyan} />
                  </>
                )}
              </>
            )}
            <Label p={[0, 2.65]} color={bad || p.c > 0 ? C.red : C.cyan}>
              {bad
                ? p.j === 0
                  ? 'J = 0: непрерывна'
                  : 'J ≠ 0: не почти первообразная'
                : p.c === 0
                  ? 'непрерывна · c = 0'
                  : 'пока разрыв · c ≠ 0'}
            </Label>
          </Board>
        </div>
      </div>
      <Metrics
        items={
          bad
            ? [
                metric('∫ f', 0, C.cyan),
                metric('F(b)−F(a)', p.j, C.red),
                metric('ложный добавочный вклад', p.j),
              ]
            : step === 1
              ? [
                  metric('F(0−)', 0, C.purple),
                  metric('F(0+)', p.c, C.gold),
                  metric('разрыв', p.c, C.red),
                ]
              : [
                  metric(step === 3 ? '∫₋₁.₅¹.⁵ f' : '∫₋₁.₅ᵇ f', step === 3 ? 0 : integral, C.cyan),
                  metric('f(0)', p.v, C.gold),
                  metric('F(0)', 0, C.purple),
                ]
        }
      />
    </>
  );
}

function Chebyshev({ params: p, step, cameraKey }: SceneProps) {
  const n = Math.round(p.n),
    s = p.s,
    fixedX = 0.25,
    grid = step === 2 ? n : 12;
  const discrete = chebyshevDiscrete(n, s);
  const f = (x: number) => (step === 2 ? Math.min(n, Math.floor(x * n) + 1) / n : x);
  const values: V2[] =
    step === 2
      ? Array.from(
          { length: n },
          (_, i) =>
            [
              [i / n, (i + 1) / n],
              [(i + 1) / n, (i + 1) / n],
            ] as V2[],
        ).flat()
      : [
          [0, 0],
          [1, 1],
        ];
  const partial = s * (p.cut / 3 - p.cut ** 2 / 2 + p.cut ** 3 / 3);
  return (
    <>
      <div className="dual-boards">
        <div>
          <div className="pane-title">{step === 2 ? 'Ступени aᵢ и bᵢ' : 'f(t)=t · g(t)=st'}</div>
          <Board stretch x={[-0.12, 1.12]} y={[-1.2, 1.3]} reset={cameraKey}>
            <Curve points={values} color={C.cyan} width={4} />
            <Curve points={values.map(([x, y]) => [x, s * y])} color={C.gold} dashed />
            {(step === 0 || step === 3) && (
              <>
                <Seg a={[fixedX, f(fixedX)]} b={[fixedX, f(p.y)]} color={C.cyan} />
                <Seg a={[p.y, s * f(fixedX)]} b={[p.y, s * f(p.y)]} color={C.gold} />
                <Dot p={[fixedX, f(fixedX)]} color={C.cyan} label="x=¼" attach="nw" />
                <Dot p={[p.y, s * f(p.y)]} color={C.gold} label="y" />
              </>
            )}
          </Board>
        </div>
        <div>
          <div className="pane-title">Пары (x,y) · знак произведения разностей</div>
          <Board stretch x={[-0.12, 1.12]} y={[-0.12, 1.2]} reset={cameraKey}>
            {Array.from({ length: grid * grid }, (_, i) => {
              const col = i % grid,
                row = Math.floor(i / grid),
                a = col / grid,
                b = row / grid;
              const value = s * ((col - row) / grid) ** 2;
              const included = step !== 1 || b < p.cut;
              return (
                <Fill
                  key={i}
                  points={rectangle(a, a + 1 / grid, b, b + 1 / grid)}
                  color={value >= 0 ? C.cyan : C.red}
                  opacity={included ? 0.06 + 0.65 * Math.abs(value) : 0.015}
                />
              );
            })}
            <Seg a={[0, 0]} b={[1, 1]} color={C.white} dashed />
            {step === 1 ? (
              <Seg a={[0, p.cut]} b={[1, p.cut]} color={C.gold} />
            ) : (
              step !== 2 && <Dot p={[fixedX, p.y]} color={C.gold} />
            )}
            <Label p={[0.55, 1.12]} color={s < 0 ? C.red : C.cyan}>
              {s === 0 ? 'все вклады = 0' : s < 0 ? 'вклады ≤ 0' : 'вклады ≥ 0'}
            </Label>
          </Board>
        </div>
      </div>
      <Metrics
        items={
          step === 0
            ? [
                metric('f(x)−f(y)', fixedX - p.y, C.cyan),
                metric('g(x)−g(y)', s * (fixedX - p.y), C.gold),
                metric('произведение', s * (fixedX - p.y) ** 2),
              ]
            : step === 1
              ? [
                  metric('∫₀ᶜ∫₀¹ вклад dx dy', partial, C.gold),
                  metric('полный квадрат', s / 6),
                  metric('2[E(fg)−E(f)E(g)]', s / 6),
                ]
              : step === 2
                ? [
                    metric('среднее aᵢbᵢ', discrete.fg, C.cyan),
                    metric('среднее aᵢ × среднее bᵢ', discrete.f * discrete.g, C.gold),
                    metric('разность', discrete.covariance),
                  ]
                : [
                    metric('E(fg)', s / 3, C.cyan),
                    metric('E(f)E(g)', s / 4, C.gold),
                    metric('разность = s/12', s / 12, s < 0 ? C.red : C.white),
                  ]
        }
      />
    </>
  );
}

export default function Foundations(props: SceneProps) {
  switch (props.lesson.scene) {
    case 'lhopital-stolz':
      return <Lhopital {...props} />;
    case 'tail-limits':
      return <TailLimits {...props} />;
    case 'piecewise-primitive':
      return <Piecewise {...props} />;
    case 'chebyshev':
      return <Chebyshev {...props} />;
    default:
      return null;
  }
}
