import { expect, test } from 'bun:test';
import katex from 'katex';
import { renderToStaticMarkup } from 'react-dom/server';
import { formulaRows } from '../../src/Formula';
import { mathTextParts } from '../../src/MathText';
import { brouwer } from '../../src/content/brouwer';
import Brouwer from '../../src/scenes/Brouwer';
import { atStep } from '../../src/state';

test('явные строки LaTeX разделяются, внутри aligned и скобок не разрезаются', () => {
  expect(formulaRows(String.raw`a=1\\b=2`)).toEqual(['a=1', 'b=2']);
  const aligned = String.raw`\begin{aligned}a&=1\\b&=2\end{aligned}`;
  expect(formulaRows(aligned)).toEqual([aligned]);
  const bracket = String.raw`\left(\frac{a}{b}\right)`;
  expect(formulaRows(bracket)).toEqual([bracket]);
});
test('LaTeX в тексте и рисунках всех восьми шагов разбирается без ошибок', () => {
  const texts = [
    brouwer.conditions,
    brouwer.insight,
    brouwer.note!,
    ...brouwer.steps.map((s) => s.text),
  ];
  for (const text of texts) {
    expect((text.match(/\$/g) || []).length % 2).toBe(0);
    for (const part of mathTextParts(text))
      if (part.math)
        expect(() => katex.renderToString(part.text, { throwOnError: true })).not.toThrow();
  }
  for (let step = 0; step < 8; step++)
    for (const progress of [0, 0.5, 1]) {
      const state = atStep(brouwer, step, undefined, progress);
      const html = renderToStaticMarkup(
        <Brouwer
          lesson={brouwer}
          step={step}
          params={state.params}
          focus=""
          onParam={() => {}}
          cameraKey={0}
        />,
      );
      expect(html).not.toContain('katex-error');
      expect(html).not.toMatch(/NaN|Infinity/);
      expect(html).toContain('application/x-tex');
      expect(html).not.toContain('0{,}14ge');
    }
});
