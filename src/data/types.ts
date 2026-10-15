export type Category = 'voo' | 'hotel' | 'energia' | 'bancaria' | 'outro';

export const CATEGORY_LABEL: Record<Category, string> = {
  voo: 'Passagem aérea',
  hotel: 'Hospedagem',
  energia: 'Energia',
  bancaria: 'Tarifa bancária',
  outro: 'Outro',
};

export type PricePoint = { date: string; value: number };

/** Parâmetros da simulação de preços (enquanto não há fonte real de dados) */
export type SimParams = { base: number; vol: number; mode: 'daily' | 'rare' };

export type Monitor = {
  id: string;
  name: string;
  category: Category;
  detail: string;
  /** Sufixo exibido após o valor, ex.: "/kWh" */
  unit: string;
  targetPrice: number | null;
  /** Variação diária (%) que dispara alerta de queda/alta */
  alertPct: number;
  active: boolean;
  history: PricePoint[];
  sim: SimParams;
  createdAt: string;
};

export type AlertKind = 'alvo' | 'queda' | 'alta';

export type Alert = {
  id: string;
  monitorId: string;
  kind: AlertKind;
  date: string;
  message: string;
  value: number;
  previous: number;
  read: boolean;
};

export type ThemePref = 'system' | 'light' | 'dark';
export type FreeModel = `free/${string}`;

export type Settings = {
  theme: ThemePref;
  notifications: boolean;
  alertOnRise: boolean;
  aiModel: FreeModel;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  at: string;
  error?: boolean;
};

export type AppData = {
  version: 1;
  monitors: Monitor[];
  alerts: Alert[];
  settings: Settings;
  chat: ChatMessage[];
};
