import type { BoardOption, BookingSource, FlightQuery, HotelQuery, LodgingQuery, Monitor, PriceInsights } from '../data/types';

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
export type HotelResult = {
  price: number;
  perNight: number | null;
  options: HotelOption[];
  partial?: boolean;
  googleUrl: string | null;
  sources?: BookingSource[];
};

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
    perNight: option?.perNight ?? r.perNight ?? null,
    sources: r.sources ?? [],
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

/** Links públicos de busca (Booking.com e Google) já com hotel, datas e hóspedes */
export function lodgingLinks(q: LodgingQuery): { booking: string; google: string } {
  const where = q.hotelName ? `${q.hotelName}, ${q.cityName}` : q.cityName;
  const booking = new URLSearchParams({
    ss: where,
    checkin: q.checkIn,
    checkout: q.checkOut,
    group_adults: String(q.adults),
    group_children: String(q.childrenAges.length),
    no_rooms: '1',
    selected_currency: 'BRL',
  });
  q.childrenAges.forEach((age) => booking.append('age', String(age)));
  const google = new URLSearchParams({ q: where, checkin: q.checkIn, checkout: q.checkOut, adults: String(q.adults), hl: 'pt-BR', gl: 'br', curr: 'BRL' });
  return {
    booking: `https://www.booking.com/searchresults.pt-br.html?${booking}`,
    google: `https://www.google.com/travel/search?${google}`,
  };
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

/* ---------- Hospedagem (LiteAPI) ---------- */

export type LodgingOption = {
  hotelId: string;
  name: string;
  stars: number | null;
  rating: number | null;
  reviews: number | null;
  thumbnail: string | null;
  address: string | null;
  total: number;
  perNight: number;
  board: string;
  boardName: string;
  room: string;
  payAtHotel: { amount: number; currency: string } | null;
  refundable: boolean | null;
};

export type LodgingResult = { sandbox: boolean; price: number; perNight: number; options: LodgingOption[]; boards: BoardOption[] };

export const searchLodging = (query: LodgingQuery) =>
  request<LodgingResult>('/api/hospedagem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });

export function lodgingInsights(r: LodgingResult, tracked?: LodgingOption | null): PriceInsights {
  const o = tracked ?? r.options[0];
  return {
    best: tracked ? null : o?.name ?? null,
    perNight: o?.perNight ?? r.perNight,
    board: o?.board ?? null,
    boardName: o?.boardName ?? null,
    room: o?.room ?? null,
    payAtHotel: o?.payAtHotel ?? null,
    refundable: o?.refundable ?? null,
    boards: r.boards ?? [],
    sandbox: r.sandbox,
  };
}

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
  if (m.query?.kind === 'hospedagem') {
    const r = await searchLodging(m.query);
    const insights = lodgingInsights(r, m.query.hotelId ? r.options[0] : null);
    return { price: r.price, insights: { ...insights, bookingUrl: m.insights?.bookingUrl ?? null } };
  }
  throw new Error('Este monitor não tem busca automática.');
}

/** Data da viagem já passou? (não faz sentido continuar buscando) */
export function isExpired(m: Monitor, today: string): boolean {
  if (m.query?.kind === 'voo') return m.query.departDate < today;
  if (m.query?.kind === 'hotel' || m.query?.kind === 'hospedagem') return m.query.checkIn < today;
  return false;
}
