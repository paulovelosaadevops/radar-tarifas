// Simulação de preços. Substituir por uma fonte real quando existir.
import { addDays, todayISO } from '../lib/dates';
import { brl, pct } from '../lib/format';
import { gaussian, hashString, seeded, uid } from '../lib/random';
import type { Alert, Monitor, PricePoint, SimParams } from './types';

const MAX_HISTORY = 365;
const round2 = (v: number) => Math.round(v * 100) / 100;

export function nextValue(id: string, date: string, prev: number, sim: SimParams, rand?: () => number): number {
  const r = rand ?? seeded(hashString(id + date));
  if (sim.mode === 'rare') {
    // Tarifas reguladas: ficam paradas e mudam de vez em quando
    return r() < 0.03 ? round2(prev * (1 + (r() - 0.4) * sim.vol * 6)) : prev;
  }
  const shock = gaussian(r) * sim.vol;
  const pull = ((sim.base - prev) / sim.base) * 0.08;
  return round2(Math.max(sim.base * 0.4, prev * (1 + shock + pull)));
}

export function buildHistory(id: string, sim: SimParams, days: number, end = todayISO()): PricePoint[] {
  const out: PricePoint[] = [];
  let v = sim.base;
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    if (out.length > 0) v = nextValue(id, date, v, sim);
    out.push({ date, value: v });
  }
  return out;
}

export function evaluate(m: Monitor, prev: number, curr: number, date: string, alertOnRise: boolean): Alert | null {
  if (prev <= 0 || curr === prev) return null;
  const change = ((curr - prev) / prev) * 100;
  const base = { id: uid(), monitorId: m.id, date, value: curr, previous: prev, read: false };
  const unit = m.unit;

  if (m.targetPrice != null && curr <= m.targetPrice && prev > m.targetPrice) {
    return {
      ...base,
      kind: 'alvo',
      message: `${m.name} chegou a ${brl(curr, unit)}, abaixo do seu alvo de ${brl(m.targetPrice, unit)}.`,
    };
  }
  if (-change >= m.alertPct) {
    return { ...base, kind: 'queda', message: `${m.name} caiu ${pct(change)}: de ${brl(prev, unit)} para ${brl(curr, unit)}.` };
  }
  if (alertOnRise && change >= m.alertPct) {
    return { ...base, kind: 'alta', message: `${m.name} subiu ${pct(change)}: de ${brl(prev, unit)} para ${brl(curr, unit)}.` };
  }
  return null;
}

/** Completa o histórico até hoje e devolve os alertas gerados no caminho */
export function catchUp(monitors: Monitor[], alertOnRise: boolean): { monitors: Monitor[]; alerts: Alert[] } {
  const today = todayISO();
  const alerts: Alert[] = [];

  const updated = monitors.map((m) => {
    const last = m.history[m.history.length - 1];
    if (!m.active || !last || last.date >= today) return m;

    const history = [...m.history];
    let prev = last.value;
    let date = last.date;
    // Depois de muito tempo fechado, não simula mais que um ano
    if (addDays(date, MAX_HISTORY) < today) date = addDays(today, -MAX_HISTORY);

    while (date < today) {
      date = addDays(date, 1);
      const value = nextValue(m.id, date, prev, m.sim);
      history.push({ date, value });
      const alert = evaluate(m, prev, value, date, alertOnRise);
      if (alert) alerts.push(alert);
      prev = value;
    }
    return { ...m, history: history.slice(-MAX_HISTORY) };
  });

  return { monitors: updated, alerts };
}

/** "Verificar agora": consulta de novo o preço de hoje */
export function recheckToday(monitors: Monitor[], alertOnRise: boolean): { monitors: Monitor[]; alerts: Alert[] } {
  const alerts: Alert[] = [];
  const updated = monitors.map((m) => {
    const last = m.history[m.history.length - 1];
    if (!m.active || !last) return m;
    const value = nextValue(m.id, last.date, last.value, m.sim, Math.random);
    const alert = evaluate(m, last.value, value, last.date, alertOnRise);
    if (alert) alerts.push(alert);
    return { ...m, history: [...m.history.slice(0, -1), { date: last.date, value }] };
  });
  return { monitors: updated, alerts };
}
