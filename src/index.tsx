import { useEffect, useRef, useState, type CSSProperties } from 'react';

export type ComparisonOrientation = 'horizontal' | 'vertical';
export interface ComparisonImage {
  src: string;
  alt: string;
  srcSet?: string;
  sizes?: string;
  loading?: 'eager' | 'lazy';
}

export function clampComparisonValue(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50;
}

export function positionToValue(position: number, start: number, length: number): number {
  if (![position, start, length].every(Number.isFinite) || length <= 0) return 50;
  return clampComparisonValue(((position - start) / length) * 100);
}

export interface ComparisonSliderProps {
  before: ComparisonImage;
  after: ComparisonImage;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
  orientation?: ComparisonOrientation;
  step?: number;
  disabled?: boolean;
  label?: string;
  valueText?: (value: number) => string;
  aspectRatio?: CSSProperties['aspectRatio'];
  objectFit?: CSSProperties['objectFit'];
  className?: string;
  style?: CSSProperties;
}

export function ComparisonSlider({
  before,
  after,
  value,
  defaultValue = 50,
  onValueChange,
  onValueCommit,
  orientation = 'horizontal',
  step = 1,
  disabled = false,
  label = 'Image comparison',
  valueText = (position) => `${Math.round(position)}% after image`,
  aspectRatio = '16 / 9',
  objectFit = 'cover',
  className = '',
  style,
}: ComparisonSliderProps) {
  if (!Number.isFinite(step) || step <= 0 || step > 100) {
    throw new RangeError('Step must be greater than 0 and at most 100.');
  }
  const [internal, setInternal] = useState(() => clampComparisonValue(defaultValue));
  const current = clampComparisonValue(value ?? internal);
  const latest = useRef(current);
  latest.current = current;
  const drag = useRef<{ id: number; element: HTMLDivElement } | null>(null);
  const release = () => {
    const active = drag.current;
    drag.current = null;
    if (active?.element.hasPointerCapture?.(active.id)) {
      active.element.releasePointerCapture(active.id);
    }
  };
  useEffect(() => release, []);
  useEffect(() => {
    if (disabled) release();
  }, [disabled]);
  const change = (next: number) => {
    const bounded = clampComparisonValue(next);
    latest.current = bounded;
    if (value === undefined) setInternal(bounded);
    if (bounded !== current) onValueChange?.(bounded);
    return bounded;
  };
  const fromPointer = (element: HTMLElement, x: number, y: number) => {
    const rect = element.getBoundingClientRect();
    return orientation === 'horizontal'
      ? positionToValue(x, rect.left, rect.width)
      : positionToValue(y, rect.top, rect.height);
  };
  return (
    <div
      className={`lp-comparison ${className}`}
      data-orientation={orientation}
      style={{ aspectRatio, ...style }}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0 || drag.current) return;
        const element = event.currentTarget;
        drag.current = { id: event.pointerId, element };
        element.setPointerCapture?.(event.pointerId);
        element.querySelector<HTMLElement>('[role="slider"]')?.focus();
        event.preventDefault();
        change(fromPointer(element, event.clientX, event.clientY));
      }}
      onPointerMove={(event) => {
        if (disabled || drag.current?.id !== event.pointerId) return;
        change(fromPointer(event.currentTarget, event.clientX, event.clientY));
      }}
      onPointerUp={(event) => {
        if (drag.current?.id !== event.pointerId) return;
        const next = disabled
          ? latest.current
          : change(fromPointer(event.currentTarget, event.clientX, event.clientY));
        release();
        if (!disabled) onValueCommit?.(next);
      }}
      onPointerCancel={(event) => {
        if (drag.current?.id === event.pointerId) release();
      }}
      onLostPointerCapture={(event) => {
        if (drag.current?.id === event.pointerId) release();
      }}
    >
      <img {...before} draggable={false} style={{ objectFit }} />
      <img
        {...after}
        draggable={false}
        style={{
          objectFit,
          clipPath:
            orientation === 'horizontal'
              ? `inset(0 ${100 - current}% 0 0)`
              : `inset(0 0 ${100 - current}% 0)`,
        }}
      />
      <div
        className="lp-comparison-handle"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={current}
        aria-valuetext={valueText(current)}
        aria-orientation={orientation}
        aria-disabled={disabled}
        style={orientation === 'horizontal' ? { left: `${current}%` } : { top: `${current}%` }}
        onKeyDown={(event) => {
          if (disabled) return;
          let next: number;
          if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = 100;
          else if (event.key === 'PageUp') next = current + step * 10;
          else if (event.key === 'PageDown') next = current - step * 10;
          else if (event.key === (orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'))
            next = current + step;
          else if (event.key === (orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'))
            next = current - step;
          else return;
          event.preventDefault();
          const bounded = change(next);
          onValueCommit?.(bounded);
        }}
      >
        <span aria-hidden="true">||</span>
      </div>
    </div>
  );
}
