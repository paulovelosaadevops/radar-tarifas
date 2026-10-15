// Busca de preços reais via SerpApi (Google Flights e Google Hotels). A chave fica só no servidor.

const SERPAPI_URL = 'https://serpapi.com/search.json';
const IATA = /^[A-Z]{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

class BadRequest extends Error {}

function int(value: unknown, name: string, min: number, max: number, fallback?: number): number {
  const v = value === undefined || value === null || value === '' ? fallback : Number(value);
  if (v === undefined || !Number.isInteger(v) || v < min || v > max) throw new BadRequest(`"${name}" deve ser um número inteiro entre ${min} e ${max}.`);
  return v;
}

function date(value: unknown, name: string): string {
  if (typeof value !== 'string' || !DATE.test(value) || Number.isNaN(Date.parse(value))) throw new BadRequest(`"${name}" precisa estar no formato AAAA-MM-DD.`);
  // Margem de 1 dia por causa de fuso horário
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (value < yesterday) throw new BadRequest(`"${name}" já passou.`);
  return value;
}

function text(value: unknown, name: string, max = 120): string {
  if (typeof value !== 'string' || !value.trim()) throw new BadRequest(`Informe "${name}".`);
  return value.trim().slice(0, max);
}

async function serpapi(params: Record<string, string | number | undefined>) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error('SERPAPI_API_KEY não configurada no servidor.');

  const url = new URL(SERPAPI_URL);
  for (const [k, v] of Object.entries({ ...params, currency: 'BRL', hl: 'pt-br', gl: 'br' })) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  url.searchParams.set('api_key', apiKey);

  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  const data: any = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) {
    const message: string = data?.error || `SerpApi respondeu ${res.status}.`;
    // "hasn't returned any results" = busca válida, mas sem resultados
    if (/no results|any results/i.test(message)) return { empty: true, data: null };
    throw new Error(message);
  }
  return { empty: false, data };
}

async function searchFlights(q: any) {
  const origin = text(q?.origin, 'origem', 3).toUpperCase();
  const destination = text(q?.destination, 'destino', 3).toUpperCase();
  if (!IATA.test(origin) || !IATA.test(destination)) throw new BadRequest('Origem e destino precisam ser códigos de aeroporto com 3 letras.');
  if (origin === destination) throw new BadRequest('Origem e destino precisam ser diferentes.');

  const roundTrip = q?.tripType !== 'ida';
  const departDate = date(q?.departDate, 'data de ida');
  const returnDate = roundTrip ? date(q?.returnDate, 'data de volta') : undefined;
  if (returnDate && returnDate < departDate) throw new BadRequest('A volta precisa ser depois da ida.');

  const adults = int(q?.adults, 'adultos', 1, 9);
  const children = int(q?.children, 'crianças', 0, 8, 0);
  const infantsInSeat = int(q?.infantsInSeat, 'bebês com assento', 0, 8, 0);
  const infantsOnLap = int(q?.infantsOnLap, 'bebês no colo', 0, 8, 0);
  if (adults + children + infantsInSeat + infantsOnLap > 9) throw new BadRequest('No máximo 9 passageiros por busca.');
  if (infantsOnLap > adults) throw new BadRequest('Cada bebê de colo precisa de um adulto.');

  const { empty, data } = await serpapi({
    engine: 'google_flights',
    departure_id: origin,
    arrival_id: destination,
    type: roundTrip ? 1 : 2,
    outbound_date: departDate,
    return_date: returnDate,
    adults,
    children,
    infants_in_seat: infantsInSeat,
    infants_on_lap: infantsOnLap,
    travel_class: int(q?.travelClass, 'classe', 1, 4, 1),
    stops: int(q?.stops, 'paradas', 0, 3, 0),
    bags: int(q?.bags, 'bagagem de mão', 0, adults + children + infantsInSeat, 0),
  });

  const flights: any[] = empty ? [] : [...(data.best_flights ?? []), ...(data.other_flights ?? [])].filter((f) => typeof f.price === 'number');
  const options = flights
    .sort((a, b) => a.price - b.price)
    .slice(0, 5)
    .map((f) => {
      const segments: any[] = f.flights ?? [];
      return {
        price: f.price,
        airlines: [...new Set(segments.map((s) => s.airline).filter(Boolean))],
        logo: f.airline_logo ?? segments[0]?.airline_logo ?? null,
        duration: f.total_duration ?? null,
        stops: Math.max(0, segments.length - 1),
        departure: segments[0]?.departure_airport?.time ?? null,
        arrival: segments[segments.length - 1]?.arrival_airport?.time ?? null,
      };
    });

  const insights = data?.price_insights ?? {};
  const lowest = Math.min(insights.lowest_price ?? Infinity, options[0]?.price ?? Infinity);
  if (!Number.isFinite(lowest)) return json(404, { error: 'Nenhum voo encontrado para essa busca. Tente outras datas ou aeroportos.' });

  return json(200, {
    price: lowest,
    priceLevel: insights.price_level ?? null,
    typicalRange: Array.isArray(insights.typical_price_range) ? insights.typical_price_range : null,
    options,
  });
}

