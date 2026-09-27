import { Fragment } from 'react';
import Formula from './Formula';

// Only explicitly delimited formulas are interpreted; ordinary lesson text stays text.
export function mathTextParts(text: string) {
  return text
    .split(/(\$[^$]+\$)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('$') && part.endsWith('$')
        ? { math: true, text: part.slice(1, -1) }
        : { math: false, text: part },
    );
}
export default function MathText({ children }: { children: string }) {
  return (
    <>
      {mathTextParts(children).map((part, i) =>
        part.math ? (
          <Formula key={i} tex={part.text} inline />
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}
