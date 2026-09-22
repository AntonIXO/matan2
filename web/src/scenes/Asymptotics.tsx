import type { SceneProps } from '../types';
import { Board, Curve, Dot, Seg, Label, Fill, Metrics, C } from './Plane';
import { Area } from './Calculus';
import { graphSample } from '../models';
import { fmt, integrate, type V2 } from '../math';
import {
  EULER_GAMMA,
  harmonic,
  harmonicRemainder,
  logFactorial,
  stirlingConstant,
  wallisFactorials,
  primitiveFunction,
  primitiveArea,
  piBoundLog,
  piDensity,
} from '../asymptotic-models';

const integers = Array.from({ length: 60 }, (_, i) => i + 1);
const points = (f: (n: number) => number, n = 60): V2[] =>
  integers.slice(0, n).map((k) => [k, f(k)]);

function Primitives({ params: p, step }: SceneProps) {
  const alpha = step === 3 ? p.alpha : 1;
  const f = (x: number) => primitiveFunction(p.kind, alpha * x);
  const F = (x: number) => primitiveArea(p.kind, alpha * x) / alpha + p.c;
  const value = F(p.x),
    slope = f(p.x);
  return (
    <>
      <div className="dual-boards">
        <div>
          <div className="pane-title">f(x) · высота</div>
          <Board stretch x={[-1.8, 1.8]} y={[-3.2, 3.4]}>
            {step === 2 && <Area f={f} a={0} b={p.x} color={C.gold} />}
            <Curve points={graphSample(f, -1.7, 1.7)} />
            <Seg a={[p.x, 0]} b={[p.x, slope]} color={C.gold} />
            <Dot p={[p.x, slope]} color={C.gold} />
            <Label p={[0, 3]}>
              {step === 3
                ? ['αx', 'sin(αx)', '1/(1+(αx)²)'][p.kind]
                : ['x', 'sin x', '1/(1+x²)'][p.kind]}
            </Label>
          </Board>
        </div>
        <div>
          <div className="pane-title">F(x) · наклон касательной</div>
          <Board stretch x={[-1.8, 1.8]} y={[-3.2, 3.4]}>
            {step === 1 && (
              <Curve
                points={graphSample((x) => primitiveArea(p.kind, x), -1.7, 1.7)}
                color={C.muted}
                dashed
              />
            )}
            <Curve points={graphSample(F, -1.7, 1.7)} color={C.purple} />
            <Seg
              a={[p.x - 0.5, value - slope * 0.5]}
              b={[p.x + 0.5, value + slope * 0.5]}
              color={C.gold}
            />
            <Dot p={[p.x, value]} color={C.white} />
          </Board>
        </div>
      </div>
      <Metrics
        items={[
          { label: 'x', value: p.x },
          { label: 'f(αx)', value: slope, color: C.gold },
          { label: 'F′(x)', value: slope, color: C.gold },
          { label: 'F(x)', value },
          { label: 'C', value: p.c },
        ]}
      />
    </>
  );
}

function Harmonic({ params: p, step, cameraKey }: SceneProps) {
  const n = Math.round(p.n),
    diff = harmonicRemainder(n);
  const residual = (k: number) => k * (harmonicRemainder(k) - EULER_GAMMA);
  const kernel = (x: number) => {
    const t = x - Math.floor(x);
    return (t * (1 - t)) / x ** 3;
  };
  const f = step === 0 ? harmonic : step === 1 ? harmonicRemainder : residual;
  const range: V2 = step === 0 ? [0, 5.3] : step === 1 ? [0.54, 1.03] : [0.36, 0.52];
  return (
    <>
      {step === 2 ? (
        <Board stretch x={[0.8, 8.3]} y={[-0.005, 0.1]} reset={cameraKey}>
          <Area f={kernel} a={1} b={n} color={C.gold} />
          <Curve points={graphSample(kernel, 1, 8, 600)} color={C.gold} />
          <Seg a={[n, 0]} b={[n, 0.09]} color={C.white} />
          <Label p={[4.5, 0.085]}>{'{x}(1−{x})/x³'}</Label>
        </Board>
      ) : (
        <Board stretch x={[0, 62]} y={range} reset={cameraKey}>
          {step === 0 ? (
            <>
              <Curve points={graphSample(Math.log, 1, 60)} color={C.gold} />
              <Seg a={[n, Math.log(n)]} b={[n, harmonic(n)]} color={C.white} />
            </>
          ) : (
            <Seg
              a={[1, step === 1 ? EULER_GAMMA : 0.5]}
              b={[60, step === 1 ? EULER_GAMMA : 0.5]}
              color={C.gold}
              dashed
            />
          )}
          {step === 3 && <Curve points={points((k) => 0.5 - 1 / (8 * k))} color={C.purple} />}
          <Curve points={points(f)} color={C.muted} dashed />
          <Curve points={points(f, n)} width={3} />
          <Dot p={[n, f(n)]} color={C.white} />
        </Board>
      )}
      <Metrics
        items={
          step === 2
            ? [
                { label: 'n', value: n },
                { label: '∫₁ⁿ ядро', value: fmt(diff - 0.5 - 1 / (2 * n), 6), color: C.gold },
                { label: 'хвост ≤', value: fmt(1 / (8 * n * n), 6) },
              ]
            : [
                { label: 'n', value: n },
                { label: 'Hₙ', value: harmonic(n) },
                { label: 'Hₙ−ln n', value: fmt(diff, 6) },
                {
                  label: step === 3 ? 'n(Hₙ−ln n−γ)' : 'γ ≈',
                  value: fmt(step === 3 ? residual(n) : EULER_GAMMA, 6),
                  color: C.gold,
                },
              ]
        }
      />
    </>
  );
}

