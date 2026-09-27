import type { ReactNode } from 'react';
import type { SceneProps } from '../types';
import Formula from '../Formula';
import MathText from '../MathText';
import { C } from '../colors';
import { fmt, type V2 } from '../math';
import {
  BROUWER_EPS as eps,
  BROUWER_DELTA as delta,
  brouwerGrid,
  brouwerDisplacement,
  brouwerPair,
  HEX_STEPS,
  brouwerHexPosition,
  hexBoard,
  hexPath,
  BROUWER_COLOR_EXAMPLES,
  displacementColor,
  BROUWER_SIGN_EXAMPLE,
  firstNegativePair,
} from '../models';

const tex = String.raw;
const num = (v: number) => fmt(Math.abs(v) < 1e-12 ? 0 : v).replace(',', '{,}');
const signed = (v: number) => `${v > 1e-12 ? '+' : ''}${num(v)}`;
const coords = (v: V2) => tex`(${num(v[0])};\,${num(v[1])})`;
const X = (x: number) => 70 + 300 * x,
  Y = (y: number) => 335 - 300 * y;
const xy = (v: V2): V2 => [X(v[0]), Y(v[1])];
const metric = (label: string, value: number, color = C.white) => ({ label, value, color });
const hexagon = (p: V2, radius: number) =>
  Array.from({ length: 6 }, (_, k) => {
    const angle = Math.PI / 6 + (k * Math.PI) / 3;
    return `${p[0] + radius * Math.cos(angle)},${p[1] + radius * Math.sin(angle)}`;
  }).join(' ');

