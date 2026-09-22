import type { SceneProps } from '../types';
import type { V2 } from '../math';
import { fmt } from '../math';
import { Board, Curve, Dot, Seg, Fill, Label, Metrics, C } from './Plane';
import {
  partialSums,
  harmonicBlock,
  alternatingTerm,
  abelParts,
  rearrangedIndex,
  seriesDiagnostics,
  squareEnumeration,
  diagonalEnumeration,
  productTerm,
  productSum,
  productSquareSum,
  productDiagonalSum,
} from '../series-models';

const metric = (label: string, value: number | string, color?: string) => ({ label, value, color });
const points = (values: number[], start = 0): V2[] =>
  values.slice(start).map((value, i) => [i + start, value]);
const band = (left: number, right: number, low: number, high: number): V2[] => [
  [left, low],
  [right, low],
  [right, high],
  [left, high],
];

function Tail({ params: p, step, cameraKey }: SceneProps) {
  const n = Math.round(p.n),
    count = Math.round(p.count),
    harmonic = step === 1;
  const last = harmonic ? 2 * n : step === 0 ? n : n + count;
  const sums = partialSums(harmonic ? (k) => 1 / k : (k) => (1 - p.q) * p.q ** (k - 1), last);
  const end = Math.max(last + 2, 12);
  const tail = harmonic ? harmonicBlock(n) : p.q ** n * (1 - p.q ** count);
  return (
    <>
      <Board stretch x={[0, end]} y={[-0.15, harmonic ? 5.15 : 1.2]} reset={cameraKey}>
        {!harmonic && <Seg a={[0, 1]} b={[end, 1]} color={C.purple} dashed />}
        {step >= 2 && <Fill points={band(n, end, sums[n], 1)} color={C.gold} opacity={0.1} />}
        <Curve points={points(sums)} color={C.muted} />
        {sums.slice(1).map((s, i) => (
          <Dot key={i} p={[i + 1, s]} color={i + 1 > n ? C.gold : C.cyan} />
        ))}
        <Dot p={[n, sums[n]]} label={'S' + n} color={C.cyan} attach={n > end / 2 ? 'nw' : 'ne'} />
        {step > 0 && (
          <>
            <Seg
              a={[last, sums[n]]}
              b={[last, harmonic ? sums[last] : step === 3 ? 1 : sums[last]]}
              color={C.gold}
            />
            <Seg a={[n, sums[n]]} b={[last, sums[n]]} color={C.cyan} dashed />
          </>
        )}
        <Label p={[end * 0.53, harmonic ? 4.9 : 1.13]} color={C.white}>
          {harmonic ? 'S₂ₙ − Sₙ ≥ ½' : 'Sₖ = 1 − qᵏ'}
        </Label>
      </Board>
      <Metrics
        items={[
          metric('n', n),
          metric('Sₙ', sums[n], C.cyan),
          ...(harmonic
            ? [
                metric('aₙ = 1/n', 1 / n),
                metric('S₂ₙ−Sₙ', tail, C.gold),
                metric('нижняя граница хвоста', '½'),
              ]
            : [
                metric('q', p.q),
                metric('Sₙ₊ₘ−Sₙ', tail, C.gold),
                metric('rₙ = qⁿ', p.q ** n, C.purple),
              ]),
        ]}
      />
      <div className="board-hint">
        Горизонталь — номер k · вертикаль — частичная сумма Sₖ
        {step >= 2 ? ' · жёлтая полоса содержит все возможные Sₙ₊ₘ' : ''}
      </div>
    </>
  );
}

