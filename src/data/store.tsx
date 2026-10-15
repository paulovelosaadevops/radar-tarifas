import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { todayISO } from '../lib/dates';
import { uid } from '../lib/random';
import { createSeed, DEFAULT_SETTINGS } from './seed';
import { catchUp, recheckToday } from './simulate';
import type { Alert, AppData, ChatMessage, Monitor, Settings } from './types';

const STORAGE_KEY = 'radar-tarifas:v1';

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as AppData;
      if (data?.version === 1) return { ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings } };
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

export type NewMonitor = Pick<Monitor, 'name' | 'category' | 'detail' | 'unit' | 'targetPrice' | 'alertPct'> & {
  currentPrice: number;
};

type Store = AppData & {
  unreadCount: number;
  addMonitor: (m: NewMonitor) => string;
  updateMonitor: (id: string, patch: Partial<Monitor>) => void;
  deleteMonitor: (id: string) => void;
  checkNow: () => number;
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
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => save(data), [data]);

  useEffect(() => {
    if (data.settings.notifications) notify(startup.current);
    startup.current = [];
    // só na abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      sim: { base: m.currentPrice, vol: m.category === 'energia' || m.category === 'bancaria' ? 0.02 : 0.03, mode: m.category === 'energia' || m.category === 'bancaria' ? 'rare' : 'daily' },
      history: [{ date: today, value: m.currentPrice }],
      createdAt: today,
    };
    setData((d) => ({ ...d, monitors: [...d.monitors, monitor] }));
    return id;
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

  const checkNow = useCallback(() => {
    const d = dataRef.current;
    const caught = catchUp(d.monitors, d.settings.alertOnRise);
    const rechecked = recheckToday(caught.monitors, d.settings.alertOnRise);
    const found = [...caught.alerts, ...rechecked.alerts];
    const next = { ...d, monitors: rechecked.monitors, alerts: [...[...found].reverse(), ...d.alerts] };
    dataRef.current = next;
    setData(next);
    if (d.settings.notifications) notify(found);
    return found.length;
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
      addMonitor,
      updateMonitor,
      deleteMonitor,
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
    [data, pendingPrompt, addMonitor, updateMonitor, deleteMonitor, checkNow, markAlertRead, markAllRead, clearAlerts, updateSettings, setChat, resetDemo, clearAll],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore fora do StoreProvider');
  return store;
}
