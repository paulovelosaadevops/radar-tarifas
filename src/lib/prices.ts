import type { FlightQuery, HotelQuery, Monitor, PriceInsights } from '../data/types';

export type FlightOption = {
  price: number;
  airlines: string[];
  logo: string | null;
  duration: number | null;
  stops: number;
  departure: string | null;
  arrival: string | null;
};

export type FlightResult = {
  price: number;
  priceLevel: PriceInsights['priceLevel'];
  typicalRange: [number, number] | null;
  options: FlightOption[];
};

export type HotelOption = {
  token: string | null;
  name: string;
  total: number;
  perNight: number | null;
  rating: number | null;
  reviews: number | null;
  stars: number | null;
  thumbnail: string | null;
};

export type HotelResult = { price: number; perNight: number | null; options: HotelOption[] };

export type Quota = { plan: string; perMonth: number; left: number; used: number };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('Sem conexão com o servidor.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status} na busca de preços.`);
  return data as T;
}

const post = <T>(kind: 'voo' | 'hotel', query: unknown) =>
  request<T>('/api/precos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, query }) });

export const searchFlights = (q: FlightQuery) => post<FlightResult>('voo', q);
export const searchHotels = (q: HotelQuery) => post<HotelResult>('hotel', q);
export const fetchQuota = () => request<Quota>('/api/cota');

/** Busca o preço atual de um monitor com consulta real */
export async function fetchMonitorPrice(m: Monitor): Promise<{ price: number; insights: PriceInsights }> {
  if (m.query?.kind === 'voo') {
    const r = await searchFlights(m.query);
    const best = r.options[0];
    return {
      price: r.price,
      insights: {
        priceLevel: r.priceLevel,
        typicalRange: r.typicalRange,
        best: best ? `${best.airlines.join(' + ')} · ${best.stops === 0 ? 'voo direto' : `${best.stops} ${best.stops === 1 ? 'parada' : 'paradas'}`}` : null,
      },
    };
  }
  if (m.query?.kind === 'hotel') {
    const r = await searchHotels(m.query);
    return { price: r.price, insights: { best: m.query.propertyToken ? null : r.options[0]?.name ?? null } };
  }
  throw new Error('Este monitor não tem busca automática.');
}

/** Data da viagem já passou? (não faz sentido continuar buscando) */
export function isExpired(m: Monitor, today: string): boolean {
  if (m.query?.kind === 'voo') return m.query.departDate < today;
  if (m.query?.kind === 'hotel') return m.query.checkIn < today;
  return false;
}
