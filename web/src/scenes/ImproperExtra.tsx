import type { SceneProps } from '../types';
import { Board, Curve, Dot, Seg, Fill, Label, Metrics, C } from './Plane';
import { graphSample } from '../models';
import { integrate, fmt } from '../math';
import {
  powerIntegral,
  powerLogConverges,
  logDensity,
  sinc,
  kernelDifference,
  dirichletKernel,
  oscillatoryIntegral,
  accumulated,
} from '../improper-models';

const m = (label: string, value: number | string, color?: string) => ({ label, value, color });
function Area({
  f,
  a,
  b,
  color = C.cyan,
}: {
  f: (x: number) => number;
  a: number;
  b: number;
  color?: string;
}) {
  return (
    <Fill points={[[a, 0], ...graphSample(f, a, b, 360), [b, 0]]} color={color} opacity={0.18} />
  );
}

function Benchmarks({ params: p, step, cameraKey }: SceneProps) {
  if (step < 2) {
    const nearZero = step === 1;
    const area = (L: number) =>
      nearZero ? powerIntegral(p.p, Math.exp(-L), 1) : powerIntegral(p.p, 1, Math.exp(L));
    const scale = Math.max(1, area(10));
    const converges = nearZero ? p.p < 1 : p.p > 1;
    return (
      <>
        <Board stretch x={[-0.2, 10.8]} y={[-0.12, 1.3]} reset={cameraKey}>
          <Curve points={graphSample((L) => area(L) / scale, 0, 10)} width={3} />
          <Seg a={[p.L, 0]} b={[p.L, area(p.L) / scale]} color={C.gold} dashed />
          <Dot
            p={[p.L, area(p.L) / scale]}
            label="площадь"
            color={C.gold}
            attach={p.L > 5 ? 'nw' : 'ne'}
          />
          <Label p={[5, 1.2]}>
            {nearZero ? 'L=−ln ε' : 'L=ln R'} · площадь / {fmt(scale)}
          </Label>
        </Board>
        <Metrics
          items={[
            m(nearZero ? 'ε' : 'R', Math.exp((nearZero ? -1 : 1) * p.L)),
            m('площадь', area(p.L), C.gold),
            m('p', p.p),
            m('интеграл', converges ? 'сходится' : 'расходится', converges ? C.cyan : C.red),
            ...(converges
              ? [
                  m('полная площадь', 1 / Math.abs(1 - p.p)),
                  m('остаётся', 1 / Math.abs(1 - p.p) - area(p.L)),
                ]
              : []),
          ]}
        />
      </>
    );
  }
  const start = Math.log(10),
    end = start + p.L;
  const f = (u: number) => logDensity(u, p.alpha, p.beta);
  const scale = Math.max(1e-12, ...graphSample(f, start, start + 10).map(([, y]) => y));
  return (
    <>
      <Board stretch x={[start - 0.6, start + 10.6]} y={[-0.12, 1.3]} reset={cameraKey}>
        <Area f={(u) => f(u) / scale} a={start} b={end} color={C.gold} />
        <Curve
          points={graphSample((u) => f(u) / scale, start, start + 10)}
          color={C.gold}
          width={3}
        />
        <Seg a={[end, 0]} b={[end, f(end) / scale]} color={C.cyan} />
        <Dot
          p={[end, f(end) / scale]}
          label="u=ln R"
          color={C.cyan}
          attach={p.L > 5 ? 'nw' : 'ne'}
        />
        <Label p={[start + 5, 1.18]}>u=ln x · плотность / {fmt(scale)}</Label>
      </Board>
      <Metrics
        items={[
          m('α', p.alpha),
          m('β', p.beta),
          m('∫₁₀ᴿ f ≈', integrate(f, start, end), C.gold),
          m(
            'сходимость',
            powerLogConverges(p.alpha, p.beta) ? 'да' : 'нет',
            powerLogConverges(p.alpha, p.beta) ? C.cyan : C.red,
          ),
        ]}
      />
    </>
  );
}

