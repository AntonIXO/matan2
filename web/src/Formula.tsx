import katex from 'katex';
import { useMemo } from 'react';
export function formulaRows(tex: string) {
  let depth = 0,
    env = 0,
    left = 0,
    start = 0;
  const result: string[] = [];
  for (let i = 0; i < tex.length; i++) {
    if (tex.startsWith('\\begin{', i)) env++;
    if (tex.startsWith('\\end{', i)) env--;
    if (tex.startsWith('\\left', i)) left++;
    if (tex.startsWith('\\right', i)) left--;
    if (tex[i] === '{') depth++;
    if (tex[i] === '}') depth--;
    if (depth || env || left) continue;
    const separator = tex.startsWith('\\qquad', i) || tex.startsWith(',\\quad', i);
    const relation =
      tex[i] === '=' ||
      ['\\le', '\\ge', '\\to', '\\iff', '\\Rightarrow'].some((t) => tex.startsWith(t, i));
    if (separator && i - start > 12) {
      result.push(tex.slice(start, i));
      i += 5;
      start = i + 1;
    } else if (relation && i - start > 44 && tex.length - i > 6) {
      result.push(tex.slice(start, i));
      start = i;
    }
  }
  result.push(tex.slice(start));
  return result.filter(Boolean);
}
export default function Formula({ tex, inline = false }: { tex: string; inline?: boolean }) {
  const html = useMemo(
    () =>
      (inline ? [tex] : formulaRows(tex)).map((line) =>
        katex.renderToString(line, {
          displayMode: !inline,
          output: 'htmlAndMathml',
          throwOnError: false,
          trust: false,
        }),
      ),
    [tex, inline],
  );
  return (
    <span className={inline ? 'formula inline' : 'formula formula-lines'}>
      {html.map((line, i) => (
        <span key={i} className="formula-line" dangerouslySetInnerHTML={{ __html: line }} />
      ))}
    </span>
  );
}
