// Hospedagem via LiteAPI: tarifas reais com regime (café, meia pensão, all inclusive...). A chave fica só no servidor.

const LITEAPI_URL = 'https://api.liteapi.travel/v3.0';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const BOARDS = new Set(['RO', 'BI', 'HB', 'FB', 'AI']);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

class BadRequest extends Error {}

function int(value: unknown, name: string, min: number, max: number): number {
  const v = Number(value);
  if (!Number.isInteger(v) || v < min || v > max) throw new BadRequest(`"${name}" deve ser um número inteiro entre ${min} e ${max}.`);
  return v;
}

function date(value: unknown, name: string): string {
  if (typeof value !== 'string' || !DATE.test(value) || Number.isNaN(Date.parse(value))) throw new BadRequest(`"${name}" precisa estar no formato AAAA-MM-DD.`);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (value < yesterday) throw new BadRequest(`"${name}" já passou.`);
  return value;
}

const nightsBetween = (a: string, b: string) => Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000));

type Rate = {
  board: string;
  boardName: string;
  room: string;
  total: number;
  payAtHotel: { amount: number; currency: string } | null;
  refundable: boolean | null;
};

/** Converte as tarifas de um hotel no formato do app (só hospedagem no total; taxas pagas no hotel à parte) */
function ratesOf(hotel: any): Rate[] {
  const out: Rate[] = [];
  for (const roomType of hotel?.roomTypes ?? []) {
    for (const r of roomType?.rates ?? []) {
      const total = r?.retailRate?.total?.[0]?.amount;
      if (typeof total !== 'number') continue;
      const excluded = (r.retailRate?.taxesAndFees ?? []).filter((t: any) => t && t.included === false && typeof t.amount === 'number');
      const payAtHotel = excluded.length
        ? { amount: excluded.reduce((s: number, t: any) => s + t.amount, 0), currency: excluded[0].currency ?? 'BRL' }
        : null;
      out.push({
        board: String(r.boardType ?? ''),
        boardName: String(r.boardName ?? ''),
        room: String(r.name ?? roomType.name ?? ''),
        total: Math.round(total * 100) / 100,
        payAtHotel,
        refundable: r.cancellationPolicies?.refundableTag ? r.cancellationPolicies.refundableTag === 'RFN' : null,
      });
    }
  }
  return out.sort((a, b) => a.total - b.total);
}

async function liteapi(path: string, body: unknown) {
  const apiKey = process.env.LITEAPI_API_KEY;
  if (!apiKey) throw new Error('LITEAPI_API_KEY não configurada no servidor.');
  const res = await fetch(`${LITEAPI_URL}${path}`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });
  const data: any = await res.json().catch(() => null);
  // "Sem disponibilidade" (código 2001) não é erro: só não há tarifas
  if (data?.error?.code === 2001) return { data: [], hotels: [], sandbox: data.sandbox };
  if (!res.ok || !data || data.error) {
    throw new Error(`LiteAPI (${res.status}): ${data?.error?.message || data?.message || 'resposta inválida'}`);
  }
  return data;
}

