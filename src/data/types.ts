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
  /**
   * O Google Hotels cobra cada criança como adulto. Muitos resorts não cobram crianças:
   * com true, o preço é calculado só pelos adultos.
   */
  childrenFree?: boolean;
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

/** Regimes: só hospedagem, café, meia pensão, pensão completa, all inclusive */
export type BoardCode = 'RO' | 'BI' | 'HB' | 'FB' | 'AI';

/** Hospedagem pela LiteAPI (com regime de cada tarifa) */
export type LodgingQuery = {
  cityName: string;
  countryCode: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  childrenAges: number[];
  board: BoardCode | 'any';
  stars?: number[];
  refundableOnly?: boolean;
  /** Hotel específico escolhido na busca */
  hotelId?: string;
  hotelName?: string;
};

export type MonitorQuery = ({ kind: 'voo' } & FlightQuery) | ({ kind: 'hotel' } & HotelQuery) | ({ kind: 'hospedagem' } & LodgingQuery);

/** serpapi/liteapi = preço real buscado automaticamente; manual = o usuário registra; simulado = exemplo */
export type MonitorSource = 'serpapi' | 'liteapi' | 'manual' | 'simulado';

export const isAuto = (m: { source: MonitorSource }) => m.source === 'serpapi' || m.source === 'liteapi';

export type BoardOption = {
  board: string;
  boardName: string;
  total: number;
  room: string;
  payAtHotel: { amount: number; currency: string } | null;
  refundable: boolean | null;
};

export type PriceInsights = {
  priceLevel?: 'low' | 'typical' | 'high' | null;
  typicalRange?: [number, number] | null;
  best?: string | null;
  /** Companhias da melhor opção de voo (para o link do site de cada uma) */
  airlines?: string[];
  /** Google Flights / Google Hotels com a busca já preenchida */
  bookingUrl?: string | null;
  /** Site oficial do hotel acompanhado */
  siteUrl?: string | null;
  /** Diária (hospedagem) */
  perNight?: number | null;
  /** Preço em cada site de reserva, segundo o Google (só para hotel específico) */
  sources?: BookingSource[];
  /** Hospedagem LiteAPI: tarifa acompanhada */
  board?: string | null;
  boardName?: string | null;
  room?: string | null;
  payAtHotel?: { amount: number; currency: string } | null;
  refundable?: boolean | null;
  /** Melhor tarifa de cada regime no hotel acompanhado */
  boards?: BoardOption[];
  /** Preço veio da chave de testes da LiteAPI */
  sandbox?: boolean;
};

export type BookingSource = {
  source: string;
  total: number;
  perNight: number | null;
  room: string | null;
  official: boolean;
  link: string | null;
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
