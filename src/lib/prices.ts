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
  googleUrl: string | null;
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
  link: string | null;
};

/** partial = nenhum hotel atende a todos os filtros; as opções são as mais próximas */
export type HotelResult = { price: number; perNight: number | null; options: HotelOption[]; partial?: boolean; googleUrl: string | null };

export function flightInsights(r: FlightResult): PriceInsights {
  const best = r.options[0];
  return {
    priceLevel: r.priceLevel,
    typicalRange: r.typicalRange,
    best: best ? `${best.airlines.join(' + ')} · ${best.stops === 0 ? 'voo direto' : `${best.stops} ${best.stops === 1 ? 'parada' : 'paradas'}`}` : null,
    airlines: best?.airlines ?? [],
    bookingUrl: r.googleUrl,
  };
}

export function hotelInsights(r: HotelResult, tracked?: HotelOption | null): PriceInsights {
  const option = tracked ?? r.options[0];
  return {
    best: tracked ? null : option?.name ?? null,
    bookingUrl: r.googleUrl,
    siteUrl: option?.link ?? null,
  };
}

/** Link de reserva para monitores criados antes de existir o link salvo */
export function fallbackBookingUrl(m: Monitor): string | null {
  const q = m.query;
  if (q?.kind === 'voo') {
    const text = `Flights from ${q.origin} to ${q.destination} on ${q.departDate}${q.tripType === 'ida-volta' && q.returnDate ? ` through ${q.returnDate}` : ''}`;
    return `https://www.google.com/travel/flights?q=${encodeURIComponent(text)}&hl=pt-BR&gl=br&curr=BRL`;
  }
  if (q?.kind === 'hotel') {
    const params = new URLSearchParams({ q: q.propertyName ? `${q.propertyName} ${q.location}` : q.location, checkin: q.checkIn, checkout: q.checkOut, adults: String(q.adults), hl: 'pt-BR', gl: 'br', curr: 'BRL' });
    return `https://www.google.com/travel/search?${params}`;
  }
  return null;
}

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
    return { price: r.price, insights: flightInsights(r) };
  }
  if (m.query?.kind === 'hotel') {
    const r = await searchHotels(m.query);
    return { price: r.price, insights: hotelInsights(r, m.query.propertyToken ? r.options[0] : null) };
  }
  throw new Error('Este monitor não tem busca automática.');
}

/** Data da viagem já passou? (não faz sentido continuar buscando) */
export function isExpired(m: Monitor, today: string): boolean {
  if (m.query?.kind === 'voo') return m.query.departDate < today;
  if (m.query?.kind === 'hotel') return m.query.checkIn < today;
  return false;
}
