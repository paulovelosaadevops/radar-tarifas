// Dados de exemplo para a primeira abertura do app
import { addDays, todayISO } from '../lib/dates';
import { buildHistory, evaluate } from './simulate';
import type { Alert, AppData, Category, Monitor, Settings, SimParams } from './types';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  notifications: false,
  alertOnRise: false,
  aiModel: 'free/deepseek-v4.1-flash',
};

type SeedMonitor = {
  id: string;
  name: string;
  category: Category;
  detail: string;
  unit?: string;
  targetPrice: number | null;
  alertPct?: number;
  sim: SimParams;
};

const SEED: SeedMonitor[] = [
  { id: 'gru-lis', name: 'São Paulo → Lisboa', category: 'voo', detail: 'GRU–LIS · ida e volta · março/2027', targetPrice: 4300, sim: { base: 4890, vol: 0.035, mode: 'daily' } },
  { id: 'gru-rec', name: 'São Paulo → Recife', category: 'voo', detail: 'GRU–REC · ida e volta · janeiro/2027', targetPrice: 950, sim: { base: 1180, vol: 0.045, mode: 'daily' } },
  { id: 'gig-eze', name: 'Rio → Buenos Aires', category: 'voo', detail: 'GIG–EZE · ida e volta · dezembro/2026', targetPrice: 1800, sim: { base: 2150, vol: 0.04, mode: 'daily' } },
  { id: 'hotel-rj', name: 'Hotel em Copacabana', category: 'hotel', detail: '3 diárias · casal · réveillon', targetPrice: 1400, sim: { base: 1650, vol: 0.025, mode: 'daily' } },
  { id: 'energia-sp', name: 'Energia residencial', category: 'energia', detail: 'Tarifa por kWh · bandeira vigente', unit: '/kWh', targetPrice: null, alertPct: 3, sim: { base: 0.92, vol: 0.02, mode: 'rare' } },
  { id: 'pacote-banco', name: 'Pacote de serviços bancários', category: 'bancaria', detail: 'Mensalidade da conta corrente', unit: '/mês', targetPrice: 29.9, alertPct: 3, sim: { base: 39.9, vol: 0.02, mode: 'rare' } },
];

export function createSeed(): AppData {
  const today = todayISO();
  const createdAt = addDays(today, -120);
  const alerts: Alert[] = [];

  const monitors: Monitor[] = SEED.map((s) => {
    const monitor: Monitor = {
      id: s.id,
      name: s.name,
      category: s.category,
      detail: s.detail,
      unit: s.unit ?? '',
      targetPrice: s.targetPrice,
      alertPct: s.alertPct ?? 5,
      active: true,
      sim: s.sim,
      history: buildHistory(s.id, s.sim, 120, today),
      createdAt,
    };

    // Alertas dos últimos 30 dias, para a tela de alertas já ter conteúdo
    const h = monitor.history;
    for (let i = h.length - 30; i < h.length; i++) {
      const alert = evaluate(monitor, h[i - 1].value, h[i].value, h[i].date, DEFAULT_SETTINGS.alertOnRise);
      if (alert) alerts.push({ ...alert, read: h[i].date < addDays(today, -3) });
    }
    return monitor;
  });

  alerts.sort((a, b) => b.date.localeCompare(a.date));
  return { version: 1, monitors, alerts, settings: DEFAULT_SETTINGS, chat: [] };
}
