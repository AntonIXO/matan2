import type { ReactNode } from 'react';
import { Circle, MovablePoint } from 'mafs';
import type { SceneProps } from '../types';
import { Board, Curve, Dot, Seg, Fill, Label, Arrow, Metrics, sample, C } from './Plane';
import { fmt, linspace, integrate, trapezoidKernel, type V2 } from '../math';
import {
  elementary,
  primitive,
  elementaryExtrema,
  convex,
  jumpFunction,
  jensenWeights,
  quadrature,
  wallisIntegral,
  wallisBounds,
  gaussianBounds,
  gammaDensity,
  gammaTruncated,
  graphSample,
} from '../models';
export function Area({
  f,
  a,
  b,
  color = C.cyan,
  opacity = 0.2,
}: {
  f: (x: number) => number;
  a: number;
  b: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <Fill points={[[a, 0], ...graphSample(f, a, b), [b, 0]]} color={color} opacity={opacity} />
  );
}
const m = (label: string, value: number | string, color?: string) => ({ label, value, color });
function Integral({ params: p, step, cameraKey }: SceneProps) {
  const a = -1,
    b = p.b,
    c = a + (b - a) * p.c,
    f = (x: number) => elementary(p.fn, x),
    exact = (a: number, b: number) => primitive(p.fn, b) - primitive(p.fn, a),
    ext = elementaryExtrema(p.fn, a, b),
    start = b,
    end = b + p.h;
  const names = ['x', 'x²', 'sin x'];
  return (
    <>
      <Board stretch x={[-1.4, 2.5]} y={[-1.4, 5.8]} reset={cameraKey}>
        <Area f={(x) => Math.max(0, f(x))} a={a} b={b} />
        <Area f={(x) => Math.min(0, f(x))} a={a} b={b} color={C.red} />
        {step === 1 && (
          <>
            <Area f={f} a={c} b={b} color={C.purple} />
            <Seg a={[c, -1]} b={[c, 4]} color={C.gold} />
            <Label p={[c, -1.2]}>c</Label>
          </>
        )}
        {step === 2 &&
          ext.map((v, i) => (
            <g key={i}>
              <Fill
                points={[
                  [a, 0],
                  [a, v],
                  [b, v],
                  [b, 0],
                ]}
                color={i ? C.gold : C.purple}
                opacity={0.07}
              />
              <Seg a={[a, v]} b={[b, v]} color={i ? C.gold : C.purple} dashed />
            </g>
          ))}
        {step === 2 && (
          <Seg a={[a, exact(a, b) / (b - a)]} b={[b, exact(a, b) / (b - a)]} color={C.white} />
        )}
        {(step === 3 || step === 5) && (
          <>
            <Area f={f} a={start} b={end} color={C.gold} opacity={0.6} />
            <Seg a={[start, -0.5]} b={[start, 4]} color={C.gold} dashed />
            <Seg a={[end, -0.5]} b={[end, 4]} color={C.gold} dashed />
          </>
        )}
        <Curve points={graphSample(f, -1, 2.3)} width={3} semantic="graph" />
        <Dot p={[b, f(b)]} label="f(b)" />
        <Seg a={[b, 0]} b={[b, f(b)]} color={C.white} semantic="area" />
        <Label p={[0.5, 5.4]} color={C.white}>
          f(x) = {names[p.fn]} · a = −1
        </Label>
      </Board>
      <Metrics
        items={
          step === 1
            ? [
                m('Φ([a,c])', exact(a, c)),
                m('Φ([c,b])', exact(c, b), C.purple),
                m('сумма', exact(a, b)),
              ]
            : step === 3 || step === 5
              ? [m('Φ(Δ) / |Δ|', exact(start, end) / p.h, C.gold), m('f(b)', f(b)), m('|Δ|', p.h)]
              : [m('∫ₐᵇ f', exact(a, b)), m('m', ext[0], C.purple), m('M', ext[1], C.gold)]
        }
      />
    </>
  );
}
function Substitution({ params: p, step }: SceneProps) {
  const b = p.b,
    t = Math.max(0, b - p.h),
    q = (x: number) => (step < 2 ? x : x * x),
    trans = (x: number) => (step < 2 ? 2 * x ** 3 : 2 * x * x);
  return (
    <>
      <div className="dual-boards">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="pane-title">
              {step < 2
                ? i
                  ? 't · плотность f(φ(t))φ′(t)'
                  : 'x · плотность f(x)'
                : i
                  ? 'uv′ = 2t²'
                  : 'u′v = t²'}
            </div>
            <Board stretch x={[-0.12, 1.15]} y={[-0.25, 2.2]}>
              <Curve points={graphSample(i ? trans : q, 0, 1)} color={i ? C.gold : C.cyan} />
              <Area
                f={i ? trans : q}
                a={0}
                b={step < 2 && !i ? b * b : b}
                color={i ? C.gold : C.cyan}
              />
              {step < 2 && (
                <>
                  <Dot p={i ? [b, trans(b)] : [b * b, q(b * b)]} label={i ? 'β' : 'φ(β)'} />
                  <Area
                    f={i ? trans : q}
                    a={i ? t : t * t}
                    b={i ? b : b * b}
                    color={C.purple}
                    opacity={0.5}
                  />
                </>
              )}
              {step >= 2 && (
                <Curve points={graphSample((x) => 3 * x * x, 0, 1)} color={C.purple} dashed />
              )}
            </Board>
          </div>
        ))}
      </div>
      <Metrics
        items={
          step < 2
            ? [m('∫ x dx', b ** 4 / 2), m('∫ 2t³ dt', b ** 4 / 2, C.gold), m('Δx', b * b - t * t)]
            : [
                m('∫ u′v', b ** 3 / 3),
                m('∫ uv′', (2 * b ** 3) / 3, C.gold),
                m('[uv]₀ᵝ', b ** 3, C.purple),
              ]
        }
      />
    </>
  );
}
function Convexity({ params: p, step, cameraKey }: SceneProps) {
  const f = (x: number) => convex(p.fn, x),
    x = p.fn === 1 && step === 3 ? 0 : p.x,
    a = -1.2,
    b = 1.2,
    pt: V2 = [x, f(x)],
    slope = p.fn === 0 ? 2 * x : x === 0 ? p.slope : Math.sign(x),
    line = (z: number) => f(x) + slope * (z - x);
  const left = (f(x) - f(a)) / (x - a),
    right = (f(b) - f(x)) / (b - x);
  return (
    <>
      <Board stretch x={[-1.6, 1.6]} y={[-1.2, 2.4]} reset={cameraKey}>
        <Curve points={graphSample(f, -1.4, 1.4)} width={3} />
        {step < 2 && (
          <>
            <Seg a={[a, f(a)]} b={[b, f(b)]} color={C.gold} semantic="chord" />
            <Seg a={[a, f(a)]} b={pt} color={C.cyan} />
            <Seg a={pt} b={[b, f(b)]} color={C.purple} />
            <Seg a={pt} b={[x, (f(a) * (b - x) + f(b) * (x - a)) / (b - a)]} color={C.red} dashed />
            <Dot p={[a, f(a)]} label="x₁" />
            <Dot p={[b, f(b)]} label="x₃" />
          </>
        )}
        {step === 2 && (
          <>
            <Seg a={[x - p.h, f(x - p.h)]} b={pt} color={C.cyan} />
            <Seg a={pt} b={[x + p.h, f(x + p.h)]} color={C.purple} />
            <Dot p={[x - p.h, f(x - p.h)]} color={C.cyan} />
            <Dot p={[x + p.h, f(x + p.h)]} color={C.purple} />
          </>
        )}
        {step >= 3 && (
          <Curve points={graphSample(line, -1.4, 1.4)} color={C.gold} semantic="support" />
        )}
        <Dot p={pt} label={step < 2 ? 'x₂' : 'x₀'} color={C.white} />
        <Label p={[0, 2.13]} color={C.white}>
          f(x) = {p.fn === 0 ? 'x²' : '|x|'}
        </Label>
      </Board>
      <Metrics
        items={
          step < 2
            ? [
                m('наклон 12', left),
                m('наклон 13', (f(b) - f(a)) / (b - a), C.gold),
                m('наклон 23', right, C.purple),
              ]
            : step === 2
              ? [
                  m('левая хорда', (f(x) - f(x - p.h)) / p.h),
                  m('правая хорда', (f(x + p.h) - f(x)) / p.h, C.purple),
                ]
              : [
                  m('наклон опоры', slope, C.gold),
                  m('f′₋', p.fn === 1 && x === 0 ? -1 : slope),
                  m('f′₊', p.fn === 1 && x === 0 ? 1 : slope),
                ]
        }
      />
    </>
  );
}
function Jumps({ params: p, step, cameraKey }: SceneProps) {
  const k = p.k,
    x = k - 1,
    lower = -0.75 + 0.5 * k,
    upper = lower + 0.5;
  return (
    <>
      <Board stretch x={[-1.8, 1.8]} y={[-1.2, 1.8]} reset={cameraKey}>
        <Curve points={graphSample(jumpFunction, -1.6, 1.6)} width={3} />
        {[-1, 0, 1].map((x, i) => (
          <Dot
            key={x}
            p={[x, jumpFunction(x)]}
            label={'x' + (i + 1)}
            color={i === k ? C.gold : C.muted}
          />
        ))}
        <Curve
          points={graphSample((z) => jumpFunction(x) + lower * (z - x), x - 0.65, x)}
          color={C.gold}
        />
        <Curve
          points={graphSample((z) => jumpFunction(x) + upper * (z - x), x, x + 0.65)}
          color={C.purple}
        />
        {step >= 1 && (
          <>
            <Seg a={[-1.1, -0.65]} b={[1.1, -0.65]} color={C.muted} />
            {[0, 1, 2].map((i) => {
              const a = -0.75 + 0.5 * i,
                b = a + 0.5;
              return (
                <g key={i}>
                  <Curve
                    points={[
                      [a, -0.65],
                      [b, -0.65],
                    ]}
                    color={i === k ? C.gold : C.cyan}
                    width={6}
                  />
                  <Circle
                    center={[a, -0.65]}
                    radius={0.025}
                    color={C.white}
                    fillOpacity={1}
                    svgEllipseProps={{ style: { fill: '#0d1520' } }}
                  />
                  <Circle
                    center={[b, -0.65]}
                    radius={0.025}
                    color={C.white}
                    fillOpacity={1}
                    svgEllipseProps={{ style: { fill: '#0d1520' } }}
                  />
                  {step === 2 && (
                    <Dot p={[(a + b) / 2, -0.65]} label={['−½', '0', '½'][i]} color={C.purple} />
                  )}
                </g>
              );
            })}
            <Label p={[0, -1]}>Открытые промежутки на оси наклонов</Label>
          </>
        )}
      </Board>
      <Metrics
        items={[m('f′₋(x)', lower, C.gold), m('f′₊(x)', upper, C.purple), m('скачок', 0.5)]}
      />
    </>
  );
}
function ConvexSet({ params: p, step, cameraKey }: SceneProps) {
  const a: V2 = step < 2 ? [-0.8, 0] : [-1, 1.2],
    b: V2 = step < 2 ? [0.8, 0] : [1, p.height],
    q: V2 = [a[0] * (1 - p.t) + b[0] * p.t, a[1] * (1 - p.t) + b[1] * p.t];
  return (
    <>
      <Board x={[-1.6, 1.6]} y={[-1.5, 2.7]} axes={step >= 2} reset={cameraKey}>
        {step < 2 ? (
          <>
            <Circle center={[0, 0]} radius={1} color={C.cyan} fillOpacity={0.17} />
            {step === 1 && <Circle center={[0, 0]} radius={0.45} color="#0d1520" fillOpacity={1} />}
          </>
        ) : (
          <>
            <Fill points={[...graphSample((x) => x * x, -1.5, 1.5), [1.5, 2.65], [-1.5, 2.65]]} />
            <Curve points={graphSample((x) => x * x, -1.5, 1.5)} />
            <Label p={[0, 2.3]}>y ≥ x²</Label>
          </>
        )}
        <Seg a={a} b={b} color={C.gold} />
        <Dot p={a} label="A" />
        <Dot p={b} label="B" />
        <Dot p={q} label="(1−t)A+tB" color={step === 1 && Math.abs(q[0]) < 0.45 ? C.red : C.gold} />
      </Board>
      <Metrics
        items={[
          m('t', p.t),
          m('принадлежит E', step === 1 && Math.abs(q[0]) < 0.45 ? 'нет' : 'да'),
        ]}
      />
    </>
  );
}
function Jensen({ params: p, step, cameraKey }: SceneProps) {
  const weights = jensenWeights(p.w, p.third),
    xs = [-1.2, 0.5, 1.3],
    mean = xs.reduce((s, x, i) => s + x * weights[i], 0),
    value = xs.reduce((s, x, i) => s + x * x * weights[i], 0),
    line = (x: number) => mean * mean + 2 * mean * (x - mean);
  return (
    <>
      <Board stretch x={[-1.7, 1.7]} y={[-1, 2.8]} reset={cameraKey}>
        <Curve points={graphSample((x) => x * x, -1.5, 1.5)} width={3} />
        <Fill points={xs.map((x) => [x, x * x])} opacity={0.08} color={C.gold} />
        {xs.map((x, i) => (
          <g key={i}>
            <Circle
              center={[x, x * x]}
              radius={0.04 + 0.08 * Math.sqrt(weights[i])}
              color={C.gold}
              fillOpacity={0.4}
            />
            <Label p={[x, x * x + 0.3]}>
              d{i + 1}={fmt(weights[i], 2)}
            </Label>
          </g>
        ))}
        <Seg a={[mean, mean * mean]} b={[mean, value]} color={C.red} />
        <Dot p={[mean, value]} label="Σdᵢf(xᵢ)" color={C.gold} />
        <Dot p={[mean, mean * mean]} label="f(x*)" color={C.cyan} />
        {step >= 2 && (
          <>
            <Curve points={graphSample(line, -1.5, 1.5)} color={C.purple} />
            {xs.map((x, i) => (
              <Seg key={i} a={[x, line(x)]} b={[x, x * x]} color={C.purple} dashed />
            ))}
          </>
        )}
      </Board>
      <Metrics
        items={[
          m(
            'Σdᵢ',
            weights.reduce((a, b) => a + b),
          ),
          m('x*', mean),
          m('Σdᵢf(xᵢ) − f(x*)', value - mean * mean, C.red),
        ]}
      />
    </>
  );
}
function Extrema({ params: p, step, cameraKey }: SceneProps) {
  const r = p.radius,
    kind = p.fn,
    power = [4, 6, 3][kind] ?? 0,
    sign = kind === 1 ? -1 : 1;
  const f = (X: number) =>
    kind === 3 ? (X === 0 ? 0 : Math.exp((1 - 1 / (X * X)) / (r * r))) : sign * X ** power;
  const X = p.t,
    x = r * X,
    log10 = kind === 3 && x !== 0 ? -1 / (x * x * Math.LN10) : undefined,
    value =
      kind === 3 ? (x === 0 ? '0 (точно)' : '10^(' + fmt(log10!, 2) + ')') : sign * x ** power;
  const slopeSign =
    x === 0 ? '0' : kind === 1 ? (x < 0 ? '+' : '−') : kind === 2 ? '+' : x < 0 ? '−' : '+';
  return (
    <>
      <Board stretch x={[-1.25, 1.25]} y={[-1.3, 1.4]} reset={cameraKey}>
        <Curve points={graphSample(f, -1, 1, 300)} width={3} />
        <Dot p={[0, 0]} label="0" color={C.gold} />
        <Dot p={[X, f(X)]} label="f(x) / s(r)" />
        <Seg a={[X, 0]} b={[X, f(X)]} color={C.red} />
        <Label p={[0, 1.2]}>X=x/r; Y=f(x)/s(r)</Label>
        {step >= 1 && (
          <>
            <Label p={[-0.6, -1.05]} color={C.gold}>
              {kind === 1 ? 'f′ > 0' : kind === 2 ? 'f′ > 0' : 'f′ < 0'}
            </Label>
            <Label p={[0.6, -1.05]} color={C.gold}>
              {kind === 1 ? 'f′ < 0' : 'f′ > 0'}
            </Label>
          </>
        )}
      </Board>
      <Metrics
        items={[
          m('x', x),
          m('f(x)', value),
          m('s(r)', kind === 3 ? 'exp(−1/r²)' : r ** power),
          m('знак f′(x)', slopeSign),
        ]}
      />
      <div className="board-hint">
        Пример: {['x⁴', '−x⁶', 'x³', 'e^(−1/x²), f(0)=0'][kind]} ·{' '}
        {['минимум', 'максимум', 'нет экстремума', 'строгий минимум'][kind]}
      </div>
    </>
  );
}
function Quadrature({ params: p, step, cameraKey }: SceneProps) {
  const n = Math.round(p.n),
    h = 1 / n,
    q = quadrature(n, p.tag),
    kernel = (x: number) => trapezoidKernel(x, 0, h);
  return (
    <>
      <Board
        stretch
        x={[-0.15, 1.2]}
        y={step >= 3 ? [-0.65, 1.25] : [-0.15, 1.25]}
        reset={cameraKey}
      >
        {Array.from({ length: n }, (_, i) => {
          const a = i / n,
            b = (i + 1) / n,
            xi = a + p.tag * h;
          return (
            <g key={i}>
              {step < 2 ? (
                <>
                  <Fill
                    points={[
                      [a, 0],
                      [a, xi * xi],
                      [b, xi * xi],
                      [b, 0],
                    ]}
                    color={C.gold}
                    opacity={0.17}
                  />
                  <Dot p={[xi, xi * xi]} color={C.gold} />
                </>
              ) : (
                <>
                  <Fill
                    points={[
                      [a, 0],
                      [a, a * a],
                      [b, b * b],
                      [b, 0],
                    ]}
                    color={C.gold}
                    opacity={0.16}
                  />
                  <Seg a={[a, a * a]} b={[b, b * b]} color={C.gold} semantic="approx" />
                </>
              )}
              <Seg a={[a, 0]} b={[a, a * a]} color={C.muted} />
            </g>
          );
        })}
        <Curve points={graphSample((x) => x * x, 0, 1)} width={3} />
        {step >= 3 && (
          <>
            <Seg a={[0, -0.3]} b={[1, -0.3]} color={C.muted} />
            {step === 3 ? (
              <Curve points={graphSample((x) => -0.3 + 0.4 * (x - 0.5), 0, 1)} color={C.purple} />
            ) : (
              <>
                {Array.from({ length: n }, (_, i) => (
                  <Curve
                    key={i}
                    points={graphSample(
                      (x) => -0.3 + (0.25 * trapezoidKernel(x, i * h, (i + 1) * h)) / ((h * h) / 8),
                      i * h,
                      (i + 1) * h,
                      30,
                    )}
                    color={C.purple}
                    semantic="kernel"
                  />
                ))}
              </>
            )}
            <Dot
              p={[
                p.t * h,
                step === 3
                  ? -0.3 + 0.4 * (p.t - 0.5)
                  : -0.3 + (0.25 * kernel(p.t * h)) / ((h * h) / 8),
              ]}
              color={C.gold}
            />
            <Label p={[0.5, -0.5]} color={C.purple}>
              {step === 3
                ? 'v(x) = x−½ (вертикальный масштаб ×0,4)'
                : 'Ψ на каждой части · высота рисунка нормирована'}
            </Label>
          </>
        )}
      </Board>
      <Metrics
        items={[
          m('∫ x² dx', q.exact),
          m(step < 2 ? 'S' : 'T', step < 2 ? q.riemann : q.trapezoid, C.gold),
          m('E = ∫ − приближение', q.exact - (step < 2 ? q.riemann : q.trapezoid), C.red),
          ...(step >= 4 ? [m('h²/8', (h * h) / 8), m('граница |E|', q.bound)] : []),
        ]}
      />
    </>
  );
}
function Euler({ params: p, step }: SceneProps) {
  const n = p.n,
    power = p.power,
    scale = n ** power,
    f = (x: number) => x ** power / scale,
    exact = (n ** (power + 1) - 1) / (power + 1),
    sum = linspace(1, n, n - 1).reduce((a, k) => a + k ** power, 0),
    weighted = sum - (1 + scale) / 2;
  return (
    <>
      <Board stretch x={[0.5, n + 0.5]} y={[-0.8, 1.6]}>
        {Array.from({ length: n - 1 }, (_, i) => {
          const k = i + 1;
          return (
            <Fill
              key={k}
              points={[
                [k, 0],
                [k, f(k)],
                [k + 1, f(k + 1)],
                [k + 1, 0],
              ]}
              color={C.gold}
              opacity={0.12}
            />
          );
        })}
        <Curve points={graphSample(f, 1, n)} width={3} />
        {linspace(1, n, n - 1).map((k, i) => (
          <Dot
            key={i}
            p={[k, f(k)]}
            color={i === 0 || i === n - 1 ? C.purple : C.gold}
            label={i === 0 || i === n - 1 ? '½' : '1'}
          />
        ))}
        {step >= 1 &&
          Array.from({ length: n - 1 }, (_, i) => {
            const a = i + 1;
            return (
              <Curve
                key={i}
                points={graphSample((x) => -0.6 + 2 * (x - a) * (a + 1 - x), a, a + 1, 36)}
                color={C.purple}
              />
            );
          })}
        {step >= 1 && <Dot p={[1 + p.t, -0.6 + 2 * p.t * (1 - p.t)]} color={C.gold} />}
        <Label p={[(1 + n) / 2, 1.5]}>f(x)=xᵖ; высоты графика / nᵖ</Label>
        <Label p={[(1 + n) / 2, -0.75]} color={C.purple}>
          ядро Ψ · высоты ×4, сдвиг −0,6
        </Label>
      </Board>
      <Metrics
        items={[
          m('Σ′f(k)', weighted, C.gold),
          m('∫ f', exact),
          m('∫ f″Ψ', weighted - exact, C.purple),
          m('Σ f(k)', sum),
        ]}
      />
    </>
  );
}
function Wallis({ params: p, step }: SceneProps) {
  const k = Math.round(p.k),
    bounds = wallisBounds(k);
  return (
    <>
      <Board stretch x={[-0.15, 1.8]} y={[-0.35, 1.3]}>
        {[2 * k - 1, 2 * k, 2 * k + 1].map((power, i) => (
          <g key={i}>
            <Area
              f={(x) => Math.sin(x) ** power}
              a={0}
              b={Math.PI / 2}
              color={[C.gold, C.cyan, C.purple][i]}
              opacity={0.08}
            />
            <Curve
              points={graphSample((x) => Math.sin(x) ** power, 0, Math.PI / 2, 240)}
              color={[C.gold, C.cyan, C.purple][i]}
              width={i === 1 ? 3 : 2}
            />
          </g>
        ))}
        <Label p={[0.6, 1.15]}>sin²ᵏ⁻¹x ≥ sin²ᵏx ≥ sin²ᵏ⁺¹x</Label>
        {step >= 2 && (
          <>
            <Seg a={[0.05, -0.15]} b={[1.65, -0.15]} color={C.muted} />
            <Dot p={[0.85 + (bounds.lower - Math.PI / 2) * 3, -0.15]} label="Lₖ" color={C.purple} />
            <Dot p={[0.85 + (bounds.upper - Math.PI / 2) * 3, -0.15]} label="Rₖ" color={C.gold} />
            <Dot p={[0.85, -0.15]} label="π/2" color={C.cyan} />
          </>
        )}
      </Board>
      <Metrics
        items={
          step < 2
            ? [
                m('I₂ₖ₊₁', wallisIntegral(2 * k + 1), C.purple),
                m('I₂ₖ', wallisIntegral(2 * k)),
                m('I₂ₖ₋₁', wallisIntegral(2 * k - 1), C.gold),
              ]
            : [
                m('Lₖ', bounds.lower, C.purple),
                m('π/2', Math.PI / 2),
                m('Rₖ', bounds.upper, C.gold),
                m('зазор', bounds.upper - bounds.lower),
              ]
        }
      />
    </>
  );
}
function Poisson({ params: p }: SceneProps) {
  const n = p.n,
    lo = (x: number) => Math.max(0, 1 - (x * x) / n) ** n,
    hi = (x: number) => (1 + (x * x) / n) ** -n,
    gauss = (x: number) => Math.exp(-x * x),
    bounds = gaussianBounds(n);
  return (
    <>
      <Board stretch x={[-0.2, 3.3]} y={[-0.2, 1.3]}>
        <Area f={hi} a={0} b={3} color={C.gold} opacity={0.12} />
        <Area f={lo} a={0} b={3} color={C.purple} opacity={0.2} />
        <Curve points={graphSample(hi, 0, 3)} color={C.gold} semantic="upper" />
        <Curve points={graphSample(gauss, 0, 3)} color={C.cyan} width={3} />
        <Curve points={graphSample(lo, 0, 3)} color={C.purple} semantic="lower" />
        <Label p={[1.6, 1.18]}>(1−y²/n)₊ⁿ ≤ e⁻ʸ² ≤ (1+y²/n)⁻ⁿ</Label>
      </Board>
      <Metrics
        items={[
          m('√n I₂ₙ₊₁', bounds.lower, C.purple),
          m('J=√π/2', Math.sqrt(Math.PI) / 2),
          m('√n I₂ₙ₋₂', bounds.upper, C.gold),
        ]}
      />
    </>
  );
}
function Improper({ params: p, step }: SceneProps) {
  const R = p.R,
    f = (x: number) => x ** -p.p,
    exact = p.p === 1 ? Math.log(R) : 1 - 1 / R,
    n = Math.round(R);
  return (
    <>
      <Board stretch x={[0.6, R + 1]} y={[-0.22, 1.25]}>
        <Area f={f} a={1} b={R} />
        <Curve points={graphSample(f, 1, R + 1, 240)} width={3} />
        <Seg a={[R, 0]} b={[R, 1.1]} color={C.gold} />
        <Label p={[R, 1.16]}>R</Label>
        {step === 3 &&
          Array.from({ length: n - 1 }, (_, i) => {
            const k = i + 1;
            return (
              <g key={k}>
                <Fill
                  points={[
                    [k, 0],
                    [k, f(k)],
                    [k + 1, f(k)],
                    [k + 1, 0],
                  ]}
                  color={C.gold}
                  opacity={0.12}
                />
                <Fill
                  points={[
                    [k, 0],
                    [k, f(k + 1)],
                    [k + 1, f(k + 1)],
                    [k + 1, 0],
                  ]}
                  color={C.purple}
                  opacity={0.2}
                />
              </g>
            );
          })}
      </Board>
      <Metrics
        items={[
          m('∫₁ᴿ x⁻ᵖ dx', exact),
          m(p.p === 1 ? '∫ᴿ²ᴿ dx/x' : '∫ᴿ∞ dx/x²', p.p === 1 ? Math.log(2) : 1 / R, C.gold),
          m('полный интеграл', p.p === 1 ? 'расходится' : '1'),
          ...(step === 3
            ? [
                m(
                  'Σₖ₌₂ᴿf(k)',
                  Array.from({ length: n - 1 }, (_, i) => i + 2).reduce((s, k) => s + f(k), 0),
                  C.purple,
                ),
              ]
            : []),
        ]}
      />
      <div className="board-hint">Линейные оси · окно по x меняется вместе с R</div>
    </>
  );
}
function Gamma({ params: p }: SceneProps) {
  const f = (x: number) => gammaDensity(x, p.t),
    peak = p.t > 1 ? Math.max(p.epsilon, Math.min(p.R, p.t - 1)) : p.epsilon,
    max = Math.max(1, f(peak)) * 1.2,
    pts = linspace(Math.log(p.epsilon), Math.log(p.R), 280).map(
      (u) => [Math.exp(u), f(Math.exp(u))] as V2,
    );
  return (
    <>
      <Board stretch x={[-0.3, p.R + 0.4]} y={[-max * 0.12, max]}>
        <Fill points={[[p.epsilon, 0], ...pts, [p.R, 0]]} />
        <Curve points={pts} width={3} />
        <Seg a={[p.x, 0]} b={[p.x, f(p.x)]} color={C.gold} />
        <Dot p={[p.x, f(p.x)]} label="gₜ(x)" color={C.gold} />
        <Label p={[p.R * 0.6, max * 0.85]}>xᵗ⁻¹e⁻ˣ · t = {fmt(p.t)}</Label>
        <Seg a={[p.epsilon, 0]} b={[p.epsilon, max * 0.75]} color={C.purple} dashed />
        <Label p={[p.epsilon + 0.15, -max * 0.07]}>ε</Label>
        <Label p={[p.R, -max * 0.07]}>R</Label>
      </Board>
      <Metrics
        items={[
          m('x', p.x, C.gold),
          m('gₜ(x)', f(p.x), C.gold),
          m('∫εᴿ gₜ(x) dx ≈', gammaTruncated(p.t, p.epsilon, p.R)),
          m('t', p.t),
        ]}
      />
    </>
  );
}
export default function Calculus(props: SceneProps) {
  switch (props.lesson.scene) {
    case 'integral':
      return <Integral {...props} />;
    case 'substitution':
      return <Substitution {...props} />;
    case 'convexity':
      return <Convexity {...props} />;
    case 'jumps':
      return <Jumps {...props} />;
    case 'convex-set':
      return <ConvexSet {...props} />;
    case 'jensen':
      return <Jensen {...props} />;
    case 'extrema':
      return <Extrema {...props} />;
    case 'quadrature':
      return <Quadrature {...props} />;
    case 'euler-maclaurin':
      return <Euler {...props} />;
    case 'wallis':
      return <Wallis {...props} />;
    case 'poisson':
      return <Poisson {...props} />;
    case 'improper':
      return <Improper {...props} />;
    case 'gamma':
      return <Gamma {...props} />;
    default:
      return null;
  }
}