export async function POST(request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Corpo da requisição precisa ser JSON.' });
  }

  try {
    const q = body?.query ?? {};
    const checkIn = date(q.checkIn, 'check-in');
    const checkOut = date(q.checkOut, 'check-out');
    if (checkOut <= checkIn) throw new BadRequest('O check-out precisa ser depois do check-in.');

    const adults = int(q.adults, 'adultos', 1, 12);
    const childrenAges: number[] = Array.isArray(q.childrenAges) ? q.childrenAges.map((a: unknown, i: number) => int(a, `idade da criança ${i + 1}`, 0, 17)) : [];
    if (childrenAges.length > 8) throw new BadRequest('No máximo 8 crianças por busca.');

    const board = q.board === 'any' || q.board == null ? null : String(q.board);
    if (board && !BOARDS.has(board)) throw new BadRequest('Regime inválido.');

    const stars: number[] = Array.isArray(q.stars) ? q.stars.map((s: unknown) => int(s, 'estrelas', 1, 5)) : [];
    const hotelId = typeof q.hotelId === 'string' && /^[\w-]{3,40}$/.test(q.hotelId) ? q.hotelId : null;

    const base: Record<string, unknown> = {
      occupancies: [{ adults, children: childrenAges }],
      currency: 'BRL',
      guestNationality: 'BR',
      checkin: checkIn,
      checkout: checkOut,
      timeout: 15,
      ...(q.refundableOnly ? { refundableRatesOnly: true } : {}),
    };

    const nights = nightsBetween(checkIn, checkOut);

    // Atenção: os filtros boardType e maxRatesPerHotel da LiteAPI descartam tarifas válidas
    // (ex.: Marsol tem all inclusive, mas boardType=AI responde "sem disponibilidade").
    // Por isso buscamos todas as tarifas e filtramos regime e estrelas aqui.

    /* ----- Hotel específico: todas as tarifas, para mostrar cada regime ----- */
    if (hotelId) {
      const data = await liteapi('/hotels/rates', { ...base, hotelIds: [hotelId], includeHotelData: true });
      const rates = ratesOf(data.data?.[0]);
      const info = data.hotels?.find((h: any) => h.id === hotelId) ?? data.hotels?.[0] ?? {};

      // Melhor tarifa de cada regime
      const boards: Rate[] = [];
      for (const r of rates) if (!boards.some((b) => b.board === r.board)) boards.push(r);

      const chosen = board ? rates.find((r) => r.board === board) : rates[0];
      if (!chosen) {
        return json(404, {
          error: rates.length
            ? `Este hotel não tem tarifa no regime escolhido nessas datas. Regimes disponíveis: ${boards.map((b) => b.boardName).join(', ')}.`
            : 'Este hotel não tem disponibilidade para essas datas e hóspedes.',
          boards,
        });
      }
      return json(200, {
        sandbox: !!data.sandbox,
        price: chosen.total,
        perNight: Math.round((chosen.total / nights) * 100) / 100,
        options: [toOption(hotelId, info, chosen, nights)],
        boards,
      });
    }

    /* ----- Cidade: hotéis mais baratos no regime escolhido ----- */
    const cityName = typeof q.cityName === 'string' ? q.cityName.trim().slice(0, 80) : '';
    const countryCode = typeof q.countryCode === 'string' && /^[A-Z]{2}$/.test(q.countryCode) ? q.countryCode : '';
    if (!cityName) throw new BadRequest('Informe a cidade.');
    if (!countryCode) throw new BadRequest('Informe o país.');

    const search = async (city: string) => liteapi('/hotels/rates', { ...base, cityName: city, countryCode, limit: 1000 });

    // As cidades estão cadastradas sem acento ("Sao Paulo"); se não achar, tenta como foi digitado
    const plain = cityName.normalize('NFD').replace(/[̀-ͯ]/g, '');
    let data = await search(plain);
    if (!data.data?.length && plain !== cityName) data = await search(cityName);

    const hotels = new Map<string, any>((data.hotels ?? []).map((h: any) => [h.id, h]));
    const options = (data.data ?? [])
      .map((h: any) => {
        const info = hotels.get(h.hotelId) ?? {};
        if (stars.length && !stars.includes(Math.round(Number(info.stars) || 0))) return null;
        const best = ratesOf(h).find((r) => !board || r.board === board);
        return best ? toOption(h.hotelId, info, best, nights) : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.total - b.total)
      .slice(0, 12);

    if (options.length === 0) {
      return json(404, {
        error: board
          ? 'Nenhum hotel com tarifa nesse regime para essas datas. Tente outro regime, outras datas ou menos filtros.'
          : 'Nenhum hotel com disponibilidade encontrado. Confira o nome da cidade e o país.',
      });
    }
    return json(200, { sandbox: !!data.sandbox, price: options[0].total, perNight: options[0].perNight, options, boards: [] });
  } catch (err) {
    if (err instanceof BadRequest) return json(400, { error: err.message });
    return json(502, { error: err instanceof Error ? err.message : 'Falha na busca de hospedagem.' });
  }
}

function toOption(hotelId: string, info: any, rate: Rate, nights: number) {
  return {
    hotelId,
    name: info.name ?? 'Hospedagem',
    stars: typeof info.stars === 'number' && info.stars > 0 ? info.stars : null,
    rating: typeof info.rating === 'number' && info.rating > 0 ? info.rating : null,
    reviews: info.review_count ?? info.reviewCount ?? null,
    thumbnail: info.thumbnail || info.main_photo || null,
    address: info.address ?? null,
    total: rate.total,
    perNight: Math.round((rate.total / nights) * 100) / 100,
    board: rate.board,
    boardName: rate.boardName,
    room: rate.room,
    payAtHotel: rate.payAtHotel,
    refundable: rate.refundable,
  };
}
