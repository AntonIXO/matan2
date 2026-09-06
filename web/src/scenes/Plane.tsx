import MovablePoint from '../AccessiblePoint';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Mafs, Coordinates, Point, Text, Line, Vector, Polygon, Polyline } from 'mafs';
import type { SceneProps } from '../types';
import { C } from '../colors';
import {
  A,
  B,
  F,
  G,
  TAU,
  add,
  sub,
  mul,
  norm,
  clamp,
  fmt,
  linspace,
  ellipse,
  ellipseVelocity,
  sigma,
  sigmaPrime,
  polarRadius,
  polarPrime,
  polarPoint,
  polarExtrema,
  polarArea,
  diameterRadius,
  integrate,
  cross2,
  type V2,
} from '../math';
import Calculus from './Calculus';
import Abstract from './Abstract';
import { useSmallScreen } from '../useSmallScreen';
import { useHighlight } from '../Highlight';
export { C };
export function Board({
  children,
  x = [-2.8, 2.8],
  y = [-1.9, 1.9],
  axes = true,
  reset = 0,
  stretch = false,
}: {
  children: ReactNode;
  x?: V2;
  y?: V2;
  axes?: boolean;
  reset?: number;
  stretch?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [height, setHeight] = useState(440);
  useEffect(() => {
    const ob = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h > 0) setHeight(h);
    });
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, []);
  return (
    <div className="board" ref={ref}>
      <Mafs
        key={reset}
        height={height}
        preserveAspectRatio={stretch ? false : 'contain'}
        viewBox={{ x, y, padding: 0.2 }}
        pan={false}
        zoom={false}
      >
        {axes && (
          <Coordinates.Cartesian
            xAxis={{ labels: (n) => (n === 0 ? '' : n) }}
            yAxis={{ labels: (n) => (n === 0 ? '' : n) }}
          />
        )}
        {children}
      </Mafs>
    </div>
  );
}
export function Curve({
  points,
  color = C.cyan,
  width = 2,
  dashed = false,
  semantic,
}: {
  points: V2[];
  color?: string;
  width?: number;
  dashed?: boolean;
  semantic?: string;
}) {
  const h = useHighlight();
  return points.length > 1 ? (
    <Polyline
      points={points}
      color={color}
      weight={width + (semantic && h.active === semantic ? 2 : 0)}
      fillOpacity={0}
      strokeStyle={dashed ? 'dashed' : 'solid'}
      svgPolylineProps={
        semantic
          ? { onPointerEnter: () => h.set(semantic), onPointerLeave: () => h.set('') }
          : undefined
      }
    />
  ) : null;
}
export function Dot({
  p,
  color = C.white,
  label,
  attach = 'ne',
}: {
  p: V2;
  color?: string;
  label?: string;
  attach?: 'ne' | 'nw' | 'se' | 'sw';
}) {
  return (
    <>
      <Point x={p[0]} y={p[1]} color={color} />
      {label && (
        <Text x={p[0]} y={p[1]} attach={attach} attachDistance={12} color={color} size={15}>
          {label}
        </Text>
      )}
    </>
  );
}
export function Seg({
  a,
  b,
  color = C.gold,
  dashed = false,
  semantic,
}: {
  a: V2;
  b: V2;
  color?: string;
  dashed?: boolean;
  semantic?: string;
}) {
  return <Curve points={[a, b]} color={color} dashed={dashed} semantic={semantic} />;
}
export function Arrow({
  a = [0, 0],
  b,
  color = C.gold,
  semantic,
}: {
  a?: V2;
  b: V2;
  color?: string;
  semantic?: string;
}) {
  const h = useHighlight();
  return norm(sub(a, b)) > 1e-8 ? (
    <g
      onPointerEnter={() => semantic && h.set(semantic)}
      onPointerLeave={() => semantic && h.set('')}
    >
      <Vector tail={a} tip={b} color={color} weight={h.active === semantic ? 4 : 2} />
    </g>
  ) : null;
}
export function Fill({
  points,
  color = C.cyan,
  opacity = 0.15,
}: {
  points: V2[];
  color?: string;
  opacity?: number;
}) {
  return (
    <Polygon points={points} color={color} fillOpacity={opacity} strokeOpacity={0.5} weight={1} />
  );
}
export function Label({
  p,
  children,
  color = C.muted,
  size = 14,
}: {
  p: V2;
  children: ReactNode;
  color?: string;
  size?: number;
}) {
  return (
    <Text x={p[0]} y={p[1]} size={size} color={color}>
      {children}
    </Text>
  );
}
export function Metrics({
  items,
}: {
  items: { label: string; value: string | number; color?: string }[];
}) {
  return (
    <div className="scene-metrics" role="status" aria-live="off">
      {items.map((i, k) => (
        <span key={k} style={{ color: i.color }}>
          {i.label} <b>{typeof i.value === 'number' ? fmt(i.value) : i.value}</b>
        </span>
      ))}
    </div>
  );
}
export const sample = (f: (t: number) => V2, a = 0, b = TAU, n = 160) => linspace(a, b, n).map(f);
export const sector = (r: (t: number) => number, a: number, b: number): V2[] => [
  [0, 0],
  ...sample((t) => mul([Math.cos(t), Math.sin(t)], r(t)), a, b),
  [0, 0],
];
export function PathScene({ params: p, step, onParam, cameraKey }: SceneProps) {
  const t = TAU * p.laps * p.direction * sigma(p.t, p.k),
    pt = ellipse(t),
    v = ellipseVelocity(t),
    dtdu = TAU * p.laps * p.direction * sigmaPrime(p.t, p.k),
    velocity = mul(v, dtdu);
  const scale = 0.065 / (p.laps || 1);
  const length = integrate((a) => norm(ellipseVelocity(a)), 0, TAU);
  const marks = linspace(0, 1, 20).map((u) => ellipse(TAU * p.direction * p.laps * sigma(u, p.k)));
  return (
    <>
      <Board x={[-2.8, 2.8]} y={[-2, 2]} reset={cameraKey}>
        <Curve points={sample((a) => ellipse(a))} color={C.grid} width={3} semantic="carrier" />
        <Curve points={sample((a) => ellipse(a), 0, t)} color={C.cyan} width={3} />
        {step >= 2 &&
          marks.map((q, i) => <Point key={i} x={q[0]} y={q[1]} color={C.gold} opacity={0.75} />)}
        <Seg a={pt} b={[pt[0], 0]} color={C.muted} dashed />
        <Seg a={pt} b={[0, pt[1]]} color={C.muted} dashed />
        {step >= 3 && (
          <Arrow a={pt} b={add(pt, mul(velocity, scale))} color={C.gold} semantic="velocity" />
        )}
        <Dot p={pt} label="γ(t)" />
        <Label p={[0, 1.65]} color={C.white}>
          γ(t) = (2 cos t, sin t)
        </Label>
        <Seg a={[-2, -1.6]} b={[2, -1.6]} color={C.muted} />
        {linspace(0, 1, 10).map((u, i) => (
          <Seg key={i} a={[-2 + 4 * u, -1.65]} b={[-2 + 4 * u, -1.55]} color={C.muted} />
        ))}
        <MovablePoint
          label="Параметр u на шкале"
          point={[-2 + 4 * p.t, -1.6]}
          constrain={([x]) => [clamp(x, -2, 2), -1.6]}
          onMove={([x]) => onParam('t', (x + 2) / 4)}
          color={C.cyan}
        />
        <Label p={[-2.35, -1.6]}>u</Label>
        <Label p={[-2, -1.87]}>0</Label>
        <Label p={[2, -1.87]}>1</Label>
      </Board>
      <Metrics
        items={[
          { label: 't', value: t },
          { label: 'x(t)', value: pt[0] },
          { label: 'y(t)', value: pt[1] },
          { label: '‖dγ/du‖', value: norm(velocity), color: C.gold },
          { label: 'L ≈', value: length * p.laps },
        ]}
      />
      {step >= 3 && (
        <div className="board-hint">
          Стрелка скорости: масштаб {fmt(scale, 4)} · равные отметки Δu
        </div>
      )}
    </>
  );
}
export function LengthScene({ params: p, step, cameraKey }: SceneProps) {
  const a = Math.max(0, p.t - p.delta / 2),
    b = Math.min(Math.PI / 2, p.t + p.delta / 2),
    width = b - a;
  const full = integrate((t) => norm(ellipseVelocity(t)), 0, Math.PI / 2);
  const length = p.scale * integrate((t) => norm(ellipseVelocity(t)), a, b),
    lower = p.scale * norm([2 * Math.sin(a), Math.cos(b)]) * width,
    upper = p.scale * norm([2 * Math.sin(b), Math.cos(a)]) * width;
  const polygon = sample((t) => mul(ellipse(t), p.scale), 0, Math.PI / 2, Math.round(p.n));
  let sum = 0;
  for (let i = 1; i < polygon.length; i++) sum += norm(sub(polygon[i], polygon[i - 1]));
  return (
    <>
      <Board x={[-0.5, 2.6]} y={[-0.9, 1.65]} reset={cameraKey}>
        <Curve points={sample((t) => ellipse(t), 0, Math.PI / 2)} color={C.grid} width={4} />
        <Curve points={sample((t) => mul(ellipse(t), p.scale), 0, p.t)} color={C.cyan} />
        <Curve
          points={sample((t) => mul(ellipse(t), p.scale), p.t, Math.PI / 2)}
          color={C.purple}
        />
        {step === 0 && (
          <>
            <Arrow a={[0.25, -0.4]} b={[1.9, -0.4]} />
            <Label p={[1.05, -0.65]}>Прямой путь: L = ‖v‖ · Δt</Label>
          </>
        )}
        {step === 3 && (
          <>
            {polygon.map(
              (q, i) => i > 0 && <Seg key={i} a={polygon[i - 1]} b={q} color={C.gold} />,
            )}
            {polygon.map((q, i) => (
              <Point key={i} x={q[0]} y={q[1]} color={C.gold} />
            ))}
          </>
        )}
        {step >= 4 && (
          <>
            <Curve
              points={sample((t) => mul(ellipse(t), p.scale), a, b)}
              color={C.gold}
              width={5}
            />
            <Dot p={mul(ellipse(a), p.scale)} label="γ(α)" color={C.gold} />
            <Dot p={mul(ellipse(b), p.scale)} label="γ(β)" color={C.gold} />
            <Seg a={[0, -0.35]} b={[lower, -0.35]} color={C.cyan} />
            <Seg a={[0, -0.65]} b={[upper, -0.65]} color={C.red} />
            <Label p={[1.6, -0.35]} color={C.cyan}>
              ‖m‖ · |Δ|
            </Label>
            <Label p={[1.6, -0.65]} color={C.red}>
              ‖M‖ · |Δ|
            </Label>
          </>
        )}
        <Dot p={mul(ellipse(p.t), p.scale)} label="γ(t)" />
        <Label p={[1.1, 1.45]}>Четверть эллипса · без остановок</Label>
      </Board>
      <Metrics
        items={
          step >= 4
            ? [
                { label: 'нижняя', value: lower, color: C.cyan },
                { label: 'L(Δ) ≈', value: length, color: C.gold },
                { label: 'верхняя', value: upper, color: C.red },
              ]
            : step === 3
              ? [
                  { label: 'Lₙ', value: sum },
                  { label: 'L ≈', value: full * p.scale },
                  { label: 'зазор ≈', value: full * p.scale - sum },
                ]
              : [
                  { label: 'L ≈', value: full * p.scale },
                  {
                    label: 'до точки ≈',
                    value: p.scale * integrate((t) => norm(ellipseVelocity(t)), 0, p.t),
                  },
                  {
                    label: 'после ≈',
                    value: p.scale * integrate((t) => norm(ellipseVelocity(t)), p.t, Math.PI / 2),
                  },
                ]
        }
      />
    </>
  );
}
export function PolarLength({ params: p, step, cameraKey }: SceneProps) {
  const q = polarPoint(p.t, p.c),
    rho = polarRadius(p.t, p.c),
    dr = polarPrime(p.t, p.c),
    er: V2 = [Math.cos(p.t), Math.sin(p.t)],
    ep: V2 = [-er[1], er[0]],
    vr = mul(er, dr),
    vp = mul(ep, rho),
    v = add(vr, vp),
    sc = 0.6;
  return (
    <>
      <Board x={[-2.3, 2.3]} y={[-2, 2]} reset={cameraKey}>
        <Curve points={sample((t) => polarPoint(t, p.c))} />
        <Seg a={[0, 0]} b={q} color={C.muted} />
        <Dot p={[0, 0]} label="O" />
        {step >= 1 && <Arrow a={q} b={add(q, mul(vr, sc))} color={C.purple} semantic="radial" />}
        {step >= 2 && (
          <>
            <Arrow a={q} b={add(q, mul(vp, sc))} color={C.gold} semantic="angular" />
            <Seg a={add(q, mul(vr, sc))} b={add(q, mul(v, sc))} color={C.gold} dashed />
            <Seg a={add(q, mul(vp, sc))} b={add(q, mul(v, sc))} color={C.purple} dashed />
          </>
        )}
        {step >= 3 && <Arrow a={q} b={add(q, mul(v, sc))} color={C.red} semantic="velocity" />}
        <Dot p={q} label="γ(φ)" />
        <Curve
          points={sample((t) => mul([Math.cos(t), Math.sin(t)], 0.35), 0, p.t)}
          color={C.gold}
        />
      </Board>
      <Metrics
        items={[
          { label: 'ρ', value: rho },
          { label: 'ρ′', value: dr, color: C.purple },
          { label: '√(ρ²+ρ′²)', value: norm(v), color: C.red },
        ]}
      />
      <div className="board-hint">Радиальная — фиолетовая · угловая — жёлтая · стрелки ×0,6</div>
    </>
  );
}
export function PolarArea({ params: p, step, cameraKey }: SceneProps) {
  const a = p.t,
    b = a + p.delta,
    r = (t: number) => polarRadius(t, p.c),
    e = polarExtrema(a, b, p.c),
    area = polarArea(a, b, p.c);
  return (
    <>
      <Board x={[-1.9, 1.9]} y={[-1.8, 1.8]} reset={cameraKey}>
        <Curve points={sample((t) => polarPoint(t, p.c))} color={C.grid} width={2} />
        {step >= 1 && <Fill points={sector(() => e.max, a, b)} color={C.red} opacity={0.12} />}
        <Fill points={sector(r, a, b)} color={C.cyan} opacity={0.22} />
        {step >= 1 && <Fill points={sector(() => e.min, a, b)} color={C.gold} opacity={0.22} />}
        <Curve points={sample((t) => polarPoint(t, p.c), a, b)} width={3} />
        <Seg a={[0, 0]} b={polarPoint(a, p.c)} />
        <Seg a={[0, 0]} b={polarPoint(b, p.c)} />
        {step >= 1 && (
          <>
            <Curve
              points={sample((t) => mul([Math.cos(t), Math.sin(t)], e.max), a, b)}
              color={C.red}
              dashed
              semantic="outer"
            />
            <Curve
              points={sample((t) => mul([Math.cos(t), Math.sin(t)], e.min), a, b)}
              color={C.gold}
              dashed
              semantic="inner"
            />
          </>
        )}
        <Dot p={[0, 0]} label="O" />
        <Dot p={polarPoint(a, p.c)} color={C.gold} label="α" />
        <Dot p={polarPoint(b, p.c)} color={C.cyan} label="β" />
      </Board>
      <Metrics
        items={[
          { label: '½m²|Δ|', value: 0.5 * e.min ** 2 * p.delta, color: C.gold },
          { label: 'Σ(Δ)', value: area, color: C.cyan },
          { label: '½M²|Δ|', value: 0.5 * e.max ** 2 * p.delta, color: C.red },
        ]}
      />
      {step >= 1 && (
        <div className="board-hint">Жёлтый сектор внутри · красный снаружи · одинаковый угол</div>
      )}
    </>
  );
}
export function ParametricArea({ params: p, step, cameraKey }: SceneProps) {
  const origin: V2 = [p.offset, 0],
    q = ellipse(p.direction * p.t),
    next = ellipse(p.direction * (p.t + p.dt)),
    v = mul(ellipseVelocity(p.direction * p.t), p.direction),
    density = cross2(sub(q, origin), v) / 2,
    tri = cross2(sub(q, origin), sub(next, origin)) / 2;
  const portions = linspace(0, p.t, 80);
  return (
    <>
      <Board x={[-2.5, 3.6]} y={[-1.8, 1.8]} reset={cameraKey}>
        {step >= 3 &&
          portions.slice(1).map((t, i) => {
            const a = ellipse(p.direction * portions[i]),
              b = ellipse(p.direction * t),
              positive = cross2(sub(a, origin), sub(b, origin)) >= 0;
            return (
              <Fill
                key={i}
                points={[origin, a, b]}
                color={positive ? C.cyan : C.red}
                opacity={0.15}
              />
            );
          })}
        <Curve points={sample((t) => ellipse(t))} color={C.grid} width={3} />
        <Curve points={sample((t) => ellipse(p.direction * t), 0, p.t)} color={C.cyan} width={3} />
        <Fill points={[origin, q, next]} color={tri >= 0 ? C.gold : C.red} opacity={0.35} />
        <Seg a={origin} b={q} />
        <Seg a={origin} b={next} color={C.muted} />
        {step >= 1 && <Arrow a={q} b={add(q, mul(v, 0.45))} color={C.purple} />}
        <Dot p={origin} label="O" />
        <Dot p={q} label="γ(t)" />
        <Dot p={next} label="γ(t+Δt)" color={C.gold} />
      </Board>
      <Metrics
        items={[
          { label: 'S△ / Δt', value: tri / p.dt, color: C.gold },
          { label: '½(xy′−yx′)', value: density, color: density >= 0 ? C.cyan : C.red },
          { label: 'полный Sор', value: p.direction * 2 * Math.PI },
          { label: 'площадь', value: 2 * Math.PI },
        ]}
      />
      <div className="board-hint">Координаты радиус-векторов отсчитываются от O</div>
    </>
  );
}
export function DiameterArea({ params: p, step, cameraKey }: SceneProps) {
  const r = (t: number) => diameterRadius(t, p.q),
    a = mul([Math.cos(p.t), Math.sin(p.t)], r(p.t)),
    b = mul([Math.cos(p.t - Math.PI / 2), Math.sin(p.t - Math.PI / 2)], r(p.t - Math.PI / 2)),
    ab = norm(sub(a, b));
  const figure = sample((t) => [0.5 + 0.5 * Math.cos(t), 0.5 * p.q * Math.sin(t)]);
  const e1: V2 = [Math.cos(p.t), Math.sin(p.t)],
    e2: V2 = [Math.sin(p.t), -Math.cos(p.t)];
  return (
    <>
      <Board x={[-0.3, 1.55]} y={[-0.75, 0.75]} axes={false} reset={cameraKey}>
        <Fill points={figure} opacity={0.15} />
        <Curve points={figure} width={3} />
        <Seg a={[0, -0.62]} b={[0, 0.62]} color={C.muted} />
        <Label p={[-0.18, 0.63]}>опорная</Label>
        {step >= 1 && (
          <>
            <Seg a={[0, 0]} b={a} color={C.gold} semantic="rays" />
            <Seg a={[0, 0]} b={b} color={C.purple} semantic="rays" />
            <Curve
              points={[mul(e1, 0.07), add(mul(e1, 0.07), mul(e2, 0.07)), mul(e2, 0.07)]}
              color={C.white}
            />
            <Dot p={a} label="A" color={C.gold} />
            <Dot p={b} label="B" color={C.purple} />
          </>
        )}
        {step >= 2 && (
          <>
            <Fill points={[[0, 0], a, b]} opacity={0.1} color={C.gold} />
            <Seg a={a} b={b} color={C.red} semantic="chord" />
            <Label p={add(mul(add(a, b), 0.5), [0.07, 0])} color={C.red}>
              AB
            </Label>
          </>
        )}
        <Dot p={[0, 0]} label="O" />
        <Seg a={[0, -0.58]} b={[1, -0.58]} color={C.muted} />
        <Label p={[0.5, -0.67]}>diam G = 1</Label>
        {step >= 4 && (
          <>
            <Curve
              points={linspace(0, Math.PI / 2).map((phi) => [
                1.12 + (0.27 * phi) / (Math.PI / 2),
                -0.3 + 0.6 * (r(phi) ** 2 + r(phi - Math.PI / 2) ** 2),
              ])}
              color={C.cyan}
            />
            <Seg a={[1.1, 0.3]} b={[1.42, 0.3]} color={C.red} />
            <Label p={[1.25, 0.41]}>≤ 1</Label>
            <Dot p={[1.12 + (0.27 * p.t) / (Math.PI / 2), -0.3 + 0.6 * ab * ab]} color={C.gold} />
          </>
        )}
      </Board>
      <Metrics
        items={[
          { label: 'OA² + OB²', value: r(p.t) ** 2 + r(p.t - Math.PI / 2) ** 2, color: C.gold },
          { label: 'AB² ≤ 1', value: ab * ab, color: C.red },
          { label: 'σ(G)', value: (Math.PI * p.q) / 4 },
          { label: 'π/4', value: Math.PI / 4 },
        ]}
      />
    </>
  );
}
export function Composition({ params: p, step, onParam }: SceneProps) {
  const small = useSmallScreen();
  const h: V2 = [p.hx, p.hy],
    r = p.radius,
    lerp = (a: V2, b: V2, t: number) => add(mul(a, 1 - t), mul(b, t));
  const real = [
    (q: V2) => q,
    (q: V2) => lerp(q, mul(F(mul(q, r)), 1 / r), clamp(p.t, 0, 1)),
    (q: V2) => lerp(mul(F(mul(q, r)), 1 / r), mul(G(F(mul(q, r))), 1 / r), clamp(p.t - 1, 0, 1)),
  ];
  const linear = [(q: V2) => q, A, (q: V2) => B(A(q))];
  const visible = [true, step >= 1, step >= 2],
    names = ['h', 'F(a+h) − F(a)', 'G(F(a+h)) − G(F(a))'];
  return (
    <>
      <div className="composition-panes">
        {real.map((fn, i) => (
          <div key={i}>
            <div className="pane-title">{names[i]}</div>
            <Mafs
              height={small ? 230 : 330}
              viewBox={{ x: [-1.75, 1.75], y: [-1.75, 1.75], padding: 0.15 }}
              pan={false}
              zoom={false}
            >
              <Coordinates.Cartesian xAxis={{ labels: false }} yAxis={{ labels: false }} />
              {visible[i] && (
                <>
                  {linspace(-0.8, 0.8, 8).flatMap((v, k) => [
                    <Curve
                      key={'x' + k}
                      points={linspace(-0.8, 0.8, 24).map((u) => fn([u, v]))}
                      color={C.cyan}
                      width={1}
                    />,
                    <Curve
                      key={'y' + k}
                      points={linspace(-0.8, 0.8, 24).map((u) => fn([v, u]))}
                      color={C.cyan}
                      width={1}
                    />,
                  ])}
                  {step >= 3 && (
                    <>
                      {[-0.8, 0.8].flatMap((v, k) => [
                        <Curve
                          key={'x' + k}
                          points={[-0.8, 0.8].map((u) => linear[i]([u, v]))}
                          color={C.gold}
                        />,
                        <Curve
                          key={'y' + k}
                          points={[-0.8, 0.8].map((u) => linear[i]([v, u]))}
                          color={C.gold}
                        />,
                      ])}
                      <Arrow b={linear[i](h)} color={C.gold} semantic="linear" />
                      <Seg a={linear[i](h)} b={fn(h)} color={C.red} semantic="error" />
                    </>
                  )}
                  {i === 0 ? (
                    <MovablePoint
                      label="Исходное приращение h"
                      point={h}
                      onMove={([x, y]) => {
                        onParam('hx', clamp(x, -0.8, 0.8));
                        onParam('hy', clamp(y, -0.8, 0.8));
                      }}
                      color={C.white}
                    />
                  ) : (
                    <Dot p={fn(h)} color={C.white} />
                  )}
                </>
              )}
            </Mafs>
          </div>
        ))}
      </div>
      <Metrics
        items={
          step < 3
            ? [
                { label: '‖h‖', value: r * norm(h) },
                { label: 'построение', value: p.t },
              ]
            : [
                { label: '‖h‖', value: r * norm(h) },
                { label: 'ошибка F / r', value: norm(sub(real[1](h), A(h))), color: C.red },
                { label: 'ошибка G∘F / r', value: norm(sub(real[2](h), B(A(h)))), color: C.red },
              ]
        }
      />
      <div className="board-hint">
        Координаты всех трёх панелей делятся на r = {fmt(r)} · единый масштаб
      </div>
    </>
  );
}
export default function Plane(props: SceneProps) {
  switch (props.lesson.scene) {
    case 'path':
      return <PathScene {...props} />;
    case 'length':
      return <LengthScene {...props} />;
    case 'polar-length':
      return <PolarLength {...props} />;
    case 'polar-area':
      return <PolarArea {...props} />;
    case 'parametric-area':
      return <ParametricArea {...props} />;
    case 'diameter-area':
      return <DiameterArea {...props} />;
    case 'composition':
      return <Composition {...props} />;
    default:
      return [
        'topology',
        'compactness',
        'jacobian',
        'products',
        'cantor',
        'brouwer',
        'norms',
      ].includes(props.lesson.scene) ? (
        <Abstract {...props} />
      ) : (
        <Calculus {...props} />
      );
  }
}