function SvgMath({
  x,
  y,
  children,
  color = C.white,
  width = 100,
  align = 'center',
}: {
  x: number;
  y: number;
  children: string;
  color?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <foreignObject
      x={align === 'center' ? x - width / 2 : align === 'right' ? x - width : x}
      y={y - 18}
      width={width}
      height={36}
    >
      <div
        className="brouwer-svg-math"
        style={{
          color,
          justifyContent:
            align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        }}
      >
        <Formula inline tex={children} />
      </div>
    </foreignObject>
  );
}
function Arrow({
  a,
  b,
  color = C.gold,
  dashed = false,
}: {
  a: V2;
  b: V2;
  color?: string;
  dashed?: boolean;
}) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    length = Math.hypot(dx, dy);
  if (length < 0.1) return <circle cx={a[0]} cy={a[1]} r={3} fill={color} />;
  const ux = dx / length,
    uy = dy / length,
    tip = Math.min(8, length / 2);
  return (
    <g>
      <line
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray={dashed ? '5 5' : undefined}
      />
      <path
        d={`M ${b[0]} ${b[1]} l ${-tip * ux + (tip * uy) / 2} ${-tip * uy - (tip * ux) / 2} l ${-tip * uy} ${tip * ux} Z`}
        fill={color}
      />
    </g>
  );
}
function Point({
  v,
  name,
  color,
  dx = 12,
  dy = -18,
}: {
  v: V2;
  name: string;
  color: string;
  dx?: number;
  dy?: number;
}) {
  return (
    <g>
      <circle cx={X(v[0])} cy={Y(v[1])} r={5} fill={color} stroke="#101923" strokeWidth={2} />
      <SvgMath
        x={X(v[0]) + dx}
        y={Y(v[1]) + dy}
        align={dx < 0 ? 'right' : 'left'}
        width={75}
        color={color}
      >
        {name}
      </SvgMath>
    </g>
  );
}
function Square({ n = 0 }: { n?: number }) {
  return (
    <g>
      <rect
        x={X(0)}
        y={Y(1)}
        width={300}
        height={300}
        fill={C.surface}
        fillOpacity={0.22}
        stroke={C.muted}
      />
      {n > 0 && (
        <g data-testid="hex-square-edges" stroke={C.grid} strokeWidth={0.7}>
          {Array.from({ length: n + 1 }, (_, k) => k / n).map((v) => (
            <g key={v}>
              <line x1={X(v)} y1={Y(0)} x2={X(v)} y2={Y(1)} />
              <line x1={X(0)} y1={Y(v)} x2={X(1)} y2={Y(v)} />
            </g>
          ))}
          {Array.from({ length: n * n }, (_, k) => {
            const x = (k % n) / n,
              y = Math.floor(k / n) / n;
            return (
              <line
                data-edge="diagonal"
                key={k}
                x1={X(x)}
                y1={Y(y)}
                x2={X(x + 1 / n)}
                y2={Y(y + 1 / n)}
              />
            );
          })}
        </g>
      )}
      <SvgMath x={X(0) - 16} y={Y(0)} width={30} color={C.muted}>
        0
      </SvgMath>
      <SvgMath x={X(1) + 16} y={Y(0)} width={30} color={C.muted}>
        1
      </SvgMath>
      <SvgMath x={X(0) - 16} y={Y(1)} width={30} color={C.muted}>
        1
      </SvgMath>
      <SvgMath x={X(1) + 25} y={Y(0) - 26} width={45} color={C.muted}>
        x_1
      </SvgMath>
      <SvgMath x={X(0)} y={Y(1) - 20} width={45} color={C.muted}>
        x_2
      </SvgMath>
    </g>
  );
}
function Diagram({
  title,
  children,
  square = false,
  n = 0,
}: {
  title: string;
  children: ReactNode;
  square?: boolean;
  n?: number;
}) {
  return (
    <svg className="brouwer-diagram" viewBox="0 0 460 400" role="img" aria-label={title}>
      <title>{title}</title>
      {square && <Square n={n} />} {children}
    </svg>
  );
}
function Card({
  title,
  children,
  tone = C.muted,
}: {
  title: string;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className="brouwer-card" style={{ borderLeftColor: tone }}>
      <strong style={{ color: tone }}>
        <MathText>{title}</MathText>
      </strong>
      <div>{children}</div>
    </div>
  );
}
function Choices({
  names,
  value,
  onChange,
}: {
  names: string[];
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="brouwer-choices">
      {names.map((name, i) => (
        <button key={name} aria-pressed={Math.round(value) === i} onClick={() => onChange(i)}>
          {name}
        </button>
      ))}
    </div>
  );
}
function Neighbours() {
  const hex = ([x, y]: V2): V2 => [100 + 38 * (x - y / 2), 82 - ((38 * Math.sqrt(3)) / 2) * y];
  const square = ([x, y]: V2): V2 => [340 + 38 * x, 82 - 38 * y];
  return (
    <svg
      className="brouwer-neighbours"
      viewBox="0 0 460 170"
      role="img"
      aria-label="Общая сторона шестиугольников становится ребром; у узла шесть соседей"
    >
      {[[0, 0] as V2, ...HEX_STEPS].map((v, k) => (
        <polygon
          key={k}
          points={hexagon(hex(v), 38 / Math.sqrt(3))}
          fill={k === 0 ? C.cyan : k === 5 ? C.purple : C.surface}
          stroke={C.muted}
        />
      ))}
      {HEX_STEPS.map((v, k) => (
        <g key={k}>
          <line
            x1={340}
            y1={82}
            x2={square(v)[0]}
            y2={square(v)[1]}
            stroke={k === 4 ? C.purple : C.muted}
          />
          <circle cx={square(v)[0]} cy={square(v)[1]} r={5} fill={k === 4 ? C.purple : C.muted} />
        </g>
      ))}
      <circle cx={340} cy={82} r={7} fill={C.cyan} />
      <Arrow a={[210, 82]} b={[246, 82]} color={C.white} />
      <SvgMath x={100} y={153} width={190}>{tex`\text{6 соседних клеток}`}</SvgMath>
      <SvgMath x={340} y={153} width={190}>{tex`\text{6 соседних узлов}`}</SvgMath>
    </svg>
  );
}
function PairDiagram({ n, x, y }: { n: number; x: number; y: number }) {
  const p = brouwerPair(n, x, y);
  return (
    <Diagram title="Два узла Гекса, их образы и шесть разрешённых направлений" square n={n}>
      <g data-testid="six-neighbours">
        {HEX_STEPS.map(([dx, dy], k) => {
          const next: V2 = [p.v[0] + dx / n, p.v[1] + dy / n];
          return (
            <g key={k}>
              <line
                x1={X(p.v[0])}
                y1={Y(p.v[1])}
                x2={X(next[0])}
                y2={Y(next[1])}
                stroke={C.purple}
                strokeWidth={2}
              />
              <circle cx={X(next[0])} cy={Y(next[1])} r={3} fill={C.purple} />
            </g>
          );
        })}
      </g>
      <Arrow a={xy(p.v)} b={xy(p.first.image)} />
      <Arrow a={xy(p.next)} b={xy(p.second.image)} />
      <Arrow a={xy(p.v)} b={xy(p.next)} color={C.purple} />
      <Arrow a={xy(p.first.image)} b={xy(p.second.image)} color={C.cyan} dashed />
      <Point v={p.v} name="V" color={C.cyan} dx={-12} dy={23} />
      <Point v={p.next} name="V'" color={C.purple} dy={24} />
      <Point v={p.first.image} name="f(V)" color={C.gold} dx={14} dy={4} />
      <Point v={p.second.image} name="f(V')" color={C.gold} dx={-14} dy={-22} />
      <SvgMath
        x={230}
        y={382}
        width={420}
        color={C.purple}
      >{tex`\|V'-V\|=\frac{\sqrt2}{${n}}\approx ${num(Math.SQRT2 / n)}`}</SvgMath>
    </Diagram>
  );
}
function HexDiagram({ seed, morph }: { seed: number; morph: number }) {
  const n = 7,
    board = hexBoard(seed, n),
    found = hexPath(board, n),
    path = found.color ? [...found.path].reverse() : found.path;
  const pos = (k: number) => brouwerHexPosition(k, n, morph - 1);
  const radius = 220 / (n - 1) / Math.sqrt(3);
  return (
    <Diagram title="Шестиугольники Гекса превращаются в узлы без изменения соседства">
      <g data-testid="hex-cells" opacity={Math.max(0, 1 - morph)}>
        {board.map((color, k) => (
          <polygon
            key={k}
            points={hexagon(pos(k), radius)}
            fill={color ? C.gold : C.cyan}
            fillOpacity={0.55}
            stroke="#101923"
            strokeWidth={2}
          />
        ))}
      </g>
      <g data-testid="hex-centres" opacity={Math.min(1, morph)}>
        {board.map((_, k) => {
          const c = k % n,
            r = n - 1 - Math.floor(k / n);
          return HEX_STEPS.slice().flatMap(([dc, dr]) => {
            const nc = c + dc,
              nr = r + dr,
              j = (n - 1 - nr) * n + nc;
            if (nc < 0 || nc >= n || nr < 0 || nr >= n || j <= k) return [];
            return [
              <line
                key={`${k}-${j}`}
                x1={pos(k)[0]}
                y1={pos(k)[1]}
                x2={pos(j)[0]}
                y2={pos(j)[1]}
                stroke={C.muted}
                strokeOpacity={0.45}
              />,
            ];
          });
        })}
      </g>
      <polyline
        data-testid="hex-winning-path"
        points={path.map((k) => pos(k).join(',')).join(' ')}
        fill="none"
        stroke={C.white}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {board.map((color, k) => (
        <circle
          key={k}
          cx={pos(k)[0]}
          cy={pos(k)[1]}
          r={morph < 1 ? 2 + 4 * morph : 6}
          fill={color ? C.gold : C.cyan}
          stroke="#101923"
          strokeWidth={1.5}
        />
      ))}
      <SvgMath x={pos(path[0])[0]} y={pos(path[0])[1] - 30} width={55}>
        V_0
      </SvgMath>
      <SvgMath x={pos(path.at(-1)!)[0]} y={pos(path.at(-1)!)[1] + 30} width={55}>
        V_N
      </SvgMath>
      <SvgMath x={230} y={382} width={420} color={found.color ? C.gold : C.cyan}>
        {found.color ? tex`\text{Цвет 2: снизу вверх}` : tex`\text{Цвет 1: слева направо}`}
      </SvgMath>
    </Diagram>
  );
}

