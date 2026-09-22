import { useLayoutEffect, useRef } from 'react';
import { fmt } from './math';

export function Metrics({
  items,
}: {
  items: { label: string; value: string | number; color?: string }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    const scene = node?.closest<HTMLElement>('.canvas-area');
    if (!node || !scene) return;
    let frame = 0;
    const resize = () => {
      const value = `${Math.ceil(node.getBoundingClientRect().height) + 34}px`;
      if (scene.style.getPropertyValue('--metrics-space') !== value)
        scene.style.setProperty('--metrics-space', value);
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    });
    observer.observe(node);
    resize();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      scene.style.removeProperty('--metrics-space');
    };
  }, []);
  return (
    <div ref={ref} className="scene-metrics" role="status" aria-live="off">
      {items.map((item, i) => (
        <span key={i} style={{ color: item.color }}>
          {item.label} <b>{typeof item.value === 'number' ? fmt(item.value) : item.value}</b>
        </span>
      ))}
    </div>
  );
}
