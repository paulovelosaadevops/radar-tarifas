import { daysBetween, parseISO, todayISO } from './dates';

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCompact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export const brl = (v: number, unit = '') => brlFmt.format(v) + unit;

/** Para eixos: sem centavos a partir de R$ 100 */
export const brlAxis = (v: number) => (Math.abs(v) >= 100 ? brlCompact.format(v) : brlFmt.format(v));

export const pct = (v: number) => `${pctFmt.format(Math.abs(v))}%`;
export const signedPct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${pct(v)}`;

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const longDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

export const fmtShortDate = (iso: string) => {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
export const fmtLongDate = (iso: string) => longDate.format(parseISO(iso));

export function fmtRelativeDay(iso: string): string {
  const diff = daysBetween(iso, todayISO());
  if (diff <= 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff < 7) return `Há ${diff} dias`;
  return fmtShortDate(iso);
}

export const fmtTime = (isoDateTime: string) =>
  new Date(isoDateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
