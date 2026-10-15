import { useState } from 'react';
import type { Monitor, PricePoint } from './types';

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export function useRange(key: string, initial: Range = 30) {
  const [range, setRange] = useState<Range>(() => {
    try {
      const v = Number(localStorage.getItem(`radar-tarifas:range:${key}`));
      return (RANGES as readonly number[]).includes(v) ? (v as Range) : initial;
    } catch {
      return initial;
    }
  });
  const update = (r: Range) => {
    setRange(r);
    try {
      localStorage.setItem(`radar-tarifas:range:${key}`, String(r));
    } catch {
      /* ignora */
    }
  };
  return [range, update] as const;
}

export type MonitorStats = {
  points: PricePoint[];
  current: number;
  start: number;
  change: number;
  min: number;
  max: number;
  avg: number;
  belowTarget: boolean;
};

export function monitorStats(m: Monitor, days: number): MonitorStats {
  const points = m.history.slice(-(days + 1));
  const values = points.map((p) => p.value);
  const current = values[values.length - 1] ?? 0;
  const start = values[0] ?? current;
  return {
    points,
    current,
    start,
    change: start ? ((current - start) / start) * 100 : 0,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / (values.length || 1),
    belowTarget: m.targetPrice != null && current <= m.targetPrice,
  };
}
