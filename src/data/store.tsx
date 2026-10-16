import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { todayISO } from '../lib/dates';
import { fetchMonitorPrice, isExpired } from '../lib/prices';
import { uid } from '../lib/random';
import { createSeed, DEFAULT_SETTINGS } from './seed';
import { catchUp, evaluate, recheckToday } from './simulate';
import { isAuto, type Alert, type AppData, type ChatMessage, type Monitor, type MonitorQuery, type PriceInsights, type Settings } from './types';

const STORAGE_KEY = 'radar-tarifas:v1';
const MAX_HISTORY = 365;
/** Limite de buscas reais automáticas por abertura do app (protege a cota do SerpApi) */
const MAX_AUTO_REFRESH = 10;

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as AppData;
      if (data?.version === 1) {
        return {
          ...data,
          settings: { ...DEFAULT_SETTINGS, ...data.settings },
          // Monitores salvos antes da integração eram todos simulados
          monitors: data.monitors.map((m) => ({ ...m, source: m.source ?? (m.sim ? 'simulado' : 'manual') })),
        };
      }
    }
  } catch {
    /* sem armazenamento disponível: segue com dados de exemplo */
  }
  return createSeed();
}

function save(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignora: modo privado ou armazenamento cheio */
  }
}

/** Grava o preço de hoje (substitui se já houver um) e avalia alertas */
function withPrice(m: Monitor, value: number, alertOnRise: boolean): { monitor: Monitor; alert: Alert | null } {
  const today = todayISO();
  const last = m.history[m.history.length - 1];
  const sameDay = last?.date === today;
  const prev = last?.value;
  const history = sameDay ? [...m.history.slice(0, -1), { date: today, value }] : [...m.history, { date: today, value }];
  const alert = prev != null ? evaluate(m, prev, value, today, alertOnRise) : null;
  return { monitor: { ...m, history: history.slice(-MAX_HISTORY) }, alert };
}

export type NewMonitor = Pick<Monitor, 'name' | 'category' | 'detail' | 'unit' | 'targetPrice' | 'alertPct'> & {
  currentPrice: number;
  source: 'serpapi' | 'liteapi' | 'manual';
  query?: MonitorQuery;
  insights?: PriceInsights | null;
};

export type CheckResult = { alerts: number; errors: number; checked: number };

type Store = AppData & {
  unreadCount: number;
  refreshing: boolean;
  addMonitor: (m: NewMonitor) => string;
  updateMonitor: (id: string, patch: Partial<Monitor>) => void;
  deleteMonitor: (id: string) => void;
  recordPrice: (id: string, value: number) => void;
  refreshMonitor: (id: string) => Promise<boolean>;
  checkNow: () => Promise<CheckResult>;
  markAlertRead: (id: string) => void;
  markAllRead: () => void;
  clearAlerts: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setChat: (update: (chat: ChatMessage[]) => ChatMessage[]) => void;
  pendingPrompt: string | null;
  setPendingPrompt: (p: string | null) => void;
  resetDemo: () => void;
  clearAll: () => void;
};

const StoreContext = createContext<Store | null>(null);