function Tests({ params: p, step, cameraKey }: SceneProps) {
  const n = Math.round(p.n),
    power = p.power;
  const diagnostics = seriesDiagnostics(n, power);
  const ks = Array.from({ length: 79 }, (_, i) => i + 2);
  const upper = step === 3 ? 3.9 : 1.35;
  return (
    <>
      <Board stretch x={[0, step === 0 ? 21 : 83]} y={[-0.1, upper]} reset={cameraKey}>
        {step === 0 ? (
          <>
            <Curve
              points={Array.from({ length: 20 }, (_, i): V2 => [i + 1, (i + 1) ** -power])}
              color={C.gold}
            />
            <Curve
              points={Array.from({ length: 20 }, (_, i): V2 => [i + 1, (i + 1) ** -power / 2])}
              color={C.purple}
            />
            {Array.from({ length: 20 }, (_, i) => {
              const k = i + 1;
              return <Dot key={k} p={[k, k ** -power / (1 + 1 / k)]} color={C.cyan} />;
            })}
            <Label p={[10, 1.15]} color={C.gold}>
              bₙ = n⁻ᵖ
            </Label>
          </>
        ) : step === 1 ? (
          <>
            <Seg a={[0, 1]} b={[82, 1]} color={C.red} dashed />
            <Seg a={[1, p.q]} b={[80, p.q]} color={C.cyan} />
            {ks
              .filter((k) => k % 5 === 0)
              .map((k) => (
                <Dot key={k} p={[k, p.q]} color={C.cyan} />
              ))}
            <Label p={[40, p.q > 1 ? p.q - 0.11 : p.q + 0.12]} color={C.cyan}>
              ⁿ√(qⁿ) = q
            </Label>
          </>
        ) : step === 2 ? (
          <>
            <Seg a={[0, 1]} b={[82, 1]} color={C.red} dashed />
            <Curve
              points={ks.map((k): V2 => [k, seriesDiagnostics(k, power).root])}
              color={C.purple}
            />
            <Curve
              points={ks.map((k): V2 => [k, seriesDiagnostics(k, power).ratio])}
              color={C.cyan}
            />
            <Dot p={[n, diagnostics.root]} color={C.purple} label="Kₙ" attach="se" />
            <Dot p={[n, diagnostics.ratio]} color={C.cyan} label="Dₙ" attach="ne" />
            <Label p={[42, 1.18]} color={C.white}>
              Оба предела равны 1 при любом p
            </Label>
          </>
        ) : (
          <>
            <Seg a={[0, 1]} b={[82, 1]} color={C.red} dashed />
            <Seg a={[0, power]} b={[82, power]} color={C.purple} dashed />
            <Curve
              points={ks.map((k): V2 => [k, seriesDiagnostics(k, power).raabe])}
              color={C.cyan}
            />
            <Dot p={[n, diagnostics.raabe]} color={C.cyan} label="Rₙ" />
            <Label p={[43, 3.65]} color={C.purple}>
              Предел Rₙ = p = {fmt(power)}
            </Label>
          </>
        )}
      </Board>
      <Metrics
        items={
          step === 1
            ? [
                metric('K = q', p.q, C.cyan),
                metric('qⁿ при n=12', p.q ** 12),
                metric('ряд Σqⁿ', p.q < 1 ? 'сходится' : 'расходится', p.q < 1 ? C.cyan : C.red),
                ...(Math.abs(p.q - 1) < 1e-10
                  ? [metric('признак Коши при K=1', 'нет ответа')]
                  : []),
              ]
            : [
                metric('p', power),
                metric('Σ1/nᵖ', power > 1 ? 'сходится' : 'расходится'),
                ...(step === 0
                  ? [metric('aₙ/bₙ →', '1')]
                  : step === 2
                    ? [
                        metric('Kₙ', diagnostics.root, C.purple),
                        metric('Dₙ', diagnostics.ratio, C.cyan),
                        metric('K = D', '1'),
                      ]
                    : [metric('Rₙ', diagnostics.raabe, C.cyan), metric('Rₙ →', power, C.purple)]),
              ]
        }
      />
      <div className="board-hint">
        {step === 0
          ? 'Жёлтый — bₙ · бирюзовый — aₙ · фиолетовый — bₙ/2'
          : step === 2
            ? 'Фиолетовый — корень Kₙ · бирюзовый — отношение Dₙ · красный — 1'
            : step === 3
              ? 'Бирюзовый — Rₙ · фиолетовый — предел p · красный — порог 1'
              : 'Номер n меняется по горизонтали; корень одинаков для каждого n'}
      </div>
    </>
  );
}