function Comparison({ params: p, step, cameraKey }: SceneProps) {
  const f = (x: number) => (step === 2 ? -1 / x : 1 / (1 + x * x));
  const g = (x: number) => (step === 2 ? 0 : 1 / (x * x));
  const exact = Math.atan(p.R) - Math.PI / 4;
  return (
    <>
      <Board stretch x={[0.5, p.R + 0.5]} y={[-1.15, 1.35]} reset={cameraKey}>
        <Area f={g} a={1} b={p.R} color={C.gold} />
        <Area f={f} a={1} b={p.R} color={step === 2 ? C.red : C.cyan} />
        {step === 3 && <Area f={f} a={1} b={2} color={C.purple} />}
        <Curve points={graphSample(g, 1, p.R)} color={C.gold} />
        <Curve points={graphSample(f, 1, p.R)} color={step === 2 ? C.red : C.cyan} width={3} />
        {step === 1 && (
          <Curve points={graphSample((x) => (x * x) / (1 + x * x), 1, p.R)} color={C.purple} />
        )}
        {step === 3 && <Seg a={[2, -0.2]} b={[2, 1.1]} color={C.purple} dashed />}
        <Seg a={[p.R, 0]} b={[p.R, f(p.R)]} color={C.white} />
        <Label p={[(1 + p.R) / 2, 1.2]}>
          {step === 2
            ? 'f=−1/x ≤ g=0'
            : step === 1
              ? 'f/g = x²/(1+x²) — фиолетовый'
              : 'f=1/(1+x²) ≤ g=1/x²'}
        </Label>
      </Board>
      <Metrics
        items={
          step === 2
            ? [
                m('∫ f', -Math.log(p.R), C.red),
                m('∫ g', 0, C.gold),
                m('неотрицательность f', 'нарушена'),
              ]
            : [
                m('∫₁ᴿ f', exact, C.cyan),
                m('∫₁ᴿ g', 1 - 1 / p.R, C.gold),
                ...(step === 1 ? [m('f(R)/g(R)', (p.R * p.R) / (1 + p.R * p.R), C.purple)] : []),
                ...(step === 3
                  ? [
                      m('∫₁² f', Math.atan(2) - Math.PI / 4, C.purple),
                      m('∫₂ᴿ f', Math.atan(p.R) - Math.atan(2)),
                    ]
                  : []),
              ]
        }
      />
    </>
  );
}

function Oscillatory({ params: p, step, cameraKey }: SceneProps) {
  const local = step === 2 || step === 3,
    abel = step === 4;
  const a = local ? 2 * Math.PI * p.k : 1;
  const b = local ? a + (step === 2 ? Math.PI : 4 * Math.PI) : p.R;
  const f = (x: number) => (Math.sin(x) / x ** p.p) * (abel ? 1 + 1 / x : 1);
  const scale = local ? a ** -p.p : 1;
  const integral = oscillatoryIntegral(a, b, p.p) + (abel ? oscillatoryIntegral(a, b, p.p + 1) : 0);
  const absolute =
    oscillatoryIntegral(a, b, p.p, true) + (abel ? oscillatoryIntegral(a, b, p.p + 1, true) : 0);
  const signed = accumulated(f, a, b, 500);
  const abs = accumulated((x) => Math.abs(f(x)), a, b, 500);
  const maxArea = Math.max(1, absolute * 1.1);
  return (
    <>
      <div className="dual-boards">
        <div>
          <div className="pane-title">
            {local
              ? `Хвост от A=${fmt(a)} · высоты ×${fmt(1 / scale)}`
              : 'Подынтегральная функция: знаки площади'}
          </div>
          <Board stretch x={[a - 0.2, b + 0.2]} y={[-1.35, abel ? 2.1 : 1.35]} reset={cameraKey}>
            <Area f={(x) => Math.max(0, f(x) / scale)} a={a} b={b} />
            <Area f={(x) => Math.min(0, f(x) / scale)} a={a} b={b} color={C.red} />
            <Curve points={graphSample((x) => f(x) / scale, a, b, 650)} width={2.5} />
            <Dot p={[b, f(b) / scale]} color={C.gold} />
          </Board>
        </div>
        <div>
          <div className="pane-title">
            {step === 3
              ? 'Первообразная sin x: F(x)=cos A−cos x'
              : 'Накопленная площадь: ∫f и ∫|f|'}
          </div>
          <Board
            stretch
            x={[a - 0.2, b + 0.2]}
            y={step === 3 ? [-0.25, 2.4] : [-0.5, maxArea]}
            reset={cameraKey}
          >
            {step === 3 ? (
              <>
                <Curve
                  points={graphSample((x) => Math.cos(a) - Math.cos(x), a, b, 400)}
                  color={C.purple}
                />
                <Seg a={[a, 2]} b={[b, 2]} color={C.gold} dashed />
                <Label p={[(a + b) / 2, 2.2]}>|F(x)| ≤ 2</Label>
              </>
            ) : (
              <>
                <Curve points={abs} color={C.gold} />
                <Curve points={signed} color={C.cyan} width={3} />
                <Dot p={[b, integral]} color={C.cyan} />
                <Dot p={[b, absolute]} color={C.gold} />
              </>
            )}
          </Board>
        </div>
      </div>
      <Metrics
        items={[
          m('∫ f ≈', integral, C.cyan),
          m('∫ |f| ≈', absolute, C.gold),
          ...(step === 0
            ? [
                m('∫ f⁺ ≈', (absolute + integral) / 2),
                m('∫ f⁻ ≈', (absolute - integral) / 2, C.red),
              ]
            : []),
          ...(step === 1
            ? [m('класс', p.p > 1 ? 'абсолютно' : p.p > 0 ? 'условно' : 'расходится')]
            : []),
          ...(step === 2 ? [m('площадь полуволны', '2 при любом k'), m('A→∞', a)] : []),
          ...(step === 3
            ? [m('граница 2/Aᵖ', 2 / a ** p.p, C.gold), m('g(A)=A⁻ᵖ', a ** -p.p)]
            : []),
          ...(abel
            ? [m('∫ f/x ≈', oscillatoryIntegral(a, b, 2), C.purple), m('g(R)→1', 1 + 1 / b)]
            : []),
        ]}
      />
    </>
  );
}

