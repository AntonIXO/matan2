import MovablePoint from '../AccessiblePoint';
import { Circle } from 'mafs';
import type { SceneProps } from '../types';
import { Board, Curve, Dot, Seg, Fill, Label, Arrow, Metrics, sample, C } from './Plane';
import { add, sub, mul, norm, dot, clamp, F, A, TAU, fmt, linspace, type V2 } from '../math';
import { lp, unitP, fixedMap, hexBoard, hexPath, hexCenter, graphSample } from '../models';
const m = (label: string, value: number | string, color?: string) => ({ label, value, color });
function Topology({ params: p, step, onParam, cameraKey }: SceneProps) {
  const q: V2 = [p.x, p.y],
    len = norm(q),
    n = Math.max(2, Math.round(p.n)),
    seq: V2 = [1 / n, (-1) ** n / n],
    boundary: V2 = [1 - 1 / n, 0],
    current = step === 3 ? seq : step === 4 ? boundary : q;
  return (
    <>
      <Board x={[-1.8, 1.8]} y={[-1.7, 1.7]} reset={cameraKey}>
        {step >= 1 && (
          <Circle
            center={[0, 0]}
            radius={1}
            color={C.cyan}
            strokeStyle={step === 4 ? 'solid' : 'dashed'}
            fillOpacity={0.07}
          />
        )}
        {step === 0 && (
          <>
            <Arrow b={q} />
            <Seg a={[q[0], 0]} b={q} color={C.purple} dashed />
            <Seg a={[0, q[1]]} b={q} color={C.purple} dashed />
            <Arrow b={[q[0], 0]} color={C.cyan} />
            <Arrow b={[0, q[1]]} color={C.purple} />
          </>
        )}
        {step === 2 && (
          <Circle
            center={q}
            radius={p.r}
            strokeStyle="dashed"
            fillOpacity={0.16}
            color={len + p.r <= 1 ? C.gold : C.red}
          />
        )}
        {step === 3 &&
          Array.from({ length: n - 1 }, (_, i) => {
            const k = i + 2;
            return <Dot key={k} p={[1 / k, (-1) ** k / k]} color={k === n ? C.gold : C.muted} />;
          })}
        {step === 4 && (
          <>
            <Dot p={[1, 0]} label="a=(1,0)" color={C.purple} />
            {Array.from({ length: n - 1 }, (_, i) => {
              const k = i + 2;
              return <Dot key={k} p={[1 - 1 / k, 0]} color={k === n ? C.gold : C.muted} />;
            })}
            <Circle
              center={[1, 0]}
              radius={p.r}
              color={C.gold}
              strokeStyle="dashed"
              fillOpacity={0.07}
            />
          </>
        )}
        {step < 3 ? (
          <MovablePoint
            label="Точка x"
            point={q}
            onMove={([x, y]) => {
              onParam('x', clamp(x, -1.5, 1.5));
              onParam('y', clamp(y, -1.5, 1.5));
            }}
            color={C.gold}
          />
        ) : (
          <Dot p={current} color={C.gold} />
        )}
      </Board>
      <Metrics
        items={
          step < 3
            ? [
                m('‖x‖', len),
                m('x ∈ B(0,1)', len < 1 ? 'да' : 'нет'),
                ...(step === 2
                  ? [
                      m(
                        'B(x,r) ⊂ B(0,1)',
                        len + p.r <= 1 ? 'да' : 'нет',
                        len + p.r <= 1 ? C.gold : C.red,
                      ),
                    ]
                  : []),
              ]
            : step === 3
              ? [m('x₁⁽ⁿ⁾', seq[0]), m('x₂⁽ⁿ⁾', seq[1]), m('‖x⁽ⁿ⁾‖', norm(seq))]
              : [m('‖x⁽ⁿ⁾−a‖', 1 / n), m('a ∈ B(0,1)', 'нет'), m('a ∈ замыкании', 'да')]
        }
      />
    </>
  );
}
function Compactness({ params: p, step, cameraKey }: SceneProps) {
  const n = Math.round(p.n),
    centers = linspace(-1, 1, 4),
    x = (-1) ** n * (1 - 1 / n);
  return (
    <>
      <Board x={[-1.9, 1.9]} y={[-1.3, 1.3]} axes={false} reset={cameraKey}>
        {step < 2 && (
          <>
            {centers.map((c, i) => (
              <Circle
                key={i}
                center={[c, 0]}
                radius={p.r}
                color={C.cyan}
                fillOpacity={0.1}
                strokeStyle="dashed"
              />
            ))}
            {step === 0 &&
              [-0.75, -0.25, 0.25, 0.75].map((c) => (
                <Circle
                  key={c}
                  center={[c, 0.1]}
                  radius={p.r}
                  color={C.muted}
                  fillOpacity={0.03}
                  strokeStyle="dashed"
                />
              ))}
          </>
        )}
        <Seg a={[-1, 0]} b={[1, 0]} color={C.gold} />
        {[-1, 1].map((x) =>
          step === 3 ? (
            <Circle
              key={x}
              center={[x, 0]}
              radius={0.04}
              color={C.gold}
              fillOpacity={1}
              svgEllipseProps={{ style: { fill: '#0d1520' } }}
            />
          ) : (
            <Dot key={x} p={[x, 0]} color={C.gold} />
          ),
        )}
        {step >= 2 && (
          <>
            {Array.from({ length: n - 1 }, (_, i) => {
              const k = i + 2;
              return (
                <Dot
                  key={k}
                  p={[(-1) ** k * (1 - 1 / k), 0]}
                  color={k % 2 === 0 ? C.purple : C.muted}
                />
              );
            })}
            <Dot p={[x, 0]} label={'x' + n} color={C.white} />
            <Arrow a={[0.35, 0.6]} b={[0.95, 0.6]} color={C.purple} />
            <Label p={[0.3, 0.86]} color={C.purple}>
              чётные члены → 1
            </Label>
          </>
        )}
        <Label p={[0, -0.85]}>
          {step === 3 ? 'K = (−1,1): предел отсутствует' : 'K = [−1,1] × {0}'}
        </Label>
      </Board>
      <Metrics
        items={
          step < 2
            ? [
                m('r', p.r),
                m('максимум до ближайшего центра', 0.25),
                m('покрытие', p.r > 0.25 ? 'да' : 'нет'),
              ]
            : [
                m('xₙ', x),
                m('чётная подпоследовательность →', '1'),
                m('предел ∈ K', step === 3 ? 'нет' : 'да'),
              ]
        }
      />
    </>
  );
}
function Jacobian({ params: p, step, cameraKey }: SceneProps) {
  const u: V2 = [Math.cos(p.angle), Math.sin(p.angle)],
    h = mul(u, p.h),
    real = F(h),
    linear = A(h),
    normalized = step > 0 && step < 4,
    q = normalized ? mul(real, 1 / p.h) : real,
    l = normalized ? A(u) : linear;
  return (
    <>
      <Board x={[-1.65, 1.65]} y={[-1.6, 1.6]} reset={cameraKey}>
        {linspace(-0.8, 0.8, 6).flatMap((v, i) => [
          <Curve
            key={'x' + i}
            points={linspace(-0.8, 0.8, 24).map((x) => A([x, v]))}
            color={C.grid}
            width={1}
          />,
          <Curve
            key={'y' + i}
            points={linspace(-0.8, 0.8, 24).map((y) => A([v, y]))}
            color={C.grid}
            width={1}
          />,
        ])}
        <Arrow b={normalized ? u : h} color={C.muted} />
        <Arrow b={l} color={C.gold} />
        <Arrow b={q} color={C.cyan} />
        <Seg a={l} b={q} color={C.red} />
        <Dot p={q} label={normalized ? 'F(tu)/t' : 'F(h)'} color={C.cyan} />
        <Dot p={l} label={normalized ? 'Au' : 'Ah'} color={C.gold} attach="se" />
        <Seg a={q} b={[q[0], 0]} color={C.purple} dashed />
        <Seg a={q} b={[0, q[1]]} color={C.purple} dashed />
      </Board>
      <Metrics
        items={[
          m(normalized ? 'f₁(tu)/t' : 'f₁(h)', q[0]),
          m(normalized ? 'f₂(tu)/t' : 'f₂(h)', q[1]),
          m('‖r(h)‖ / ‖h‖', norm(sub(real, linear)) / p.h, C.red),
        ]}
      />
      <div className="board-hint">
        {normalized
          ? 'Координаты выхода делятся на t; серый вектор — u'
          : 'Серый — h; жёлтый — Ah; бирюзовый — F(h)'}
      </div>
    </>
  );
}
function Products({ params: p, step, cameraKey }: SceneProps) {
  const h = p.h,
    base: V2 = [1, 1],
    f: V2 = [1 + h, 1 - h],
    exact = mul(f, 1 + h),
    linear: V2 = [1 + 2 * h, 1],
    res = sub(exact, linear);
  return (
    <>
      <Board x={[-0.9, 3.3]} y={[-1.1, 2.2]} reset={cameraKey}>
        <Arrow b={base} color={C.muted} />
        <Arrow b={f} color={C.purple} />
        <Arrow b={exact} color={C.cyan} />
        <Dot p={exact} label="λ(t)F(t)" color={C.cyan} />
        {step >= 1 && (
          <>
            <Arrow a={base} b={add(base, mul(base, h))} color={C.gold} />
            <Arrow a={add(base, mul(base, h))} b={linear} color={C.gold} />
            <Dot p={linear} label="линейное" color={C.gold} attach="se" />
          </>
        )}
        {step >= 2 && <Arrow a={linear} b={exact} color={C.red} />}
        <Dot p={base} label="λ(0)F(0)" color={C.muted} attach="nw" />
        {step === 3 && <Label p={[1.2, -0.6]}>‖F(t)‖² = 2+2t²; линейный член в 0 равен 0</Label>}
      </Board>
      <Metrics
        items={[
          m('t', h),
          m('‖r(t)‖', norm(res), C.red),
          m('‖r(t)‖ / |t|', h === 0 ? 'предел 0' : norm(res) / Math.abs(h)),
          ...(step === 3 ? [m('‖F(t)‖²', dot(f, f))] : []),
        ]}
      />
    </>
  );
}
function Cantor({ params: p, cameraKey }: SceneProps) {
  const delta = p.eps / 2,
    x = p.x,
    y = clamp(x + p.ratio * delta, 0, 1);
  return (
    <>
      <Board x={[-0.12, 1.12]} y={[-0.12, 1.2]} stretch reset={cameraKey}>
        <Fill
          points={[
            [0, x * x - p.eps],
            [1, x * x - p.eps],
            [1, x * x + p.eps],
            [0, x * x + p.eps],
          ]}
          color={C.gold}
          opacity={0.08}
        />
        <Fill
          points={[
            [Math.max(0, x - delta), 0],
            [Math.min(1, x + delta), 0],
            [Math.min(1, x + delta), 1.2],
            [Math.max(0, x - delta), 1.2],
          ]}
          color={C.purple}
          opacity={0.12}
        />
        <Curve points={graphSample((t) => t * t, 0, 1)} width={3} />
        <Dot p={[x, x * x]} label="(x,f(x))" color={C.gold} />
        <Dot p={[y, y * y]} label="(y,f(y))" color={C.cyan} />
        <Seg a={[x, x * x]} b={[y, x * x]} color={C.white} />
        <Seg a={[y, x * x]} b={[y, y * y]} color={C.red} />
      </Board>
      <Metrics
        items={[
          m('δ=ε/2', delta, C.purple),
          m('|x−y|', Math.abs(x - y)),
          m('|f(x)−f(y)|', Math.abs(x * x - y * y), C.red),
          m('ε', p.eps, C.gold),
        ]}
      />
    </>
  );
}
function Brouwer({ params: p, step, onParam, cameraKey }: SceneProps) {
  if (step >= 2) {
    const board = hexBoard(p.seed),
      found = hexPath(board),
      path = new Set(found.path);
    return (
      <>
        <Board x={[-1.1, 10]} y={[-1, 6.5]} axes={false} reset={cameraKey}>
          {board.map((color, i) => {
            const q = hexCenter(i);
            return (
              <Fill
                key={i}
                points={linspace(0, TAU, 6)
                  .slice(0, 6)
                  .map((a) =>
                    add(q, mul([Math.cos(a + Math.PI / 6), Math.sin(a + Math.PI / 6)], 0.55)),
                  )}
                color={color ? C.gold : C.cyan}
                opacity={path.has(i) ? 0.75 : 0.2}
              />
            );
          })}
          <Curve points={found.path.map((i) => hexCenter(i))} color={C.white} width={4} />
          <Dot p={hexCenter(found.path[0])} color={C.white} />
          <Dot p={hexCenter(found.path[found.path.length - 1])} color={C.white} />
          <Seg a={[-0.65, 0]} b={[2.35, 5.2]} color={C.cyan} />
          <Seg a={[6.65, 0]} b={[9.65, 5.2]} color={C.cyan} />
          <Seg a={[0, -0.65]} b={[6, -0.65]} color={C.gold} />
          <Seg a={[3, 5.85]} b={[9, 5.85]} color={C.gold} />
        </Board>
        <Metrics
          items={[
            m('цвет пути', found.color ? 'золотой' : 'бирюзовый'),
            m('узлов в пути', found.path.length),
            m('соседство', '6 соседей'),
          ]}
        />
      </>
    );
  }
  const q: V2 = [p.x, p.y],
    f = fixedMap(q);
  return (
    <>
      <Board x={[-0.2, 1.2]} y={[-0.2, 1.2]} reset={cameraKey}>
        <Fill
          points={[
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ]}
          opacity={0.04}
        />
        {linspace(0.05, 0.95, 7).flatMap((x, i) =>
          linspace(0.05, 0.95, 7).map((y, j) => (
            <Arrow
              key={i + '-' + j}
              a={[x, y]}
              b={add([x, y], mul(sub(fixedMap([x, y]), [x, y]), 0.2))}
              color={C.muted}
            />
          )),
        )}
        <Arrow a={q} b={f} color={C.gold} />
        <Dot p={f} label="F(x)" color={C.gold} />
        <MovablePoint
          label="Точка x"
          point={q}
          onMove={([x, y]) => {
            onParam('x', clamp(x, 0, 1));
            onParam('y', clamp(y, 0, 1));
          }}
          color={C.cyan}
        />
        {step >= 1 && <Dot p={[0.2, 0.6]} label="F(x*)=x*" color={C.purple} />}
      </Board>
      <Metrics
        items={[m('‖F(x)−x‖', norm(sub(f, q)), C.gold), m('неподвижная точка', '(0,2; 0,6)')]}
      />
      <div className="board-hint">Серое поле: смещение ×0,2 · выбранная стрелка: ×1</div>
    </>
  );
}
function Norms({ params: p, step, cameraKey }: SceneProps) {
  const a: V2 = [0.7, 0.2],
    b: V2 = [0.65 * Math.cos(p.angle), 0.65 * Math.sin(p.angle)],
    sum = add(a, b),
    q = p.p === 1 ? Infinity : p.p / (p.p - 1),
    lhs = Math.abs(a[0] * b[0]) + Math.abs(a[1] * b[1]),
    rhs = lp(a, p.p) * lp(b, q);
  return (
    <>
      <Board x={[-1.7, 2.5]} y={[-1.7, 1.7]} reset={cameraKey}>
        <Fill points={sample((t) => unitP(t, p.p))} opacity={0.05} />
        <Curve points={sample((t) => unitP(t, p.p))} width={3} />
        {step >= 1 && (
          <>
            <Arrow b={a} color={C.gold} />
            <Arrow a={a} b={sum} color={C.purple} />
            <Arrow b={sum} color={C.cyan} />
            <Dot p={a} label="a" color={C.gold} />
            <Dot p={sum} label="a+b" color={C.cyan} />
          </>
        )}
        {step >= 2 && (
          <>
            <Arrow b={b} color={C.purple} />
            <Dot p={b} label="b" color={C.purple} />
          </>
        )}
        {step === 3 && (
          <>
            {[a, b].map((v, i) => (
              <g key={i}>
                {v.map((value, k) => (
                  <Fill
                    key={k}
                    points={[
                      [1.6 + k * 0.3, -0.6 + i * 1.1],
                      [1.6 + k * 0.3, -0.6 + i * 1.1 + value * 0.65],
                      [1.9 + k * 0.3, -0.6 + i * 1.1 + value * 0.65],
                      [1.9 + k * 0.3, -0.6 + i * 1.1],
                    ]}
                    color={i ? C.purple : C.gold}
                    opacity={0.3}
                  />
                ))}
                <Label p={[1.9, -0.85 + i * 1.1]}>{i ? 'g: b₁, b₂' : 'f: a₁, a₂'}</Label>
              </g>
            ))}
          </>
        )}
      </Board>
      <Metrics
        items={
          step < 2
            ? [
                m('p', p.p),
                m('‖a+b‖ₚ', lp(sum, p.p)),
                m('‖a‖ₚ+‖b‖ₚ', lp(a, p.p) + lp(b, p.p), C.gold),
              ]
            : [
                m('p', p.p),
                m('q', q === Infinity ? '∞' : q),
                m('Σ|aᵢbᵢ|', lhs),
                m('‖a‖ₚ‖b‖q', rhs, C.gold),
              ]
        }
      />
      {step === 3 && (
        <div className="board-hint">
          Справа — ступенчатые функции; каждый интервал имеет длину 1 (масштаб рисунка ×0,3)
        </div>
      )}
    </>
  );
}
export default function Abstract(props: SceneProps) {
  switch (props.lesson.scene) {
    case 'topology':
      return <Topology {...props} />;
    case 'compactness':
      return <Compactness {...props} />;
    case 'jacobian':
      return <Jacobian {...props} />;
    case 'products':
      return <Products {...props} />;
    case 'cantor':
      return <Cantor {...props} />;
    case 'brouwer':
      return <Brouwer {...props} />;
    case 'norms':
      return <Norms {...props} />;
    default:
      return null;
  }
}