function Alternating({ params: p, step, cameraKey }: SceneProps) {
  const n = Math.round(p.n),
    N = 2 * n + 1,
    power = p.power;
  const sums = partialSums((k) => alternatingTerm(k, power), N);
  const absolute = partialSums((k) => k ** -power, N);
  const odd: V2[] = [],
    even: V2[] = [];
  for (let k = 1; k <= N; k++) (k % 2 ? odd : even).push([k, sums[k]]);
  const abel = abelParts(N, 1);
  const sum2 = partialSums((k) => alternatingTerm(k, 2), N);
  const end = Math.max(N + 2, 14);
  const abelOriginal = partialSums((k) => alternatingTerm(k), N);
  const maxY = step === 3 ? absolute[N] * 1.12 : step === 5 ? 2.25 : 1.22;
  return (
    <>
      <Board stretch x={[0, end]} y={[-0.12, maxY]} reset={cameraKey}>
        {step < 3 && (
          <>
            <Fill points={band(2 * n, end, sums[2 * n], sums[N])} color={C.gold} opacity={0.15} />
            <Curve points={points(sums)} color={C.muted} width={1} />
            <Curve points={even} color={C.cyan} />
            <Curve points={odd} color={C.purple} />
            {even.map((q, i) => (
              <Dot key={'e' + i} p={q} color={C.cyan} />
            ))}
            {odd.map((q, i) => (
              <Dot key={'o' + i} p={q} color={C.purple} />
            ))}
            {power === 1 && (
              <Seg a={[0, Math.log(2)]} b={[end, Math.log(2)]} color={C.gold} dashed />
            )}
            <Seg a={[N, sums[2 * n]]} b={[N, sums[N]]} color={C.gold} />
            <Label p={[end * 0.52, 1.13]} color={C.white}>
              {step === 2 ? 'Зазор ≡ 1' : 'S₂ₙ ≤ S ≤ S₂ₙ₊₁'}
            </Label>
          </>
        )}
        {step === 3 && (
          <>
            <Curve points={points(absolute)} color={C.red} />
            <Curve points={points(sums)} color={C.cyan} />
            <Dot p={[N, absolute[N]]} label="Σ|aₖ|" color={C.red} attach="nw" />
            <Dot p={[N, sums[N]]} label="Σaₖ" color={C.cyan} attach="nw" />
          </>
        )}
        {step === 4 && (
          <>
            <Curve points={points(abelOriginal)} color={C.muted} />
            <Curve
              points={Array.from(
                { length: N },
                (_, i): V2 => [i + 1, abelParts(i + 1, 1).transformed],
              )}
              color={C.cyan}
            />
            <Seg
              a={[N, abel.transformed]}
              b={[N, abel.transformed + abel.boundary]}
              color={C.gold}
            />
            <Dot p={[N, abel.transformed]} color={C.cyan} label="ΣAₖΔbₖ" attach="sw" />
            <Dot p={[N, sums[N]]} color={C.gold} label="+ A_Nb_N" attach="nw" />
          </>
        )}
        {step === 5 && (
          <>
            <Curve points={points(abelOriginal)} color={C.cyan} />
            <Curve points={points(sum2)} color={C.purple} />
            <Curve points={abelOriginal.map((s, i): V2 => [i, s + sum2[i]])} color={C.gold} />
            <Dot p={[N, sums[N] + sum2[N]]} color={C.gold} label="Σaₖbₖ" attach="nw" />
            <Label p={[end * 0.5, 2.08]} color={C.white}>
              bₖ = 1 + 1/k → 1
            </Label>
          </>
        )}
      </Board>
      <Metrics
        items={
          step === 4
            ? [
                metric('N', N),
                metric('Σaₖbₖ', sums[N]),
                metric('ΣAₖΔbₖ', abel.transformed, C.cyan),
                metric('A_Nb_N', abel.boundary, C.gold),
                metric('мажоранта Σ|Δbₖ|', '≤ 1'),
              ]
            : step === 5
              ? [
                  metric('Σaₖ', sums[N], C.cyan),
                  metric('Σaₖ(bₖ−1)', sum2[N], C.purple),
                  metric('Σaₖbₖ', sums[N] + sum2[N], C.gold),
                ]
              : step === 3
                ? [
                    metric('p', power),
                    metric('N = 2n+1', N),
                    metric('Σₖ₌₁ᴺ aₖ', sums[N], C.cyan),
                    metric('Σₖ₌₁ᴺ |aₖ|', absolute[N], C.red),
                    metric('сходимость', power > 1 ? 'абсолютная' : 'условная'),
                  ]
                : [
                    metric('S₂ₙ', sums[2 * n], C.cyan),
                    metric('S₂ₙ₊₁', sums[N], C.purple),
                    metric('зазор = c₂ₙ₊₁', N ** -power, C.gold),
                    ...(power === 1
                      ? [metric('S = ln 2', Math.log(2))]
                      : [metric('предел Sₙ', 'не существует')]),
                  ]
        }
      />
      <div className="board-hint">
        {step < 3
          ? 'Бирюзовые — чётные частичные суммы · фиолетовые — нечётные'
          : step === 4
            ? 'Бирюзовый — преобразованная сумма · жёлтый — граничный член'
            : step === 5
              ? 'Жёлтый — сумма двух сходящихся рядов'
              : 'Красный — сумма модулей · бирюзовый — сумма со знаками'}
      </div>
    </>
  );
}