async function notify(alerts: Alert[]) {
  if (alerts.length === 0 || !('Notification' in window) || Notification.permission !== 'granted') return;
  const title = alerts.length === 1 ? 'Radar de Tarifas' : `Radar de Tarifas: ${alerts.length} alertas`;
  const body = alerts.length === 1 ? alerts[0].message : alerts.slice(0, 3).map((a) => a.message).join('\n');
  const options = { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'radar-alertas' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    /* notificação não suportada neste navegador */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const startup = useRef<Alert[]>([]);
  const [data, setData] = useState<AppData>(() => {
    const loaded = load();
    const { monitors, alerts } = catchUp(loaded.monitors, loaded.settings.alertOnRise);
    startup.current = alerts;
    return { ...loaded, monitors, alerts: [...alerts.reverse(), ...loaded.alerts] };
  });
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  const busy = useRef(false);
  /** Monitores recém-criados que devem buscar o preço completo logo em seguida */
  const pendingRefresh = useRef<string[]>([]);

  const commit = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  useEffect(() => save(data), [data]);

  /** Busca o preço real de um monitor e grava. Devolve o alerta gerado, se houver. */
  const refreshOne = useCallback(
    async (id: string): Promise<{ ok: boolean; alert: Alert | null }> => {
      const m = dataRef.current.monitors.find((x) => x.id === id);
      if (!m || !isAuto(m)) return { ok: false, alert: null };
      const now = new Date().toISOString();

      if (isExpired(m, todayISO())) {
        const d = dataRef.current;
        commit({ ...d, monitors: d.monitors.map((x) => (x.id === id ? { ...x, lastError: 'A data da viagem já passou. Este monitor não é mais atualizado.' } : x)) });
        return { ok: false, alert: null };
      }

      try {
        const { price, insights } = await fetchMonitorPrice(m);
        const d = dataRef.current;
        const current = d.monitors.find((x) => x.id === id);
        if (!current) return { ok: false, alert: null };
        const { monitor, alert } = withPrice(current, price, d.settings.alertOnRise);
        commit({
          ...d,
          monitors: d.monitors.map((x) => (x.id === id ? { ...monitor, insights, lastChecked: now, lastError: null } : x)),
          alerts: alert ? [alert, ...d.alerts] : d.alerts,
        });
        return { ok: true, alert };
      } catch (err) {
        const d = dataRef.current;
        const message = err instanceof Error ? err.message : 'Falha ao buscar o preço.';
        commit({ ...d, monitors: d.monitors.map((x) => (x.id === id ? { ...x, lastChecked: now, lastError: message } : x)) });
        return { ok: false, alert: null };
      }
    },
    [commit],
  );

  /** Atualiza os monitores reais. force = ignora o "uma vez por dia". */
  const refreshReal = useCallback(
    async (force: boolean): Promise<CheckResult & { found: Alert[] }> => {
      const today = todayISO();
      const due = dataRef.current.monitors.filter(
        (m) => isAuto(m) && m.active && !isExpired(m, today) && (force || !m.lastChecked || m.lastChecked.slice(0, 10) < today),
      );
      const list = force ? due : due.slice(0, MAX_AUTO_REFRESH);
      const found: Alert[] = [];
      let errors = 0;
      for (const m of list) {
        const { ok, alert } = await refreshOne(m.id);
        if (!ok) errors++;
        if (alert) found.push(alert);
      }
      return { alerts: found.length, errors, checked: list.length, found };
    },
    [refreshOne],
  );

  // Na abertura: notifica alertas simulados e busca preços reais vencidos (no máximo 1x por dia)
  useEffect(() => {
    // Em desenvolvimento o React roda este efeito duas vezes: "busy" garante uma única busca
    if (busy.current) return;
    const initial = startup.current;
    startup.current = [];
    busy.current = true;
    setRefreshing(true);
    refreshReal(false)
      .then(({ found }) => {
        if (dataRef.current.settings.notifications) notify([...initial, ...found]);
      })
      .finally(() => {
        busy.current = false;
        setRefreshing(false);
      });
  }, [refreshReal]);

  const checkNow = useCallback(async (): Promise<CheckResult> => {
    if (busy.current) return { alerts: 0, errors: 0, checked: 0 };
    busy.current = true;
    setRefreshing(true);
    try {
      const d = dataRef.current;
      const caught = catchUp(d.monitors, d.settings.alertOnRise);
      const rechecked = recheckToday(caught.monitors, d.settings.alertOnRise);
      const simulated = [...caught.alerts, ...rechecked.alerts];
      commit({ ...d, monitors: rechecked.monitors, alerts: [...[...simulated].reverse(), ...d.alerts] });

      const real = await refreshReal(true);
      const found = [...simulated, ...real.found];
      if (dataRef.current.settings.notifications) notify(found);
      return { alerts: found.length, errors: real.errors, checked: real.checked };
    } finally {
      busy.current = false;
      setRefreshing(false);
    }
  }, [commit, refreshReal]);

  const refreshMonitor = useCallback(
    async (id: string) => {
      setRefreshing(true);
      try {
        const { ok, alert } = await refreshOne(id);
        if (alert && dataRef.current.settings.notifications) notify([alert]);
        return ok;
      } finally {
        setRefreshing(false);
      }
    },
    [refreshOne],
  );

  useEffect(() => {
    if (pendingRefresh.current.length === 0) return;
    const ids = pendingRefresh.current.splice(0);
    ids.forEach((id) => refreshMonitor(id));
  }, [data, refreshMonitor]);

  const addMonitor = useCallback((m: NewMonitor) => {
    const id = uid();
    const today = todayISO();
    const monitor: Monitor = {
      id,
      name: m.name,
      category: m.category,
      detail: m.detail,
      unit: m.unit,
      targetPrice: m.targetPrice,
      alertPct: m.alertPct,
      active: true,
      source: m.source,
      query: m.query,
      insights: m.insights ?? null,
      lastChecked: m.source !== 'manual' ? new Date().toISOString() : null,
      lastError: null,
      history: [{ date: today, value: m.currentPrice }],
      createdAt: today,
    };
    setData((d) => ({ ...d, monitors: [...d.monitors, monitor] }));
    // Hotel específico na LiteAPI (sem cota mensal): busca já todos os regimes do hotel
    if (m.query?.kind === 'hospedagem' && m.query.hotelId) pendingRefresh.current.push(id);
    return id;
  }, []);

  const recordPrice = useCallback((id: string, value: number) => {
    setData((d) => {
      const m = d.monitors.find((x) => x.id === id);
      if (!m) return d;
      const { monitor, alert } = withPrice(m, value, d.settings.alertOnRise);
      return {
        ...d,
        monitors: d.monitors.map((x) => (x.id === id ? { ...monitor, lastChecked: new Date().toISOString() } : x)),
        alerts: alert ? [alert, ...d.alerts] : d.alerts,
      };
    });
  }, []);

  const updateMonitor = useCallback((id: string, patch: Partial<Monitor>) => {
    setData((d) => ({ ...d, monitors: d.monitors.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  }, []);

  const deleteMonitor = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      monitors: d.monitors.filter((m) => m.id !== id),
      alerts: d.alerts.filter((a) => a.monitorId !== id),
    }));
  }, []);

  const markAlertRead = useCallback((id: string) => {
    setData((d) => ({ ...d, alerts: d.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)) }));
  }, []);

  const markAllRead = useCallback(() => {
    setData((d) => ({ ...d, alerts: d.alerts.map((a) => ({ ...a, read: true })) }));
  }, []);

  const clearAlerts = useCallback(() => setData((d) => ({ ...d, alerts: [] })), []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const setChat = useCallback((update: (chat: ChatMessage[]) => ChatMessage[]) => {
    setData((d) => ({ ...d, chat: update(d.chat) }));
  }, []);

  const resetDemo = useCallback(() => setData((d) => ({ ...createSeed(), settings: d.settings })), []);
  const clearAll = useCallback(
    () => setData((d) => ({ version: 1, monitors: [], alerts: [], chat: [], settings: d.settings })),
    [],
  );

  const value = useMemo<Store>(
    () => ({
      ...data,
      unreadCount: data.alerts.filter((a) => !a.read).length,
      refreshing,
      addMonitor,
      updateMonitor,
      deleteMonitor,
      recordPrice,
      refreshMonitor,
      checkNow,
      markAlertRead,
      markAllRead,
      clearAlerts,
      updateSettings,
      setChat,
      pendingPrompt,
      setPendingPrompt,
      resetDemo,
      clearAll,
    }),
    [data, refreshing, pendingPrompt, addMonitor, updateMonitor, deleteMonitor, recordPrice, refreshMonitor, checkNow, markAlertRead, markAllRead, clearAlerts, updateSettings, setChat, resetDemo, clearAll],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore fora do StoreProvider');
  return store;
}
