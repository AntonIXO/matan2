import MovablePoint from '../AccessiblePoint';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import { useMemo, useEffect, useLayoutEffect, type ReactNode } from 'react';
import * as THREE from 'three';
import type { SceneProps } from '../types';
import {
  fmt,
  linspace,
  remainder,
  quad,
  helix,
  helixVelocity,
  dot,
  TAU,
  torusVolume,
  type V3,
} from '../math';
import { useSmallScreen } from '../useSmallScreen';
import { useHighlight } from '../Highlight';
import { C } from '../colors';
import { Mafs, Circle, Vector } from 'mafs';
export function Path3({
  points,
  color = C.cyan,
  width = 2,
  dashed = false,
  semantic,
}: {
  points: V3[];
  color?: string;
  width?: number;
  dashed?: boolean;
  semantic?: string;
}) {
  const h = useHighlight();
  return points.length > 1 ? (
    <Line
      onPointerOver={() => semantic && h.set(semantic)}
      onPointerOut={() => semantic && h.set('')}
      points={points}
      color={color}
      lineWidth={width + (semantic && h.active === semantic ? 2 : 0)}
      dashed={dashed}
      dashSize={0.07}
      gapSize={0.06}
    />
  ) : null;
}
export function Ball({ p, color = C.white, label }: { p: V3; color?: string; label?: string }) {
  return (
    <group position={p}>
      <mesh>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {label && (
        <Html position={[0.06, 0, 0.1]} center style={{ pointerEvents: 'none' }}>
          <span className="space-label" style={{ color }}>
            {label}
          </span>
        </Html>
      )}
    </group>
  );
}
export function Arrow3({
  a,
  b,
  color = C.gold,
  semantic,
}: {
  a: V3;
  b: V3;
  color?: string;
  semantic?: string;
}) {
  const av = new THREE.Vector3(...a),
    bv = new THREE.Vector3(...b),
    dir = bv.clone().sub(av),
    len = dir.length();
  if (len < 1e-8) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const head = Math.min(0.12, len * 0.3),
    pos = bv.clone().addScaledVector(dir, -head / 2);
  return (
    <>
      <Path3 points={[a, b]} color={color} semantic={semantic} />
      <mesh position={pos} quaternion={q} scale={[head * 0.3, head, head * 0.3]}>
        <coneGeometry args={[1, 1, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
}
export function Axes3({
  size = 1.5,
  labels = ['x', 'y', 'z'],
}: {
  size?: number;
  labels?: [string, string, string];
}) {
  return (
    <>
      {labels.map((label, i) => {
        const p: V3 = [0, 0, 0];
        p[i] = size;
        const a: V3 = [0, 0, 0];
        a[i] = -0.3;
        return (
          <group key={label}>
            <Arrow3 a={a} b={p} color={C.muted} />
            <Html position={p} center>
              <span className="space-label muted">{label}</span>
            </Html>
          </group>
        );
      })}
    </>
  );
}
export function Surface({
  fn,
  range = [-1, 1],
  n = 28,
  color = C.surface,
  opacity = 0.7,
}: {
  fn: (u: number, v: number) => V3;
  range?: [number, number];
  n?: number;
  color?: string;
  opacity?: number;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry(),
      indices: number[] = [];
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const a = i * (n + 1) + j;
        indices.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2);
      }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((n + 1) ** 2 * 3), 3));
    g.setIndex(indices);
    return g;
  }, [n]);
  useLayoutEffect(() => {
    const position = geometry.getAttribute('position');
    let k = 0;
    for (let i = 0; i <= n; i++)
      for (let j = 0; j <= n; j++) {
        const [x, y, z] = fn(
          range[0] + ((range[1] - range[0]) * i) / n,
          range[0] + ((range[1] - range[0]) * j) / n,
        );
        position.setXYZ(k++, x, y, z);
      }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    invalidate();
  }, [geometry, fn, range[0], range[1], n, invalidate]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
export function WireSurface({
  fn,
  range = [-1, 1],
  color = C.grid,
  lines = 8,
  semantic,
}: {
  fn: (u: number, v: number) => V3;
  range?: [number, number];
  color?: string;
  lines?: number;
  semantic?: string;
}) {
  return (
    <>
      {linspace(...range, lines).flatMap((v, i) => [
        <Path3
          key={'u' + i}
          points={linspace(...range, 45).map((u) => fn(u, v))}
          color={color}
          width={1}
          semantic={semantic}
        />,
        <Path3
          key={'v' + i}
          points={linspace(...range, 45).map((u) => fn(v, u))}
          color={color}
          width={1}
          semantic={semantic}
        />,
      ])}
    </>
  );
}
function Differentiability({ params, step }: SceneProps) {
  const r = params.radius,
    theta = params.angle,
    u = 0.85 * Math.cos(theta),
    v = 0.85 * Math.sin(theta);
  const fn = useMemo(
    () =>
      (x: number, y: number): V3 => [x, y, x + y + r * (x * x + 2 * y * y)],
    [r],
  );
  const plane = (x: number, y: number): V3 => [x, y, x + y];
  return (
    <>
      <Surface fn={fn} />
      <WireSurface fn={fn} />
      <Axes3 labels={['h₁/r', 'h₂/r', 'Δf/r']} />
      {step > 0 && (
        <>
          <WireSurface fn={plane} color={C.gold} lines={4} semantic="linear" />
          <Path3 points={linspace(-1, 1, 70).map((t) => fn(t, 0))} color={C.cyan} />
          <Path3 points={linspace(-1, 1, 70).map((t) => fn(0, t))} color={C.purple} />
          <Path3 points={[plane(u, v), fn(u, v)]} color={C.red} width={4} semantic="error" />
          <Ball p={fn(u, v)} color={C.red} />
          <Ball p={plane(u, v)} color={C.gold} />
        </>
      )}
      <Ball p={[0, 0, 0]} label="a → 0" />
    </>
  );
}

function Staircase({ params: p, step }: SceneProps) {
  const dx = p.lambda * p.dx,
    dy = p.lambda * p.dy,
    a: V3 = [0.2, 0.1, quad(0.2, 0.1)],
    b: V3 = [0.2 + dx, 0.1, quad(0.2 + dx, 0.1)],
    c: V3 = [0.2 + dx, 0.1 + dy, quad(0.2 + dx, 0.1 + dy)];
  const fn = (u: number, v: number): V3 => [u, v, quad(u, v)],
    first = linspace(0, dx, 40).map((d) => fn(0.2 + d, 0.1)),
    second = linspace(0, dy, 40).map((d) => fn(0.2 + dx, 0.1 + d));
  const q = p.t <= 1 ? fn(0.2 + dx * p.t, 0.1) : fn(0.2 + dx, 0.1 + dy * (p.t - 1));
  const xi1 = fn(0.2 + dx / 2, 0.1),
    xi2 = fn(0.2 + dx, 0.1 + dy / 2);
  return (
    <>
      <Surface fn={(u, v) => fn(u, 0.75 * v)} range={[0, 1.1]} opacity={0.2} />
      <WireSurface fn={(u, v) => fn(u, 0.75 * v)} range={[0, 1.1]} lines={7} />
      <Axes3 />
      <Path3 points={first} color={C.cyan} semantic="leg1" width={step === 1 ? 5 : 3} />
      <Path3 points={second} color={C.purple} semantic="leg2" width={step === 2 ? 5 : 3} />
      <Ball p={a} label="a" />
      <Ball p={b} label="(x₁,a₂)" color={C.cyan} />
      <Ball p={c} label="x" color={C.purple} />
      <Ball p={q} color={C.gold} />
      {step >= 1 && (
        <>
          <Ball p={xi1} label="ξ₁" color={C.gold} />
          <Path3
            points={[-0.15, 0.15].map((d) => [xi1[0] + d, xi1[1], xi1[2] + 2 * xi1[0] * d] as V3)}
            color={C.gold}
          />
        </>
      )}
      {step >= 2 && (
        <>
          <Ball p={xi2} label="ξ₂" color={C.gold} />
          <Path3
            points={[-0.15, 0.15].map((d) => [xi2[0], xi2[1] + d, xi2[2] + 4 * xi2[1] * d] as V3)}
            color={C.gold}
          />
        </>
      )}
      {[a, b, c].map((q, i) => (
        <Path3 key={i} points={[[q[0], q[1], 0], q]} dashed color={C.muted} />
      ))}
      <Arrow3 a={[a[0], a[1], 0]} b={[b[0], b[1], 0]} color={C.cyan} />
      <Arrow3 a={[b[0], b[1], 0]} b={[c[0], c[1], 0]} color={C.purple} />
    </>
  );
}
function Lagrange({ params: p, step }: SceneProps) {
  const circle = step >= 4,
    t = step === 3 ? Math.asin(2 / Math.PI) : p.t;
  const fn = (t: number): V3 => (circle ? [Math.cos(t), Math.sin(t), 0] : helix(t)),
    start = fn(0),
    end = fn(circle ? TAU : Math.PI),
    q = fn(t),
    v = end.map((x, i) => x - start[i]) as V3,
    vel = circle ? ([-Math.sin(t), Math.cos(t), 0] as V3) : helixVelocity(t);
  const denominator = dot(v, v);
  const foot: V3 =
    denominator > 1e-12
      ? (start.map(
          (x, i) =>
            x +
            (v[i] *
              dot(
                v,
                q.map((x, j) => x - start[j]),
              )) /
              denominator,
        ) as V3)
      : start;
  const vp: V3 =
    denominator > 1e-12 ? (vel.map((_, i) => (v[i] * dot(v, vel)) / denominator) as V3) : [0, 0, 0];
  return (
    <>
      <Axes3 />
      <Path3 points={linspace(0, circle ? TAU : Math.PI).map(fn)} width={3} />
      <Ball p={start} label="F(a)" />
      {!circle && (
        <>
          <Ball p={end} label="F(b)" />
          <Arrow3 a={start} b={end} semantic="chord" />
        </>
      )}
      <Ball
        p={q}
        label={t < 1e-7 || Math.abs(t - (circle ? TAU : Math.PI)) < 1e-7 ? undefined : 'F(t)'}
        color={C.cyan}
      />
      {step >= 1 && !circle && (
        <>
          <Path3 points={[q, foot]} dashed color={C.purple} semantic="projection" />
          <Ball p={foot} color={C.purple} />
        </>
      )}
      {step >= 2 && (
        <Arrow3
          a={q}
          b={q.map((x, i) => x + 0.55 * vel[i]) as V3}
          color={C.gold}
          semantic="velocity"
        />
      )}
      {step >= 2 && !circle && (
        <Arrow3
          a={foot}
          b={foot.map((x, i) => x + 0.55 * vp[i]) as V3}
          color={C.purple}
          semantic="projection"
        />
      )}
    </>
  );
}
function Gradient({ params: p, step }: SceneProps) {
  const ux = Math.cos(p.angle),
    uy = Math.sin(p.angle),
    a: V3 = [0.5, 0.25, quad(0.5, 0.25)],
    slope = ux + uy;
  const fn = (x: number, y: number): V3 => [x, y, quad(x, y)];
  return (
    <>
      <Surface fn={(u, v) => fn(u, (v + 0.15) / 1.15 - 0.25)} range={[-0.15, 1]} opacity={0.25} />
      <WireSurface fn={(u, v) => fn(u, (v + 0.15) / 1.15 - 0.25)} range={[-0.15, 1]} lines={7} />
      <Axes3 />
      <Surface
        fn={(t, z) => [a[0] + t * ux, a[1] + t * uy, z + 1]}
        range={[-0.5, 0.5]}
        color={C.purple}
        opacity={0.1}
      />
      <Path3
        points={linspace(-0.45, 0.45, 60).map((t) => fn(a[0] + t * ux, a[1] + t * uy))}
        color={C.purple}
        width={4}
      />
      {step >= 1 && (
        <Path3
          points={[-0.45, 0.45].map((t) => [a[0] + t * ux, a[1] + t * uy, a[2] + t * slope] as V3)}
          color={C.gold}
          width={3}
          semantic="tangent"
        />
      )}
      <Arrow3
        a={[a[0], a[1], 0]}
        b={[a[0] + 0.55 * ux, a[1] + 0.55 * uy, 0]}
        color={C.cyan}
        semantic="direction"
      />
      {step >= 2 && (
        <Arrow3
          a={[a[0], a[1], 0]}
          b={[a[0] + 0.55, a[1] + 0.55, 0]}
          color={C.red}
          semantic="gradient"
        />
      )}
      <Ball p={a} label="a, f(a)" />
      {Math.abs(p.t) > 1e-7 && (
        <Ball p={fn(a[0] + p.t * ux, a[1] + p.t * uy)} label="f(a+tu)" color={C.purple} />
      )}
    </>
  );
}
function Revolution({ params: p, step, lesson }: SceneProps) {
  const shell = lesson.scene === 'shells',
    f = (u: number) => 1 - u * u,
    theta = p.theta;
  const fn = (u: number, v: number): V3 =>
    shell
      ? [u * Math.cos(v * theta), u * Math.sin(v * theta), f(u)]
      : [u, f(u) * Math.cos(v * theta), f(u) * Math.sin(v * theta)];
  const at = (u: number, t: number): V3 =>
    shell ? [u * Math.cos(t), u * Math.sin(t), f(u)] : [u, f(u) * Math.cos(t), f(u) * Math.sin(t)];
  const lo = Math.max(0, p.u - p.width / 2),
    hi = Math.min(1, p.u + p.width / 2);
  return (
    <>
      <Axes3 />
      <Surface fn={fn} range={[0, 1]} opacity={0.2} />
      <WireSurface fn={fn} range={[0, 1]} lines={8} />
      <Path3 points={linspace(0, 1).map((u) => at(u, theta))} width={3} color={C.cyan} />
      <Path3 points={linspace(0, TAU).map((t) => at(p.u, t))} color={C.gold} width={3} />
      <Ball p={at(p.u, theta)} label="X(u,θ)" color={C.gold} />
      {shell ? (
        <>
          <Surface
            fn={(v, z) => [p.u * Math.cos(v * theta), p.u * Math.sin(v * theta), z * f(p.u)]}
            range={[0, 1]}
            color={C.gold}
            opacity={0.2}
          />
          <Path3
            points={[[p.u * Math.cos(theta), p.u * Math.sin(theta), 0], at(p.u, theta)]}
            color={C.gold}
            width={4}
          />
          {step >= 2 && (
            <Surface
              fn={(u, v) => {
                const r = lo + (hi - lo) * u;
                return [r * Math.cos(v * TAU), r * Math.sin(v * TAU), f(r)];
              }}
              range={[0, 1]}
              color={C.gold}
              opacity={0.65}
            />
          )}
        </>
      ) : (
        <>
          {step >= 3 && (
            <Surface
              fn={(r, t) => [p.u, r * f(p.u) * Math.cos(TAU * t), r * f(p.u) * Math.sin(TAU * t)]}
              range={[0, 1]}
              color={C.gold}
              opacity={0.45}
            />
          )}
          {step >= 4 && (
            <>
              <Surface
                fn={(u, v) => at(lo + (hi - lo) * u, TAU * v)}
                range={[0, 1]}
                color={C.gold}
                opacity={0.6}
              />
              {[lo, hi].map((u) => (
                <Path3 key={u} points={linspace(0, TAU).map((t) => at(u, t))} color={C.gold} />
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}
function Torus({ params: p }: SceneProps) {
  const R = p.R,
    r = R * p.ratio,
    theta = p.theta;
  const at = (u: number, v: number): V3 => [
    (R + r * Math.cos(v)) * Math.cos(u),
    (R + r * Math.cos(v)) * Math.sin(u),
    r * Math.sin(v),
  ];
  return (
    <>
      <Axes3 size={2} />
      <Surface fn={(u, v) => at(u * theta, v * TAU)} range={[0, 1]} n={40} opacity={0.42} />
      <WireSurface fn={(u, v) => at(u * theta, v * TAU)} range={[0, 1]} lines={12} />
      <Path3 points={linspace(0, TAU).map((v) => at(theta, v))} color={C.gold} width={3} />
      <Surface
        fn={(d, v) => [
          (R + r * d * Math.cos(v * TAU)) * Math.cos(theta),
          (R + r * d * Math.cos(v * TAU)) * Math.sin(theta),
          r * d * Math.sin(v * TAU),
        ]}
        range={[0, 1]}
        color={C.gold}
        opacity={0.35}
      />
      <Path3
        points={linspace(0, TAU).map((t) => [R * Math.cos(t), R * Math.sin(t), 0])}
        color={C.purple}
        dashed
      />
      <Arrow3 a={[0, 0, 0]} b={[R * Math.cos(theta), R * Math.sin(theta), 0]} color={C.purple} />
      <Ball p={[R * Math.cos(theta), R * Math.sin(theta), 0]} label="центр · R" color={C.purple} />
      <Arrow3
        a={[R * Math.cos(theta), R * Math.sin(theta), 0]}
        b={at(theta, Math.PI / 2)}
        color={C.gold}
      />
      <Ball p={at(theta, Math.PI / 2)} label="r" color={C.gold} />
    </>
  );
}
function Fit({ extent }: { extent: number }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const c = camera as THREE.OrthographicCamera;
    c.zoom = Math.min(size.width / extent, (size.height - 85) / (extent * 0.8));
    c.updateProjectionMatrix();
    invalidate();
  }, [camera, size, extent, invalidate]);
  return null;
}
export function SpaceFrame({
  children,
  cameraKey = 0,
  extent = 4.5,
  target = [0, 0, 0.5],
}: {
  children: ReactNode;
  cameraKey?: number;
  extent?: number;
  target?: V3;
}) {
  return (
    <Canvas
      key={cameraKey}
      orthographic
      camera={{ position: [4, -7, 6.5], up: [0, 0, 1], zoom: 95, near: 0.01, far: 200 }}
      frameloop="demand"
      dpr={[1, 1.7]}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={['#0d1520']} />
      <Fit extent={extent} />
      {children}
      <OrbitControls makeDefault target={target} enableDamping={false} minZoom={20} maxZoom={220} />
    </Canvas>
  );
}
function ControlsInset({ lesson, params: p, onParam }: SceneProps) {
  const small = useSmallScreen();
  const grad = lesson.scene === 'gradient',
    u = grad ? Math.cos(p.angle) : p.u,
    v = grad ? Math.sin(p.angle) : p.theta / TAU;
  return (
    <div className="space-inset">
      <div>{grad ? 'Единичное направление u' : 'Область параметров (u, θ/2π)'}</div>
      <Mafs
        height={small ? 110 : 150}
        viewBox={{
          x: grad ? [-1.3, 1.3] : [-0.1, 1.1],
          y: grad ? [-1.3, 1.3] : [-0.1, 1.1],
          padding: 0,
        }}
        pan={false}
        zoom={false}
      >
        {grad ? (
          <>
            <Circle center={[0, 0]} radius={1} color={C.muted} fillOpacity={0} />
            <Vector tail={[0, 0]} tip={[u, v]} color={C.cyan} />
          </>
        ) : (
          <>
            <Vector tail={[0, 0]} tip={[1, 0]} color={C.muted} />
            <Vector tail={[0, 0]} tip={[0, 1]} color={C.muted} />
          </>
        )}
        <MovablePoint
          label={grad ? 'Единичное направление' : 'Параметры поверхности'}
          point={[u, v]}
          constrain={([x, y]) =>
            grad
              ? [Math.cos(Math.atan2(y, x)), Math.sin(Math.atan2(y, x))]
              : [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))]
          }
          onMove={([x, y]) => {
            if (grad) onParam('angle', (Math.atan2(y, x) + TAU) % TAU);
            else {
              onParam('u', x);
              onParam('theta', y * TAU);
            }
          }}
          color={C.gold}
        />
      </Mafs>
    </div>
  );
}
export default function Space(props: SceneProps) {
  const { params: p, lesson, step } = props;
  let content: ReactNode,
    metrics: [string, number][] = [];
  switch (lesson.scene) {
    case 'staircase': {
      content = <Staircase {...props} />;
      const dx = p.dx * p.lambda,
        dy = p.dy * p.lambda;
      metrics = [
        ['Δ₁', quad(0.2 + dx, 0.1) - quad(0.2, 0.1)],
        ['Δ₂', quad(0.2 + dx, 0.1 + dy) - quad(0.2 + dx, 0.1)],
        ['r / ‖h‖', remainder([dx, dy]) / Math.hypot(dx, dy)],
      ];
      break;
    }
    case 'lagrange': {
      content = <Lagrange {...props} />;
      const t = step === 3 ? Math.asin(2 / Math.PI) : p.t;
      metrics =
        step >= 4
          ? [
              ['t (окружность)', p.t],
              ['‖F′(t)‖', 1],
              ['‖F(b)−F(a)‖', 0],
            ]
          : [
              ['t', t],
              ['‖хорда‖', Math.hypot(2, 0.4 * Math.PI)],
              ['⟨v,F′(t)⟩', 2 * Math.sin(t) + 0.16 * Math.PI],
            ];
      break;
    }
    case 'gradient':
      content = <Gradient {...props} />;
      metrics = [
        ['∂ᵤf', Math.cos(p.angle) + Math.sin(p.angle)],
        ['‖∇f‖', Math.sqrt(2)],
        ['‖u‖', 1],
      ];
      break;
    case 'revolution':
      content = <Revolution {...props} />;
      metrics = [
        ['f(u)', 1 - p.u * p.u],
        ['A(u)', Math.PI * (1 - p.u * p.u) ** 2],
        ['полный V', (8 * Math.PI) / 15],
        ...(step >= 4
          ? [
              [
                'ΔV ≈',
                Math.PI *
                  (1 - p.u * p.u) ** 2 *
                  (Math.min(1, p.u + p.width / 2) - Math.max(0, p.u - p.width / 2)),
              ] as [string, number],
            ]
          : []),
      ];
      break;
    case 'shells':
      content = <Revolution {...props} />;
      metrics = [
        ['2πr f(r)', TAU * p.u * (1 - p.u * p.u)],
        ['полный V', Math.PI / 2],
        ...(step >= 2
          ? [
              [
                'ΔV ≈',
                TAU *
                  p.u *
                  (1 - p.u * p.u) *
                  (Math.min(1, p.u + p.width / 2) - Math.max(0, p.u - p.width / 2)),
              ] as [string, number],
            ]
          : []),
      ];
      break;
    case 'torus':
      content = <Torus {...props} />;
      metrics = [
        ['R', p.R],
        ['r', p.R * p.ratio],
        ['полный V', torusVolume(p.R, p.R * p.ratio)],
      ];
      break;
    default: {
      content = <Differentiability {...props} />;
      const h: [number, number] = [
        p.radius * 0.85 * Math.cos(p.angle),
        p.radius * 0.85 * Math.sin(p.angle),
      ];
      metrics = [
        ['‖h‖', Math.hypot(...h)],
        ['r(h) / ‖h‖', remainder(h) / Math.hypot(...h)],
        ['≤ 2‖h‖', 2 * Math.hypot(...h)],
      ];
    }
  }
  return (
    <>
      <SpaceFrame
        cameraKey={props.cameraKey}
        extent={
          lesson.scene === 'torus'
            ? 7
            : lesson.scene === 'differentiability'
              ? 6.3
              : lesson.scene === 'gradient'
                ? 3.3
                : 4.5
        }
        target={
          lesson.scene === 'staircase'
            ? [0.55, 0.4, 1.15]
            : lesson.scene === 'gradient'
              ? [0.5, 0.4, 0.9]
              : lesson.scene === 'revolution'
                ? [0.5, 0, 0]
                : lesson.scene === 'torus'
                  ? [0, 0, 0]
                  : lesson.scene === 'differentiability'
                    ? [0, 0, 1]
                    : [0, 0, 0.5]
        }
      >
        {content}
      </SpaceFrame>
      {['gradient', 'revolution', 'shells'].includes(lesson.scene) && <ControlsInset {...props} />}
      <div className="scene-metrics">
        {metrics.map(([k, v]) => (
          <span key={k}>
            {k} <b>{fmt(v)}</b>
          </span>
        ))}
      </div>
      <div className="camera-hint">
        {lesson.scene === 'differentiability'
          ? 'Единый масштаб 1/r; начало перенесено в (a,f(a)). '
          : ''}
        Потяни, чтобы повернуть · колесо — масштаб
        {lesson.scene === 'lagrange' && step >= 2 ? ' · стрелки скорости ×0,55' : ''}
      </div>
    </>
  );
}
