import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { fmtLongDate, fmtShortDate } from '../lib/format';
import type { PricePoint } from '../data/types';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + step / 2; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks;
}

export type ChartSeries = { id: string; label: string; color: string; points: PricePoint[] };

type LineChartProps = {
  series: ChartSeries[];
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  height?: number;
  area?: boolean;
  reference?: { value: number; label: string } | null;
  label: string;
};

export function LineChart({ series, format, axisFormat = format, height = 240, area = false, reference, label }: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, '');

  const dates = series[0]?.points.map((p) => p.date) ?? [];
  const n = dates.length;

  useEffect(() => setHover(null), [n]);

  const values = series.flatMap((s) => s.points.map((p) => p.value));
  if (reference) values.push(reference.value);
  const ticks = values.length ? niceTicks(Math.min(...values), Math.max(...values)) : [0, 1];
  const [d0, d1] = [ticks[0], ticks[ticks.length - 1]];

  const tickLabels = ticks.map(axisFormat);
  const ml = Math.max(...tickLabels.map((t) => t.length)) * 6.4 + 12;
  const mr = 12;
  const mt = 12;
  const mb = 26;
  const innerW = Math.max(0, width - ml - mr);
  const innerH = height - mt - mb;

  const x = (i: number) => ml + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => mt + innerH - ((v - d0) / (d1 - d0 || 1)) * innerH;

  const xTickCount = innerW < 360 ? 3 : 5;
  const xTickIdx =
    n <= 1 ? [0] : Array.from(new Set(Array.from({ length: xTickCount }, (_, k) => Math.round((k * (n - 1)) / (xTickCount - 1)))));

  const pickIndex = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    const i = Math.round(((px - ml) / (innerW || 1)) * (n - 1));
    return Math.min(n - 1, Math.max(0, i));
  };

  const onPointerMove = (e: PointerEvent<SVGRectElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (svg) setHover(pickIndex(e.clientX, svg.getBoundingClientRect()));
  };

  const onKeyDown = (e: KeyboardEvent<SVGRectElement>) => {
    if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n - 1) - 1));
    else if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? n - 1) + 1));
    else return;
    e.preventDefault();
  };

  const tooltipLeft = hover != null ? x(hover) : 0;
  const flip = tooltipLeft > width / 2;

  return (
    <div className="chart" ref={ref} style={{ height }}>
      {width > 0 && n > 0 && (
        <svg width={width} height={height} role="img" aria-label={label}>
          {ticks.map((t, i) => (
            <g key={t}>
              <line x1={ml} x2={width - mr} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={ml - 8} y={y(t)} dy="0.32em" textAnchor="end" className="chart-tick">
                {tickLabels[i]}
              </text>
            </g>
          ))}

          {xTickIdx.map((i, k) => (
            <text
              key={i}
              x={x(i)}
              y={height - 6}
              textAnchor={k === 0 && n > 1 ? 'start' : k === xTickIdx.length - 1 && n > 1 ? 'end' : 'middle'}
              className="chart-tick"
            >
              {fmtShortDate(dates[i])}
            </text>
          ))}

          {reference && reference.value >= d0 && reference.value <= d1 && (
            <g>
              <line x1={ml} x2={width - mr} y1={y(reference.value)} y2={y(reference.value)} className="chart-reference" />
              <text x={ml + 6} y={y(reference.value) - 6} textAnchor="start" className="chart-reference-label">
                {reference.label}
              </text>
            </g>
          )}

          {series.map((s) => {
            const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
            const last = s.points[s.points.length - 1];
            return (
              <g key={s.id}>
                {area && n > 1 && (
                  <>
                    <defs>
                      <linearGradient id={`${gradientId}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" style={{ stopColor: s.color, stopOpacity: 0.22 }} />
                        <stop offset="100%" style={{ stopColor: s.color, stopOpacity: 0 }} />
                      </linearGradient>
                    </defs>
                    <path d={`${d}L${x(n - 1)},${mt + innerH}L${x(0)},${mt + innerH}Z`} fill={`url(#${gradientId}-${s.id})`} />
                  </>
                )}
                <path d={d} fill="none" style={{ stroke: s.color }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {last && hover == null && (
                  <circle cx={x(n - 1)} cy={y(last.value)} r={4} style={{ fill: s.color }} className="chart-dot" />
                )}
              </g>
            );
          })}

          {hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={mt} y2={mt + innerH} className="chart-crosshair" />
              {series.map((s) =>
                s.points[hover] ? (
                  <circle key={s.id} cx={x(hover)} cy={y(s.points[hover].value)} r={4.5} style={{ fill: s.color }} className="chart-dot" />
                ) : null,
              )}
            </g>
          )}

          <rect
            x={ml}
            y={0}
            width={innerW}
            height={height}
            fill="transparent"
            tabIndex={0}
            aria-label={`${label}. Use as setas para percorrer os dias.`}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerMove}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(n - 1)}
            onBlur={() => setHover(null)}
            onKeyDown={onKeyDown}
            className="chart-hit"
          />
        </svg>
      )}

      {hover != null && dates[hover] && (
        <div
          className="chart-tooltip"
          style={flip ? { right: width - tooltipLeft + 12 } : { left: tooltipLeft + 12 }}
          aria-live="polite"
        >
          <div className="chart-tooltip-date">{fmtLongDate(dates[hover])}</div>
          {series.map((s) =>
            s.points[hover] ? (
              <div key={s.id} className="chart-tooltip-row">
                <span className="line-key" style={{ background: s.color }} />
                <strong>{format(s.points[hover].value)}</strong>
                {series.length > 1 && <span className="chart-tooltip-label">{s.label}</span>}
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ points, height = 40, color = 'var(--label-3)' }: { points: PricePoint[]; height?: number; color?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 5;
  const x = (i: number) => pad + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (width - pad * 2));
  const y = (v: number) => pad + (max === min ? (height - pad * 2) / 2 : (1 - (v - min) / (max - min)) * (height - pad * 2));
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const last = points[points.length - 1];

  return (
    <div ref={ref} className="sparkline" style={{ height }} aria-hidden="true">
      {width > 0 && last && (
        <svg width={width} height={height}>
          <path d={d} fill="none" style={{ stroke: color }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(points.length - 1)} cy={y(last.value)} r={3.5} style={{ fill: color }} className="sparkline-dot" />
        </svg>
      )}
    </div>
  );
}