export default function Brouwer({ params: p, step, onParam }: SceneProps) {
  let diagram: ReactNode, cards: ReactNode, caption: string, controls: ReactNode;
  let metrics: ReturnType<typeof metric>[] = [];
  if (step === 0) {
    const v: V2 = [p.x, p.y],
      d = brouwerDisplacement(v);
    caption = tex`Пример $f(x,y)=\bigl((1-y)/2,(1+x)/2\bigr)$. Образ всегда в квадрате $[0,1]^2$.`;
    diagram = (
      <Diagram title="Точка и её образ в единичном квадрате" square>
        <Arrow a={xy(v)} b={xy(d.image)} />
        {[
          { v, color: C.cyan },
          { v: d.image, color: C.gold },
        ].map(({ v, color }, i) => (
          <line
            key={i}
            x1={X(v[0])}
            y1={Y(v[1])}
            x2={X(v[0])}
            y2={360}
            stroke={color}
            strokeDasharray="3 5"
            opacity={0.5}
          />
        ))}
        <Arrow a={[X(v[0]), 360]} b={[X(d.image[0]), 360]} />
        <Point v={v} name="V" color={C.cyan} dx={v[0] > 0.8 ? -12 : 12} dy={24} />
        <Point v={d.image} name="f(V)" color={C.gold} />
        <SvgMath
          x={230}
          y={386}
          width={420}
          color={C.gold}
        >{tex`f_1(V)-V_1=${signed(d.displacement[0])}`}</SvgMath>
      </Diagram>
    );
    cards = (
      <>
        <Card title="Аргумент и результат" tone={C.gold}>
          <Formula tex={tex`V=${coords(v)}\qquad f(V)=${coords(d.image)}`} />
        </Card>
        <Card title="Вычитаем первые координаты" tone={C.cyan}>
          <Formula
            tex={tex`f_1(V)-V_1=${num(d.image[0])}-${num(v[0])}=${signed(d.displacement[0])}`}
          />
          {Math.abs(d.displacement[0]) < 1e-12
            ? 'Горизонтального смещения нет.'
            : d.displacement[0] > 0
              ? 'Образ правее исходной точки.'
              : 'Образ левее исходной точки. Отрицательна разность; сами координаты неотрицательны.'}
        </Card>
      </>
    );
    metrics = [metric('V_1', v[0], C.cyan), metric('f_1(V)', d.image[0], C.gold)];
  } else if (step === 1 || step === 6) {
    const pair = brouwerPair(p.n, step === 1 ? p.node / p.n : p.x, p.y);
    caption =
      step === 1
        ? tex`Та же доска Гекса, представленная узлами. Выбран узел $V=${coords(pair.v)}$ и его сосед $V'=${coords(pair.next)}$.`
        : tex`Сетка уже достаточно мелкая: $\sqrt2/n<\delta=\varepsilon=0{,}1$. Сравниваем два смещения.`;
    diagram = (
      <>
        {step === 1 && <Neighbours />}
        <PairDiagram n={p.n} x={pair.v[0]} y={pair.v[1]} />
      </>
    );
    cards = (
      <>
        <Card title="У каждого узла своё смещение" tone={C.gold}>
          <Formula
            tex={tex`f_1(V)-V_1=${num(pair.first.image[0])}-${num(pair.v[0])}=${signed(pair.first.displacement[0])}`}
          />
          <Formula
            tex={tex`f_1(V')-V'_1=${num(pair.second.image[0])}-${num(pair.next[0])}=${signed(pair.second.displacement[0])}`}
          />
        </Card>
        {step === 1 ? (
          <Card title={tex`$V'$ — сосед, $f(V)$ — образ`} tone={C.purple}>
            <Formula tex={tex`V'=${coords(pair.next)}\qquad f(V)=${coords(pair.first.image)}`} />
            <MathText>{tex`До $V'$ идём по ребру доски. Точка $f(V)$ получается применением функции и может лежать между узлами.`}</MathText>
          </Card>
        ) : (
          <>
            <Card title="Первое число: изменение образа" tone={C.cyan}>
              <Formula tex={tex`|f_1(V')-f_1(V)|=${num(Math.abs(pair.imageChange))}<\varepsilon`} />
              По равномерной непрерывности.
            </Card>
            <Card title="Второе число: изменение аргумента" tone={C.purple}>
              <Formula tex={tex`|V'_1-V_1|=\frac1n=${num(pair.inputChange)}<\varepsilon`} />
              По размеру клетки.
            </Card>
            <Card title="Изменение разности — не больше суммы" tone={C.gold}>
              <Formula
                tex={tex`\big|(${num(pair.second.displacement[0])})-(${num(pair.first.displacement[0])})\big|=${num(pair.change)}`}
              />
              <Formula
                tex={tex`\le ${num(Math.abs(pair.imageChange))}+${num(pair.inputChange)}<2\varepsilon=0{,}2`}
              />
            </Card>
          </>
        )}
      </>
    );
    metrics = [
      metric('f_1(V)-V_1', pair.first.displacement[0]),
      metric(tex`\|V'-V\|`, Math.SQRT2 / p.n, C.purple),
      metric(tex`\text{изменение разности}`, pair.change, C.gold),
    ];
  } else if (step === 2) {
    const selected = p.tile - 1,
      d = BROUWER_COLOR_EXAMPLES[selected],
      color = displacementColor(d);
    caption = tex`Четыре числовых примера правила при $\varepsilon=0{,}1$. Цвет $1$ — бирюзовый, цвет $2$ — золотой. Цвет указывает номер координаты.`;
    controls = (
      <Choices
        names={[
          '1. Плюс по первой',
          '2. Минус по первой',
          '3. Плюс по второй',
          '4. Минус по второй',
        ]}
        value={selected}
        onChange={(v) => onParam('tile', v + 1)}
      />
    );
    diagram = (
      <Diagram title="Положительное и отрицательное смещение могут иметь один цвет">
        {BROUWER_COLOR_EXAMPLES.map((d, k) => {
          const center: V2 = [130 + (k % 2) * 200, 100 + Math.floor(k / 2) * 180],
            color = displacementColor(d);
          return (
            <g key={k} data-selected={selected === k}>
              <polygon
                points={hexagon(center, 48)}
                fill={color === 1 ? C.cyan : C.gold}
                fillOpacity={selected === k ? 0.65 : 0.2}
                stroke={selected === k ? C.white : C.muted}
                strokeWidth={selected === k ? 3 : 1}
              />
              <SvgMath x={center[0]} y={center[1]} width={80}>{tex`i=${color}`}</SvgMath>
              <SvgMath
                x={center[0]}
                y={center[1] + 65}
                width={195}
              >{tex`(${signed(d[0])};\,${signed(d[1])})`}</SvgMath>
            </g>
          );
        })}
      </Diagram>
    );
    cards = (
      <>
        <Card title="Почему каждому узлу хватает двух цветов" tone={C.purple}>
          <Formula tex={tex`\max\{|f_1(V)-V_1|,|f_2(V)-V_2|\}\ge\varepsilon`} />
          <MathText>{tex`Хотя бы один модуль $\ge\varepsilon$. Если подходят оба, выбираем первый индекс.`}</MathText>
        </Card>
        <Card title={`Выбранный пример: цвет ${color}`} tone={color === 1 ? C.cyan : C.gold}>
          <Formula
            tex={tex`|f_1(V)-V_1|=${num(Math.abs(d[0]))}${Math.abs(d[0]) >= eps ? tex`\ge` : '<'}${tex`\varepsilon`}`}
          />
          <Formula
            tex={tex`|f_2(V)-V_2|=${num(Math.abs(d[1]))}${Math.abs(d[1]) >= eps ? tex`\ge` : '<'}${tex`\varepsilon`}`}
          />
          <MathText>{tex`По выбранной координате смещение $${signed(d[color - 1])}$. Его знак ${d[color - 1] > 0 ? 'положительный' : 'отрицательный'}, а цвет зависит от модуля.`}</MathText>
        </Card>
      </>
    );
    metrics = [
      metric(tex`\text{цвет}`, color),
      metric('f_1(V)-V_1', d[0]),
      metric('f_2(V)-V_2', d[1]),
    ];
  } else if (step === 3) {
    const grid = brouwerGrid(p.n),
      a: V2 = [0, 0],
      b: V2 = [grid.side, grid.side];
    caption = tex`Это узлы Гекса после распрямления доски. Диагональные рёбра сохранены: у внутреннего узла шесть соседей.`;
    diagram = (
      <Diagram title="Квадратная схема Гекса со всеми диагональными связями" square n={p.n}>
        <circle
          cx={X(0)}
          cy={Y(0)}
          r={300 * delta}
          fill={C.purple}
          fillOpacity={0.13}
          stroke={C.purple}
          strokeDasharray="4 4"
        />
        <Arrow a={xy(a)} b={xy([grid.side, 0])} color={C.gold} />
        <Arrow a={xy(a)} b={xy(b)} color={grid.fine ? C.cyan : C.red} />
        <Point v={b} name="V'" color={grid.fine ? C.cyan : C.red} />
        <SvgMath x={145} y={322} width={110} color={C.purple}>{tex`\delta=0{,}1`}</SvgMath>
        <SvgMath
          x={230}
          y={382}
          width={420}
          color={grid.fine ? C.cyan : C.red}
        >{tex`n=${p.n}:\quad\mathrm{diag}\approx ${num(grid.diagonal)}${grid.fine ? '<' : tex`\ge`}\delta`}</SvgMath>
      </Diagram>
    );
    cards = (
      <>
        <svg
          className="brouwer-lengths"
          viewBox="0 0 460 130"
          role="img"
          aria-label="Сторона, диагональ и дельта в одном масштабе"
        >
          {[
            ['1/n', grid.side, C.gold],
            [tex`\mathrm{diag}`, grid.diagonal, grid.fine ? C.cyan : C.red],
            [tex`\delta`, delta, C.purple],
          ].map(([label, value, color], index) => (
            <g key={label}>
              <SvgMath x={38} y={22 + 38 * index} width={75} color={String(color)}>
                {String(label)}
              </SvgMath>
              <line
                x1={85}
                y1={22 + 38 * index}
                x2={85 + 850 * Number(value)}
                y2={22 + 38 * index}
                stroke={String(color)}
                strokeWidth={6}
              />
              <SvgMath
                x={92 + 850 * Number(value)}
                y={22 + 38 * index}
                width={65}
                align="left"
                color={String(color)}
              >
                {num(Number(value))}
              </SvgMath>
            </g>
          ))}
        </svg>
        <Card title="Диагональ длиннее стороны — по Пифагору" tone={C.gold}>
          <Formula tex={tex`\mathrm{diag}=\sqrt{(1/n)^2+(1/n)^2}=\frac{\sqrt2}{n}>\frac1n`} />
        </Card>
        <Card
          title={grid.fine ? 'Сетка подходит' : 'Сетка ещё слишком крупная'}
          tone={grid.fine ? C.cyan : C.red}
        >
          <Formula tex={tex`n>\frac{\sqrt2}{0{,}1}\approx14{,}142`} />
          <MathText>{tex`Первое подходящее целое — $n=15$. Тогда все разрешённые шаги, включая диагональные, короче $\delta$.`}</MathText>
        </Card>
      </>
    );
    metrics = [
      metric('n', p.n),
      metric('1/n', grid.side),
      metric(tex`\mathrm{diag}`, grid.diagonal),
    ];
  } else if (step === 4) {
    const found = hexPath(hexBoard(p.seed));
    caption = tex`Лемма применяется к любой полной раскраске. Сейчас найдена тропинка цвета $${found.color + 1}$ из $${found.path.length}$ клеток.`;
    controls = (
      <Choices
        names={['1. Шестиугольники', '2. Их центры', '3. Квадратная схема']}
        value={p.morph}
        onChange={(v) => onParam('morph', v)}
      />
    );
    diagram = <HexDiagram seed={p.seed} morph={p.morph} />;
    cards = (
      <>
        <Card title="Меняется рисунок, сохраняется соседство" tone={C.purple}>
          <MathText>{tex`Одна шестиугольная клетка $\leftrightarrow$ один узел. Общая сторона клеток $\leftrightarrow$ ребро между узлами. Шесть соседей остаются шестью. Поэтому белая тропинка не исчезает при переходе к квадратной схеме.`}</MathText>
        </Card>
        <Card title="Что даёт одноцветность в доказательстве" tone={C.cyan}>
          <Formula tex={tex`|f_i(V_k)-(V_k)_i|\ge\varepsilon\qquad\forall k`} />
          <MathText>{tex`Вдоль всей тропинки используем одну координату $i$. Смещение по ней может быть положительным или отрицательным, но не может лежать в $(-\varepsilon,\varepsilon)$.`}</MathText>
        </Card>
      </>
    );
    metrics = [
      metric(tex`\text{цвет пути}`, found.color + 1),
      metric(tex`\text{узлов}`, found.path.length),
      metric(tex`\text{переход}`, p.morph),
    ];
  } else if (step === 5) {
    const left: V2 = [0, 0.3],
      right: V2 = [1, 0.7],
      fl: V2 = [eps + (1 - eps) * p.t, 0.45],
      fr: V2 = [(1 - eps) * p.t, 0.55];
    caption = tex`Путь цвета $1$: его концы на левой и правой сторонах. Показаны только условия на образы концов.`;
    diagram = (
      <Diagram title="Образы концов остаются внутри квадрата" square>
        {[0, 1].map((x) => (
          <line key={x} x1={X(x)} y1={Y(0)} x2={X(x)} y2={Y(1)} stroke={C.cyan} strokeWidth={4} />
        ))}
        <Arrow a={xy(left)} b={xy(fl)} />
        <Arrow a={xy(right)} b={xy(fr)} />
        <Point v={left} name="V_0" color={C.cyan} dx={-12} dy={24} />
        <Point v={right} name="V_N" color={C.cyan} />
        <Point v={fl} name="f(V_0)" color={C.gold} dy={28} dx={fl[0] > 0.8 ? -12 : 12} />
        <Point v={fr} name="f(V_N)" color={C.gold} dx={fr[0] > 0.8 ? -12 : 12} />
        <SvgMath
          x={230}
          y={382}
          width={440}
        >{tex`${signed(fl[0])}\ge\varepsilon\qquad ${signed(fr[0] - 1)}\le-\varepsilon`}</SvgMath>
      </Diagram>
    );
    cards = (
      <>
        <Card title="Левый конец" tone={C.cyan}>
          <Formula tex={tex`(V_0)_1=0,\quad f_1(V_0)\ge0`} />
          <MathText>{tex`Смещение неотрицательно, а его модуль по цвету $\ge\varepsilon$.`}</MathText>
          <Formula tex={tex`f_1(V_0)-(V_0)_1\ge\varepsilon`} />
        </Card>
        <Card title="Правый конец" tone={C.gold}>
          <Formula tex={tex`(V_N)_1=1,\quad f_1(V_N)\le1`} />
          <MathText>{tex`Смещение неположительно, а его модуль по цвету $\ge\varepsilon$.`}</MathText>
          <Formula tex={tex`f_1(V_N)-(V_N)_1\le-\varepsilon`} />
        </Card>
      </>
    );
    metrics = [metric(tex`f_1(V_0)-(V_0)_1`, fl[0]), metric(tex`f_1(V_N)-(V_N)_1`, fr[0] - 1)];
  } else {
    const phase = p.phase - 1,
      values = BROUWER_SIGN_EXAMPLE,
      change = firstNegativePair(values),
      scale = (v: number) => 230 + (v / eps) * 90;
    caption = tex`Одна бирюзовая тропинка, $\varepsilon=0{,}1$. Под клетками — числа $f_1(V_k)-(V_k)_1$, а не координаты узлов. Схема показывает требования при допущении.`;
    controls = (
      <Choices
        names={['1. Найти смену знака', '2. Выделить соседей', '3. Сравнить оценки']}
        value={phase}
        onChange={(v) => onParam('phase', v + 1)}
      />
    );
    diagram = (
      <Diagram title="Первая смена знака на одноцветной тропинке даёт противоречие">
        {values.map((v, k) => {
          const center: V2 = [80 + 60 * k, 70],
            selected = phase >= 1 && (k === change.index - 1 || k === change.index);
          return (
            <g key={k} data-testid={`sign-node-${k}`} opacity={phase >= 1 && !selected ? 0.4 : 1}>
              <polygon
                points={hexagon(center, 60 / Math.sqrt(3))}
                fill={C.cyan}
                fillOpacity={0.4}
                stroke={selected ? C.gold : C.cyan}
                strokeWidth={selected ? 3 : 1}
              />
              <SvgMath x={center[0]} y={center[1]} width={55}>
                {v > 0 ? '+' : '-'}
              </SvgMath>
              <SvgMath x={center[0]} y={132} width={60} color={selected ? C.gold : C.white}>
                {signed(v)}
              </SvgMath>
              {selected && (
                <SvgMath x={center[0]} y={18} width={60} color={C.gold}>
                  {k === change.index - 1 ? 'V' : "V'"}
                </SvgMath>
              )}
            </g>
          );
        })}
        {phase >= 1 && (
          <g data-testid="contradiction-pair">
            <SvgMath
              x={230}
              y={180}
              width={420}
            >{tex`\text{Значение смещения }f_1(V)-V_1`}</SvgMath>
            <rect x={scale(-eps)} y={214} width={180} height={73} fill={C.red} fillOpacity={0.14} />
            <line x1={50} y1={252} x2={410} y2={252} stroke={C.muted} />
            {[-1, 0, 1].map((k) => (
              <g key={k}>
                <line x1={scale(k * eps)} y1={244} x2={scale(k * eps)} y2={260} stroke={C.white} />
                <SvgMath x={scale(k * eps)} y={310} width={80}>
                  {k === -1 ? tex`-\varepsilon` : k === 1 ? tex`+\varepsilon` : '0'}
                </SvgMath>
              </g>
            ))}
            <circle cx={scale(eps)} cy={252} r={7} fill={C.cyan} />
            <circle cx={scale(-eps)} cy={252} r={7} fill={C.cyan} />
            <SvgMath x={scale(eps)} y={284} width={50} color={C.gold}>
              V
            </SvgMath>
            <SvgMath x={scale(-eps)} y={284} width={50} color={C.gold}>
              {"V'"}
            </SvgMath>
            <SvgMath
              x={230}
              y={235}
              width={160}
              color={C.red}
            >{tex`\text{нет узлов пути}`}</SvgMath>
            {phase === 2 && (
              <g data-testid="required-jump">
                <Arrow a={[scale(eps), 205]} b={[scale(-eps), 205]} color={C.red} />
                <SvgMath
                  x={230}
                  y={363}
                  width={420}
                  color={C.red}
                >{tex`|(-\varepsilon)-\varepsilon|=2\varepsilon`}</SvgMath>
              </g>
            )}
          </g>
        )}
        {phase === 0 && (
          <>
            <SvgMath
              x={230}
              y={230}
              width={420}
            >{tex`\text{начало: }\ge\varepsilon\qquad\text{конец: }\le-\varepsilon`}</SvgMath>
            <SvgMath
              x={230}
              y={285}
              width={420}
            >{tex`\text{Где впервые появляется минус?}`}</SvgMath>
          </>
        )}
      </Diagram>
    );
    cards =
      phase === 0 ? (
        <Card title="Почему где-то появится первый минус" tone={C.cyan}>
          <MathText>{tex`В начале смещение положительно, в конце отрицательно. Узлов конечное число. Значит, есть первый узел с отрицательной разностью. На схеме это четвёртая клетка; непосредственно перед ней ещё плюс.`}</MathText>
        </Card>
      ) : phase === 1 ? (
        <>
          <Card title="Выбраны именно соседние узлы" tone={C.gold}>
            <MathText>{tex`Первый узел с минусом обозначим $V'$, предыдущий — $V$. Они имеют один цвет и общую сторону на доске.`}</MathText>
            <Formula tex={tex`f_1(V)-V_1\ge\varepsilon\\ f_1(V')-V'_1\le-\varepsilon`} />
          </Card>
          <Card title="Самые близкие допустимые значения" tone={C.cyan}>
            <Formula tex={tex`+\varepsilon=+0{,}1\qquad-\varepsilon=-0{,}1`} />
            <MathText>{tex`Ближе к нулю нельзя: потеряется условие цвета. Между этими двумя значениями расстояние $0{,}2=2\varepsilon$. При более далёких значениях скачок только больше.`}</MathText>
          </Card>
        </>
      ) : (
        <>
          <Card title="Требование цвета: скачок не меньше" tone={C.gold}>
            <Formula tex={tex`\big|(f_1(V')-V'_1)-(f_1(V)-V_1)\big|\ge2\varepsilon`} />
            <Formula tex={tex`|(-0{,}1)-(+0{,}1)|=0{,}2`} />
          </Card>
          <Card title="Оценка непрерывности: скачок строго меньше" tone={C.purple}>
            <MathText>{tex`Это те же два соседних узла. Из прошлого шага:`}</MathText>
            <Formula tex={tex`\big|(f_1(V')-V'_1)-(f_1(V)-V_1)\big|<2\varepsilon`} />
          </Card>
          <div className="brouwer-conclusion" data-testid="brouwer-contradiction">
            <Formula tex={tex`\boxed{\text{одно число }\ge0{,}2\ \text{и}\ <0{,}2}`} />
            <MathText>{tex`Невозможно. Предположение $f(V)\ne V$ всюду неверно. Значит, $\exists V:\ f(V)=V$.`}</MathText>
          </div>
        </>
      );
    metrics = [
      metric(tex`\text{этап}`, phase + 1),
      metric(tex`\text{наименьший скачок}`, change.jump, C.gold),
    ];
  }
  return (
    <div className="brouwer-content">
      <p className="brouwer-caption">
        <MathText>{caption}</MathText>
      </p>
      {controls}
      {diagram}
      <div className="brouwer-ledger">{cards}</div>
      <div className="scene-metrics" role="status" aria-live="off">
        {metrics.map((m, i) => (
          <span key={i} style={{ color: m.color }}>
            <Formula inline tex={tex`${m.label}=${num(m.value)}`} />
          </span>
        ))}
      </div>
    </div>
  );
}
