import { useLayoutEffect, useRef, type ComponentProps } from 'react';
import { MovablePoint } from 'mafs';
import { fmt } from './math';
export default function AccessiblePoint({
  label = 'Точка',
  ...props
}: ComponentProps<typeof MovablePoint> & { label?: string }) {
  const ref = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    const point = ref.current?.querySelector('.mafs-movable-point');
    point?.setAttribute('role', 'button');
    point?.setAttribute(
      'aria-label',
      label +
        '. Координаты ' +
        fmt(props.point[0]) +
        '; ' +
        fmt(props.point[1]) +
        '. Перемещение стрелками.',
    );
  }, [label, props.point[0], props.point[1]]);
  return (
    <g ref={ref} data-scene-point={label}>
      <MovablePoint {...props} />
    </g>
  );
}