async function searchHotels(q: any) {
  const location = text(q?.location, 'destino');
  const checkIn = date(q?.checkIn, 'check-in');
  const checkOut = date(q?.checkOut, 'check-out');
  if (checkOut <= checkIn) throw new BadRequest('O check-out precisa ser depois do check-in.');

  const adults = int(q?.adults, 'adultos', 1, 12);
  const childrenAges: number[] = Array.isArray(q?.childrenAges) ? q.childrenAges.map((a: unknown, i: number) => int(a, `idade da criança ${i + 1}`, 0, 17)) : [];
  if (childrenAges.length > 8) throw new BadRequest('No máximo 8 crianças por busca.');

  const rating = q?.minRating ? int(q.minRating, 'avaliação mínima', 7, 9) : undefined;
  const classes: number[] = Array.isArray(q?.hotelClass) ? q.hotelClass.map((c: unknown) => int(c, 'estrelas', 2, 5)) : [];
  const propertyToken = typeof q?.propertyToken === 'string' && /^[\w-]{10,400}$/.test(q.propertyToken) ? q.propertyToken : undefined;

  const { empty, data } = await serpapi({
    engine: 'google_hotels',
    q: location,
    check_in_date: checkIn,
    check_out_date: checkOut,
    adults,
    children: childrenAges.length,
    // A API não aceita idade 0: bebês contam como 1 ano
    children_ages: childrenAges.length ? childrenAges.map((a) => Math.max(1, a)).join(',') : undefined,
    sort_by: propertyToken ? undefined : 3,
    rating,
    hotel_class: classes.length ? classes.join(',') : undefined,
    free_cancellation: q?.freeCancellation ? 'true' : undefined,
    property_token: propertyToken,
  });

  const toOption = (p: any) => ({
    token: p.property_token ?? propertyToken ?? null,
    name: p.name ?? 'Hospedagem',
    total: p.total_rate?.extracted_lowest ?? p.prices?.[0]?.total_rate?.extracted_lowest ?? null,
    perNight: p.rate_per_night?.extracted_lowest ?? p.prices?.[0]?.rate_per_night?.extracted_lowest ?? null,
    rating: p.overall_rating ?? null,
    reviews: p.reviews ?? null,
    stars: p.extracted_hotel_class ?? null,
    thumbnail: p.images?.[0]?.thumbnail ?? null,
  });

  const options = empty
    ? []
    : propertyToken
      ? [toOption(data)].filter((o) => typeof o.total === 'number')
      : (data.properties ?? [])
          .map(toOption)
          .filter((o: any) => typeof o.total === 'number')
          .sort((a: any, b: any) => a.total - b.total)
          .slice(0, 8);

  if (options.length === 0) {
    return json(404, {
      error: propertyToken
        ? 'Esta hospedagem não tem preço para essas datas.'
        : 'Nenhuma hospedagem com preço encontrada. Tente outro destino, datas ou menos filtros.',
    });
  }
  return json(200, { price: options[0].total, perNight: options[0].perNight, options });
}

export async function POST(request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Corpo da requisição precisa ser JSON.' });
  }

  try {
    if (body?.kind === 'voo') return await searchFlights(body.query);
    if (body?.kind === 'hotel') return await searchHotels(body.query);
    return json(400, { error: 'Tipo de busca inválido. Use "voo" ou "hotel".' });
  } catch (err) {
    if (err instanceof BadRequest) return json(400, { error: err.message });
    return json(502, { error: err instanceof Error ? err.message : 'Falha na busca de preços.' });
  }
}