function Order({ params: p, step, cameraKey }: SceneProps) {
  const n = Math.round(p.n),
    reordered = step >= 3,
    N = (reordered ? 3 : 2) * n;
  const power = step === 3 ? 2 : 1;
  const original = partialSums(
    (k) =>
      step === 1
        ? (k % 2 ? 1 : -1) / Math.ceil(k / 2)
        : step === 2
          ? k % 2
            ? 1
            : -1
          : alternatingTerm(k, power),
    N,
  );
  const permuted = reordered
    ? partialSums((k) => alternatingTerm(rearrangedIndex(k), power), N)
    : [];
  const grouped = points(original).filter(([k]) => k % 2 === 0);
  const limit = step === 3 ? Math.PI ** 2 / 12 : Math.log(2);
  const end = Math.max(N + 3, 14);
  return (
    <>
      <Board stretch x={[0, end]} y={[-0.18, 1.45]} reset={cameraKey}>
        <Curve
          points={points(original)}
          color={reordered ? C.cyan : C.muted}
          width={reordered ? 2 : 1}
        />
        {reordered ? (
          <>
            <Curve points={points(permuted)} color={C.gold} />
            <Seg a={[0, limit]} b={[end, limit]} color={C.cyan} dashed />
            {step === 4 && (
              <Seg a={[0, 1.5 * limit]} b={[end, 1.5 * limit]} color={C.gold} dashed />
            )}
            <Dot p={[N, original[N]]} label="S₃ₙ" color={C.cyan} attach="sw" />
            <Dot p={[N, permuted[N]]} label="T₃ₙ" color={C.gold} attach="nw" />
            <Label p={[end * 0.5, 1.3]} color={C.white}>
              Индексы: 1, 3, 2, 5, 7, 4, …
            </Label>
          </>
        ) : (
          <>
            <Curve points={grouped} color={C.cyan} />
            {points(original, 1).map((q, i) => (
              <Dot key={i} p={q} color={q[0] % 2 ? C.muted : C.cyan} />
            ))}
            <Seg a={[N - 1, original[N]]} b={[N - 1, original[N - 1]]} color={C.gold} />
            <Dot p={[N, original[N]]} label="Bₙ=S₂ₙ" color={C.cyan} attach="sw" />
            <Label p={[end * 0.5, 1.3]} color={C.white}>
              {step === 0
                ? 'Концы скобок — чётные номера'
                : step === 1
                  ? 'Высота незакрытой скобки = 1/n'
                  : 'Высота незакрытой скобки = 1'}
            </Label>
          </>
        )}
      </Board>
      <Metrics
        items={
          reordered
            ? [
                metric('членов в каждом порядке', N),
                metric('естественная сумма', original[N], C.cyan),
                metric('переставленная сумма', permuted[N], C.gold),
                metric('предел Sₙ', limit, C.cyan),
                metric('предел Tₙ', step === 4 ? 1.5 * limit : limit, C.gold),
              ]
            : [
                metric('Bₙ = S₂ₙ', original[N], C.cyan),
                metric('S₂ₙ₋₁', original[N - 1]),
                metric('незакрытая скобка', original[N - 1] - original[N], C.gold),
                metric('aₙ → 0', step === 2 ? 'нет' : 'да'),
              ]
        }
      />
      <div className="board-hint">
        {reordered
          ? 'Сравниваются одинаковые количества слагаемых; конечные наборы индексов различаются'
          : 'Бирюзовые точки сохранены после группировки; серые показывают поведение внутри скобок'}
      </div>
    </>
  );
}