function Stirling({ params: p, step, cameraKey }: SceneProps) {
  const n = Math.round(p.n),
    c = 0.5 * Math.log(2 * Math.PI);
  const leading = (k: number) => k * Math.log(k) - k + 1;
  const f =
    step === 0
      ? logFactorial
      : step === 1
        ? stirlingConstant
        : step === 2
          ? wallisFactorials
          : (k: number) => Math.exp(stirlingConstant(k) - c);
  const target = step === 1 ? c : step === 2 ? Math.sqrt(Math.PI) : 1;
  const range: V2 =
    step === 0 ? [-3, 195] : step === 1 ? [0.91, 1.01] : step === 2 ? [1.74, 2.03] : [0.995, 1.09];
  return (
    <>
      <Board stretch x={[0, 62]} y={range} reset={cameraKey}>
        <Curve points={points(f)} color={C.muted} dashed />
        <Curve points={points(f, n)} width={3} color={step === 2 ? C.gold : C.cyan} />
        {step === 0 ? (
          <>
            <Curve points={points(leading)} color={C.gold} />
            <Seg a={[n, leading(n)]} b={[n, logFactorial(n)]} color={C.white} />
          </>
        ) : (
          <Seg a={[1, target]} b={[60, target]} color={C.purple} dashed />
        )}
        {step === 2 && (
          <Curve
            points={points((k) => Math.exp(stirlingConstant(k)) / Math.SQRT2, n)}
            color={C.cyan}
          />
        )}
        <Dot p={[n, f(n)]} color={C.white} />
      </Board>
      <Metrics
        items={[
          { label: 'n', value: n },
          {
            label: ['ln(n!)', 'cₙ', 'отношение Валлиса', 'n! / приближение'][step],
            value: fmt(f(n), 6),
          },
          {
            label: step === 0 ? 'интеграл ln x' : 'предел',
            value: fmt(step === 0 ? leading(n) : target, 6),
            color: C.purple,
          },
          { label: 'rₙ', value: fmt(stirlingConstant(n) - c, 6) },
        ]}
      />
    </>
  );
}

function PiIrrational({ params: p, step, cameraKey }: SceneProps) {
  const n = Math.round(p.n);
  const logBound = piBoundLog(n, p.q);
  const bottom = Math.min(-80, piBoundLog(150, p.q) - 10);
  const boundCurve: V2[] = Array.from({ length: 151 }, (_, k) => [k, piBoundLog(k, p.q)]);
  return (
    <>
      {step === 0 ? (
        <Board stretch x={[-1.75, 1.75]} y={[-0.1, 3.3]} reset={cameraKey}>
          <Area f={(x) => piDensity(n, x)} a={-Math.PI / 2} b={Math.PI / 2} color={C.gold} />
          <Curve
            points={graphSample((x) => piDensity(n, x), -Math.PI / 2, Math.PI / 2, 240)}
            color={C.gold}
          />
        </Board>
      ) : (
        <Board stretch x={[0, 150]} y={[bottom, 35]} reset={cameraKey}>
          {step === 2 && (
            <Fill
              points={[
                [0, bottom],
                [150, bottom],
                [150, 0],
                [0, 0],
              ]}
              color={C.red}
              opacity={0.1}
            />
          )}
          <Seg a={[0, 0]} b={[150, 0]} color={C.gold} />
          <Curve points={boundCurve} color={C.muted} dashed />
          <Curve points={boundCurve.slice(0, n + 1)} color={C.cyan} width={3} />
          <Seg a={[n, 0]} b={[n, logBound]} color={logBound < 0 ? C.red : C.white} />
          <Dot p={[n, logBound]} color={C.white} />
          <Label p={[75, 25]}>ln Bₙ · линия 0 означает Bₙ=1</Label>
        </Board>
      )}
      <Metrics
        items={
          step === 0
            ? [
                { label: 'n', value: n },
                {
                  label: 'Hₙ > 0',
                  value: integrate(
                    (x) => piDensity(n, x),
                    -Math.PI / 2,
                    Math.PI / 2,
                    512,
                  ).toExponential(4),
                },
              ]
            : [
                { label: 'n', value: n },
                { label: 'q', value: p.q },
                { label: 'ln Bₙ', value: logBound },
                { label: 'Bₙ', value: Math.exp(logBound).toExponential(3) },
                {
                  label: 'положение границы',
                  value: logBound < 0 ? 'Bₙ < 1' : 'Bₙ ≥ 1',
                  color: logBound < 0 ? C.red : C.gold,
                },
              ]
        }
      />
    </>
  );
}

export default function Asymptotics(props: SceneProps) {
  if (props.lesson.scene === 'pi-irrational') return <PiIrrational {...props} />;
  return props.lesson.scene === 'primitives' ? (
    <Primitives {...props} />
  ) : props.lesson.scene === 'stirling' ? (
    <Stirling {...props} />
  ) : (
    <Harmonic {...props} />
  );
}
