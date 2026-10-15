export type Category = 'voo' | 'hotel' | 'energia' | 'bancaria' | 'outro';

export const CATEGORY_LABEL: Record<Category, string> = {
  voo: 'Passagem aérea',
  hotel: 'Hospedagem',
  energia: 'Energia',
  bancaria: 'Tarifa bancária',
  outro: 'Outro',
};

export type PricePoint = { date: string; value: number };

/** Parâmetros da simulação de preços (só para os monitores de exemplo) */
export type SimParams = { base: number; vol: number; mode: 'daily' | 'rare' };

export type TravelClass = 1 | 2 | 3 | 4;
export type StopsFilter = 0 | 1 | 2 | 3;

export type FlightQuery = {
  origin: string;
  destination: string;
  tripType: 'ida-volta' | 'ida';
  departDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infantsInSeat: number;
  infantsOnLap: number;
  travelClass: TravelClass;
  stops: StopsFilter;
  bags: number;
};

export type HotelQuery = {
  location: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  childrenAges: number[];
  minRating?: 0 | 7 | 8 | 9;
  hotelClass?: number[];
  freeCancellation?: boolean;
  /** Códigos de comodidades do Google Hotels (ver HOTEL_AMENITIES) */
  amenities?: number[];
  /** Códigos de tipos de hospedagem do Google Hotels (ver PROPERTY_TYPES) */
  propertyTypes?: number[];
  /** Hospedagem específica escolhida na busca */
  propertyToken?: string;
  propertyName?: string;
};

export type MonitorQuery = ({ kind: 'voo' } & FlightQuery) | ({ kind: 'hotel' } & HotelQuery);

/** serpapi = preço real buscado no Google; manual = o usuário registra; simulado = exemplo */
export type MonitorSource = 'serpapi' | 'manual' | 'simulado';

export type PriceInsights = {
  priceLevel?: 'low' | 'typical' | 'high' | null;
  typicalRange?: [number, number] | null;
  best?: string | null;
};

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
  createdAt: string;
  source: MonitorSource;
  query?: MonitorQuery;
  insights?: PriceInsights | null;
  lastChecked?: string | null;
  lastError?: string | null;
  sim?: SimParams;
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