function Product({ params: p, step, cameraKey }: SceneProps) {
  const n = Math.round(p.n),
    count = Math.round(p.count);
  const selected =
    step === 0
      ? squareEnumeration(n * n)
      : step === 1
        ? squareEnumeration(count)
        : diagonalEnumeration((n * (n + 1)) / 2);
  const keys = new Set(selected.map(([i, j]) => i + ',' + j));
  const last = selected[selected.length - 1],
    value = productSum(selected);
  const grid = Array.from({ length: 100 }, (_, k): V2 => [(k % 10) + 1, Math.floor(k / 10) + 1]);
  return (
    <>
      <Board x={[-0.2, 11.4]} y={[-0.3, 11.5]} axes={false} reset={cameraKey}>
        {grid.map(([i, j]) => {
          const active = keys.has(i + ',' + j);
          return (
            <Fill
              key={i + ',' + j}
              points={band(i - 0.42, i + 0.42, j - 0.42, j + 0.42)}
              color={active ? C.cyan : C.grid}
              opacity={active ? 0.25 + 0.5 * Math.pow(productTerm([i, j]) * 6, 0.2) : 0.05}
            />
          );
        })}
        {Array.from({ length: 10 }, (_, i) => i + 1).map((i) => (
          <g key={i}>
            <Label p={[i, 0.2]}>{i}</Label>
            <Label p={[0.15, i]}>{i}</Label>
          </g>
        ))}
        <Dot p={last} color={C.gold} />
        {step === 1 && <Curve points={selected} color={C.gold} width={1} />}
        {step === 2 && <Seg a={[0.6, n + 0.4]} b={[n + 0.4, 0.6]} color={C.gold} />}
        <Label p={[5.5, 10.95]} color={C.white}>
          Клетка (i,j): 2⁻ⁱ · 3⁻ʲ
        </Label>
        <Label p={[10.9, 0.2]} color={C.white}>
          i
        </Label>
        <Label p={[0.15, 10.85]} color={C.white}>
          j
        </Label>
      </Board>
      <Metrics
        items={[
          metric('выбрано клеток', selected.length),
          metric('конечная сумма', value, C.cyan),
          metric('AB =', '½', C.purple),
          metric('невыбранная сумма', 0.5 - value, C.gold),
          ...(step === 0
            ? [metric('Sₙ⁽ᵃ⁾ Sₙ⁽ᵇ⁾', productSquareSum(n))]
            : step === 2
              ? [metric('Σₘ≤ₙ cₘ', productDiagonalSum(n))]
              : [metric('последняя пара', '(' + last[0] + ', ' + last[1] + ')')]),
        ]}
      />
      <div className="board-hint">
        Площадь клеток одинакова; число в клетке передаёт её вклад через яркость. Рисунок обрезан
        сеткой 10×10.
      </div>
    </>
  );
}

export default function Series(props: SceneProps) {
  switch (props.lesson.scene) {
    case 'series-tail':
      return <Tail {...props} />;
    case 'series-tests':
      return <Tests {...props} />;
    case 'alternating':
      return <Alternating {...props} />;
    case 'series-order':
      return <Order {...props} />;
    case 'series-product':
      return <Product {...props} />;
    default:
      return null;
  }
}