function SineIntegral({ params: p, step, cameraKey }: SceneProps) {
  const lambda = p.n + 0.5;
  if (step === 0) {
    const values = accumulated(sinc, 0, p.R, 600);
    const value = values[values.length - 1][1];
    return (
      <>
        <div className="dual-boards">
          <div>
            <div className="pane-title">sin x/x; значение в нуле — 1</div>
            <Board stretch x={[-0.2, p.R + 0.5]} y={[-0.5, 1.2]} reset={cameraKey}>
              <Area f={(x) => Math.max(0, sinc(x))} a={0} b={p.R} />
              <Area f={(x) => Math.min(0, sinc(x))} a={0} b={p.R} color={C.red} />
              <Curve points={graphSample(sinc, 0, p.R, 700)} />
              <Dot p={[p.R, sinc(p.R)]} color={C.gold} />
            </Board>
          </div>
          <div>
            <div className="pane-title">Интеграл до подвижной границы</div>
            <Board stretch x={[-0.2, p.R + 0.5]} y={[-0.1, 2.1]} reset={cameraKey}>
              <Seg a={[0, Math.PI / 2]} b={[p.R, Math.PI / 2]} color={C.gold} dashed />
              <Curve points={values} width={3} />
              <Dot p={[p.R, value]} color={C.cyan} />
              <Label p={[p.R * 0.7, 1.95]}>π/2</Label>
            </Board>
          </div>
        </div>
        <Metrics
          items={[
            m('∫₀ᴿ sin x/x ≈', value),
            m('π/2', Math.PI / 2, C.gold),
            m('модуль ошибки ≈', Math.abs(value - Math.PI / 2)),
            m('граница 2/R', 2 / p.R),
          ]}
        />
      </>
    );
  }
  const error = (x: number) => kernelDifference(x) * Math.sin(lambda * x);
  const difference = integrate(error, 0, Math.PI, 64 * p.n);
  return (
    <>
      <Board
        stretch
        x={[-0.1, Math.PI + 0.15]}
        y={step === 1 ? [-0.4, 1.25] : [-0.24, 0.24]}
        reset={cameraKey}
      >
        {step === 1 ? (
          <>
            <Curve
              points={graphSample((x) => dirichletKernel(x, p.n) / lambda, 0, Math.PI, 800)}
              color={C.gold}
              width={3}
            />
            <Curve points={graphSample((x) => sinc(lambda * x), 0, Math.PI, 800)} color={C.cyan} />
            <Label p={[Math.PI / 2, 1.14]}>Dₙ/λ — жёлтый · sin(λx)/(λx) — голубой</Label>
          </>
        ) : (
          <>
            <Area f={(x) => Math.max(0, error(x))} a={0} b={Math.PI} />
            <Area f={(x) => Math.min(0, error(x))} a={0} b={Math.PI} color={C.red} />
            <Curve points={graphSample(error, 0, Math.PI, 800)} />
            <Curve points={graphSample(kernelDifference, 0, Math.PI)} color={C.purple} dashed />
            <Curve
              points={graphSample((x) => -kernelDifference(x), 0, Math.PI)}
              color={C.purple}
              dashed
            />
            <Label p={[1.45, 0.217]}>h(x) sin(λx) · огибающие ±|h(x)|</Label>
          </>
        )}
      </Board>
      <Metrics
        items={[
          m('λ=n+½', lambda),
          m('∫₀π Dₙ', Math.PI / 2, C.gold),
          m('∫₀λπ sinc ≈', Math.PI / 2 + difference, C.cyan),
          m('разность ≈', difference),
          ...(step === 2 ? [m('граница |разности|', (0.5 - 1 / Math.PI) / lambda, C.purple)] : []),
        ]}
      />
    </>
  );
}

export default function ImproperExtra(props: SceneProps) {
  switch (props.lesson.scene) {
    case 'improper-benchmarks':
      return <Benchmarks {...props} />;
    case 'improper-comparison':
      return <Comparison {...props} />;
    case 'oscillatory-integral':
      return <Oscillatory {...props} />;
    case 'sine-integral':
      return <SineIntegral {...props} />;
    default:
      return null;
  }
}
