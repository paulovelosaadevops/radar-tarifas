import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { AIRPORTS, airportLabel, cityOf, findAirport, parseAirport } from '../data/airports';
import {
  BOARD_CHOICES,
  boardLabel,
  COUNTRIES,
  flightDetail,
  flightName,
  flightPassengers,
  lodgingDetail,
  lodgingGuests,
  lodgingName,
  nights,
  TRAVEL_CLASS_LABEL,
} from '../data/describe';
import type { NewMonitor as NewMonitorData } from '../data/store';
import type { BoardCode, Category, FlightQuery, LodgingQuery, StopsFilter, TravelClass } from '../data/types';
import { addDays, todayISO } from '../lib/dates';
import { brl } from '../lib/format';
import { flightInsights, lodgingInsights, lodgingLinks, searchFlights, searchLodging, type FlightResult, type LodgingResult } from '../lib/prices';
import { ChoiceChips, DateField, moneyInput, parseMoney, Section, Stepper, Switch } from './fields';
import { Icon, type IconName } from './Icon';

type Kind = 'voo' | 'hotel' | 'manual';
type Props = { onCreate: (m: NewMonitorData) => void; onCancel: () => void };

export function NewMonitor({ onCreate, onCancel }: Props) {
  const [kind, setKind] = useState<Kind | null>(null);
  if (!kind) return <TypePicker onPick={setKind} />;
  const back = () => setKind(null);
  if (kind === 'voo') return <FlightForm onBack={back} onCreate={onCreate} onCancel={onCancel} />;
  if (kind === 'hotel') return <LodgingForm onBack={back} onCreate={onCreate} onCancel={onCancel} />;
  return <ManualForm onBack={back} onCreate={onCreate} onCancel={onCancel} />;
}

/* ---------- Escolha do tipo ---------- */

const TYPES: { kind: Kind; icon: IconName; tone: string; title: string; text: string; live?: boolean }[] = [
  { kind: 'voo', icon: 'plane', tone: 'blue', title: 'Passagem aérea', text: 'Preço real do Google Flights, atualizado todo dia', live: true },
  { kind: 'hotel', icon: 'bed', tone: 'indigo', title: 'Hospedagem', text: 'Hotéis e resorts com regime: café, meia pensão ou all inclusive', live: true },
  { kind: 'manual', icon: 'bolt', tone: 'orange', title: 'Outra tarifa', text: 'Energia, tarifa bancária ou outro valor que você registra' },
];

function TypePicker({ onPick }: { onPick: (k: Kind) => void }) {
  return (
    <div className="type-picker">
      <p className="muted">O que você quer acompanhar?</p>
      {TYPES.map((t) => (
        <button key={t.kind} type="button" className="type-card" onClick={() => onPick(t.kind)}>
          <span className={`type-card-icon tone-${t.tone}`}>
            <Icon name={t.icon} size={24} />
          </span>
          <span className="type-card-body">
            <span className="type-card-title">
              {t.title}
              {t.live && <span className="tag tag-live">Preço real</span>}
            </span>
            <span className="type-card-text">{t.text}</span>
          </span>
          <Icon name="back" size={18} className="type-card-arrow" />
        </button>
      ))}
    </div>
  );
}

function StepHeader({ icon, title, onBack }: { icon: IconName; title: string; onBack: () => void }) {
  return (
    <div className="step-header">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
        <Icon name="back" size={16} /> Tipo
      </button>
      <span className="step-title">
        <Icon name={icon} size={18} /> {title}
      </span>
    </div>
  );
}

/* ---------- Alerta (comum a todos) ---------- */

type Tracking = { name: string; target: string; alertPct: number };

function TrackingFields({
  value,
  onChange,
  price,
  unit = '',
  placeholder,
}: {
  value: Tracking;
  onChange: (t: Tracking) => void;
  price: number | null;
  unit?: string;
  placeholder?: string;
}) {
  const set = (patch: Partial<Tracking>) => onChange({ ...value, ...patch });
  return (
    <Section icon="bell" title="Seu alerta">
      <label className="field">
        <span>Nome do monitor</span>
        <input value={value.name} onChange={(e) => set({ name: e.target.value })} placeholder={placeholder} maxLength={80} />
      </label>

      <label className="field">
        <span>
          Avisar quando chegar a <em>(preço-alvo, opcional)</em>
        </span>
        <div className="money-input">
          <span>R$</span>
          <input value={value.target} onChange={(e) => set({ target: e.target.value })} inputMode="decimal" placeholder="0,00" />
          {unit && <span>{unit}</span>}
        </div>
      </label>
      {price != null && (
        <div className="quick-chips" aria-label="Sugestões de alvo">
          {[5, 10, 15, 20].map((p) => {
            const v = Math.round(price * (1 - p / 100) * (price >= 100 ? 1 : 100)) / (price >= 100 ? 1 : 100);
            return (
              <button key={p} type="button" className="choice-chip" onClick={() => set({ target: moneyInput(v) })}>
                −{p}% · {brl(v)}
              </button>
            );
          })}
        </div>
      )}

      <ChoiceChips
        segmented label="Também avisar quando variar em um dia"
        value={value.alertPct}
        onChange={(alertPct) => set({ alertPct })}
        options={[3, 5, 10, 15].map((v) => ({ value: v, label: `${v}%` }))}
      />
    </Section>
  );
}

function trackingError(t: Tracking): string | null {
  if (!t.name.trim()) return 'Dê um nome ao monitor.';
  if (t.target.trim() && !(parseMoney(t.target) > 0)) return 'O preço-alvo precisa ser um valor maior que zero.';
  return null;
}

const targetValue = (t: Tracking) => (t.target.trim() ? parseMoney(t.target) : null);

function FormFooter({ onCancel, children }: { onCancel: () => void; children: ReactNode }) {
  return (
    <div className="form-footer">
      <button type="button" className="btn" onClick={onCancel}>
        Cancelar
      </button>
      {children}
    </div>
  );
}

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}

const fmtDuration = (min: number | null) => (min == null ? '' : `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}min` : ''}`);
const fmtTime = (s: string | null) => (s ? s.slice(-5) : '');

const PRICE_LEVEL: Record<string, { label: string; tone: string }> = {
  low: { label: 'Preço baixo', tone: 'good' },
  typical: { label: 'Preço típico', tone: 'flat' },
  high: { label: 'Preço alto', tone: 'bad' },
};

/* ---------- Passagem aérea ---------- */

function FlightForm({ onBack, onCreate, onCancel }: Props & { onBack: () => void }) {
  const today = todayISO();
  const [tripType, setTripType] = useState<FlightQuery['tripType']>('ida-volta');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departDate, setDepartDate] = useState(addDays(today, 30));
  const [returnDate, setReturnDate] = useState(addDays(today, 37));
  const [pax, setPax] = useState({ adults: 1, children: 0, infantsInSeat: 0, infantsOnLap: 0 });
  const [travelClass, setTravelClass] = useState<TravelClass>(1);
  const [stops, setStops] = useState<StopsFilter>(0);
  const [bags, setBags] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FlightResult | null>(null);
  const [tracking, setTracking] = useState<Tracking>({ name: '', target: '', alertPct: 5 });

  const total = pax.adults + pax.children + pax.infantsInSeat + pax.infantsOnLap;
  const seated = pax.adults + pax.children + pax.infantsInSeat;
  const setP = (k: keyof typeof pax, v: number) => setPax((p) => ({ ...p, [k]: v }));

  const query = useMemo<FlightQuery | null>(() => {
    const o = parseAirport(origin);
    const d = parseAirport(destination);
    if (!o || !d) return null;
    return {
      origin: o,
      destination: d,
      tripType,
      departDate,
      returnDate: tripType === 'ida-volta' ? returnDate : undefined,
      ...pax,
      travelClass,
      stops,
      bags: Math.min(bags, seated),
    };
  }, [origin, destination, tripType, departDate, returnDate, pax, travelClass, stops, bags, seated]);

  // Mudou a busca: o resultado anterior não vale mais
  const queryKey = JSON.stringify(query);
  useEffect(() => setResult(null), [queryKey]);
  useEffect(() => {
    if (bags > seated) setBags(seated);
  }, [bags, seated]);
  useEffect(() => {
    if (returnDate < departDate) setReturnDate(addDays(departDate, 7));
  }, [departDate, returnDate]);

  const validate = (): string | null => {
    if (!query) return 'Escolha os aeroportos de origem e destino (código de 3 letras ou cidade da lista).';
    if (query.origin === query.destination) return 'Origem e destino precisam ser diferentes.';
    if (departDate < today) return 'A data de ida já passou.';
    if (tripType === 'ida-volta' && returnDate < departDate) return 'A volta precisa ser depois da ida.';
    return null;
  };

  const search = async () => {
    const problem = validate();
    if (problem) return setError(problem);
    setError(null);
    setLoading(true);
    try {
      const r = await searchFlights(query!);
      setResult(r);
      setTracking((t) => ({
        ...t,
        name: t.name || flightName(query!),
        target: t.target || (r.typicalRange && r.typicalRange[0] < r.price ? moneyInput(r.typicalRange[0]) : ''),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na busca.');
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!result || !query) return search();
    const problem = trackingError(tracking);
    if (problem) return setError(problem);
    onCreate({
      name: tracking.name.trim(),
      category: 'voo',
      detail: flightDetail(query),
      unit: '',
      targetPrice: targetValue(tracking),
      alertPct: tracking.alertPct,
      currentPrice: result.price,
      source: 'serpapi',
      query: { kind: 'voo', ...query },
      insights: flightInsights(result),
    });
  };

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <StepHeader icon="plane" title="Passagem aérea" onBack={onBack} />

      <div className="segmented segmented-full" role="radiogroup" aria-label="Tipo de viagem">
        {(['ida-volta', 'ida'] as const).map((t) => (
          <button key={t} type="button" role="radio" aria-checked={tripType === t} className={tripType === t ? 'is-active' : ''} onClick={() => setTripType(t)}>
            {t === 'ida' ? 'Só ida' : 'Ida e volta'}
          </button>
        ))}
      </div>

      <Section icon="pin" title="Trecho">
        <div className="route">
          <AirportField label="De onde" value={origin} onChange={setOrigin} />
          <button type="button" className="icon-btn route-swap" onClick={swap} aria-label="Inverter origem e destino" title="Inverter">
            <Icon name="swap" size={18} />
          </button>
          <AirportField label="Para onde" value={destination} onChange={setDestination} />
        </div>
        <datalist id="airports">
          {AIRPORTS.map((a) => (
            <option key={a.iata} value={airportLabel(a)} />
          ))}
        </datalist>
      </Section>

      <Section icon="calendar" title="Datas">
        <div className="field-row">
          <DateField label="Ida" value={departDate} min={today} onChange={setDepartDate} />
          {tripType === 'ida-volta' && <DateField label="Volta" value={returnDate} min={departDate} onChange={setReturnDate} />}
        </div>
      </Section>

      <Section icon="users" title="Passageiros" aside={flightPassengers(pax)}>
        <Stepper label="Adultos" hint="12 anos ou mais" value={pax.adults} min={1} max={9 - (total - pax.adults)} onChange={(v) => setP('adults', v)} />
        <Stepper label="Crianças" hint="2 a 11 anos" value={pax.children} min={0} max={9 - (total - pax.children)} onChange={(v) => setP('children', v)} />
        <Stepper label="Bebês com assento" hint="Menos de 2 anos" value={pax.infantsInSeat} min={0} max={9 - (total - pax.infantsInSeat)} onChange={(v) => setP('infantsInSeat', v)} />
        <Stepper
          label="Bebês no colo"
          hint="Menos de 2 anos, 1 por adulto"
          value={pax.infantsOnLap}
          min={0}
          max={Math.min(pax.adults, 9 - (total - pax.infantsOnLap))}
          onChange={(v) => setP('infantsOnLap', v)}
        />
        {total >= 9 && <p className="card-sub">Máximo de 9 passageiros por busca.</p>}
      </Section>

      <Section icon="star" title="Preferências">
        <ChoiceChips
          label="Classe"
          value={travelClass}
          onChange={setTravelClass}
          options={([1, 2, 3, 4] as TravelClass[]).map((v) => ({ value: v, label: TRAVEL_CLASS_LABEL[v] }))}
        />
        <ChoiceChips
          segmented label="Paradas"
          value={stops}
          onChange={setStops}
          options={[
            { value: 0 as StopsFilter, label: 'Qualquer' },
            { value: 1 as StopsFilter, label: 'Só direto' },
            { value: 2 as StopsFilter, label: 'Até 1' },
            { value: 3 as StopsFilter, label: 'Até 2' },
          ]}
        />
        <Stepper label="Bagagem de mão" hint="Malas incluídas no preço" value={bags} min={0} max={seated} onChange={setBags} />
      </Section>

      {!result && (
        <button type="button" className="btn btn-primary btn-block" onClick={search} disabled={loading}>
          {loading ? <span className="spinner" aria-hidden="true" /> : <Icon name="search" size={18} />}
          {loading ? 'Buscando no Google Flights…' : 'Buscar preço agora'}
        </button>
      )}

      {result && query && (
        <>
          <div className="result-card">
            <div className="result-head">
              <div>
                <span className="result-label">Menor preço total · {flightPassengers(query)}</span>
                <span className="result-price">{brl(result.price)}</span>
              </div>
              {result.priceLevel && PRICE_LEVEL[result.priceLevel] && (
                <span className={`level level-${PRICE_LEVEL[result.priceLevel].tone}`}>{PRICE_LEVEL[result.priceLevel].label}</span>
              )}
            </div>
            {result.typicalRange && (
              <p className="card-sub">
                Normalmente entre {brl(result.typicalRange[0])} e {brl(result.typicalRange[1])} para {cityOf(query.origin)} → {cityOf(query.destination)}
              </p>
            )}
            <ul className="flight-options">
              {result.options.slice(0, 3).map((o, i) => (
                <li key={i}>
                  {o.logo ? <img src={o.logo} alt="" width={28} height={28} /> : <Icon name="plane" size={20} />}
                  <span className="flight-option-main">
                    <strong>{o.airlines.join(' + ') || 'Companhia aérea'}</strong>
                    <span className="card-sub">
                      {fmtTime(o.departure)}–{fmtTime(o.arrival)} · {fmtDuration(o.duration)} · {o.stops === 0 ? 'direto' : `${o.stops} ${o.stops === 1 ? 'parada' : 'paradas'}`}
                    </span>
                  </span>
                  <span className="flight-option-price">{brl(o.price)}</span>
                </li>
              ))}
            </ul>
            {result.googleUrl && (
              <a className="text-link" href={result.googleUrl} target="_blank" rel="noopener noreferrer">
                Ver todas as opções no Google Flights <Icon name="external" size={14} />
              </a>
            )}
          </div>

          <TrackingFields value={tracking} onChange={setTracking} price={result.price} />
        </>
      )}

      <ErrorText error={error} />

      {result && (
        <FormFooter onCancel={onCancel}>
          <button type="submit" className="btn btn-primary">
            <Icon name="check" size={18} /> Criar monitor
          </button>
        </FormFooter>
      )}
    </form>
  );
}

function AirportField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const code = parseAirport(value);
  const airport = code ? findAirport(code) : undefined;
  return (
    <label className="field airport-field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => airport && onChange(airportLabel(airport))}
        list="airports"
        placeholder="Cidade ou código (ex.: GRU)"
        autoComplete="off"
      />
      <span className="field-hint">{airport ? `${airport.name} · ${airport.country}` : code ? `Aeroporto ${code}` : ' '}</span>
    </label>
  );
}

/* ---------- Hospedagem (LiteAPI: tarifas com regime) ---------- */

const CHEAPEST = '__cheapest__';

function LodgingForm({ onBack, onCreate, onCancel }: Props & { onBack: () => void }) {
  const today = todayISO();
  const [cityName, setCityName] = useState('');
  const [countryCode, setCountryCode] = useState('BR');
  const [checkIn, setCheckIn] = useState(addDays(today, 30));
  const [checkOut, setCheckOut] = useState(addDays(today, 33));
  const [adults, setAdults] = useState(2);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [board, setBoard] = useState<BoardCode | 'any'>('any');
  const [stars, setStars] = useState<number[]>([]);
  const [refundableOnly, setRefundableOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LodgingResult | null>(null);
  const [selected, setSelected] = useState<string>(CHEAPEST);
  const [tracking, setTracking] = useState<Tracking>({ name: '', target: '', alertPct: 5 });

  const query: LodgingQuery = {
    cityName: cityName.trim(),
    countryCode,
    checkIn,
    checkOut,
    adults,
    childrenAges,
    board,
    stars,
    refundableOnly,
  };
  const queryKey = JSON.stringify(query);
  useEffect(() => {
    setResult(null);
    setSelected(CHEAPEST);
  }, [queryKey]);
  useEffect(() => {
    if (checkOut <= checkIn) setCheckOut(addDays(checkIn, 1));
  }, [checkIn, checkOut]);

  const setChildren = (n: number) => setChildrenAges((ages) => (n > ages.length ? [...ages, ...Array(n - ages.length).fill(-1)] : ages.slice(0, n)));
  const toggleStar = (s: number) => setStars((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s].sort()));

  const option = result?.options.find((o) => o.hotelId === selected) ?? null;
  const price = option?.total ?? result?.price ?? null;
  const n = nights(query);

  const search = async () => {
    if (!query.cityName) return setError('Informe a cidade.');
    if (childrenAges.some((a) => a < 0)) return setError('Escolha a idade de cada criança: ela muda o preço da hospedagem.');
    if (checkIn < today) return setError('O check-in já passou.');
    if (checkOut <= checkIn) return setError('O check-out precisa ser depois do check-in.');
    setError(null);
    setLoading(true);
    try {
      const r = await searchLodging(query);
      setResult(r);
      setTracking((t) => ({ ...t, name: t.name || lodgingName(query) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na busca.');
    } finally {
      setLoading(false);
    }
  };

  const pick = (id: string) => {
    setSelected(id);
    const o = result?.options.find((x) => x.hotelId === id);
    setTracking((t) => ({ ...t, name: o ? o.name : lodgingName(query) }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!result || price == null) return search();
    const problem = trackingError(tracking);
    if (problem) return setError(problem);
    const finalQuery: LodgingQuery = option ? { ...query, hotelId: option.hotelId, hotelName: option.name } : query;
    onCreate({
      name: tracking.name.trim(),
      category: 'hotel',
      detail: lodgingDetail(finalQuery),
      unit: '',
      targetPrice: targetValue(tracking),
      alertPct: tracking.alertPct,
      currentPrice: price,
      source: 'liteapi',
      query: { kind: 'hospedagem', ...finalQuery },
      insights: { ...lodgingInsights(result, option), bookingUrl: lodgingLinks(finalQuery).google },
    });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <StepHeader icon="bed" title="Hospedagem" onBack={onBack} />

      <Section icon="pin" title="Destino">
        <div className="field-row field-row-city">
          <label className="field">
            <span>Cidade</span>
            <input value={cityName} onChange={(e) => setCityName(e.target.value)} placeholder="Ex.: Natal" maxLength={80} />
          </label>
          <label className="field">
            <span>País</span>
            <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      <Section icon="calendar" title="Datas" aside={n > 0 ? `${n} ${n === 1 ? 'noite' : 'noites'}` : undefined}>
        <div className="field-row">
          <DateField label="Check-in" value={checkIn} min={today} onChange={setCheckIn} />
          <DateField label="Check-out" value={checkOut} min={addDays(checkIn, 1)} onChange={setCheckOut} />
        </div>
      </Section>

      <Section icon="users" title="Hóspedes" aside={lodgingGuests(query)}>
        <Stepper label="Adultos" hint="18 anos ou mais" value={adults} min={1} max={12} onChange={setAdults} />
        <Stepper label="Crianças" hint="0 a 17 anos" value={childrenAges.length} min={0} max={8} onChange={setChildren} />
        {childrenAges.length > 0 && (
          <div className="ages">
            {childrenAges.map((age, i) => (
              <label key={i} className="field">
                <span>Idade da criança {i + 1}</span>
                <select value={age} onChange={(e) => setChildrenAges((a) => a.map((x, j) => (j === i ? Number(e.target.value) : x)))}>
                  <option value={-1} disabled>
                    Escolha
                  </option>
                  <option value={0}>Menos de 1 ano</option>
                  {Array.from({ length: 17 }, (_, k) => k + 1).map((v) => (
                    <option key={v} value={v}>
                      {v} {v === 1 ? 'ano' : 'anos'}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
        {childrenAges.length > 0 && <p className="card-sub">O hotel calcula o preço pela idade de cada criança: quando elas não pagam, o valor já vem sem cobrança.</p>}
      </Section>

      <Section icon="sparkle" title="Regime">
        <ChoiceChips label="Refeições incluídas" value={board} onChange={setBoard} options={BOARD_CHOICES} />
        <p className="card-sub">
          {board === 'any'
            ? 'Mostra a tarifa mais barata de cada hotel, seja qual for o regime.'
            : `O preço acompanhado será sempre o da tarifa ${boardLabel(board).toLowerCase()}.`}
        </p>
      </Section>

      <Section icon="star" title="Filtros">
        <div className="field">
          <span>Estrelas</span>
          <div className="choice-chips">
            {[3, 4, 5].map((s) => (
              <button key={s} type="button" aria-pressed={stars.includes(s)} className={`choice-chip${stars.includes(s) ? ' is-on' : ''}`} onClick={() => toggleStar(s)}>
                {stars.includes(s) && <Icon name="check" size={14} />}
                {s} ★
              </button>
            ))}
          </div>
        </div>
        <Switch label="Só com cancelamento grátis" checked={refundableOnly} onChange={setRefundableOnly} />
      </Section>

      {!result && (
        <button type="button" className="btn btn-primary btn-block" onClick={search} disabled={loading}>
          {loading ? <span className="spinner" aria-hidden="true" /> : <Icon name="search" size={18} />}
          {loading ? 'Buscando tarifas…' : 'Buscar preços agora'}
        </button>
      )}
      {loading && <p className="card-sub form-note">Consultando os hotéis da cidade. Pode levar até 30 segundos em cidades grandes.</p>}

      {result && (
        <>
          <Section icon="target" title="O que acompanhar">
            {result.sandbox && (
              <p className="notice" role="note">
                <Icon name="info" size={16} />
                <span>Preços da chave de testes da LiteAPI. Depois de ativar a chave de produção, os valores passam a ser os vendidos de verdade.</span>
              </p>
            )}
            <div className="hotel-options" role="radiogroup" aria-label="Hospedagem a acompanhar">
              <label className={`hotel-option${selected === CHEAPEST ? ' is-on' : ''}`}>
                <input type="radio" name="hotel" checked={selected === CHEAPEST} onChange={() => pick(CHEAPEST)} />
                <span className="hotel-option-thumb hotel-option-thumb-icon">
                  <Icon name="chart" size={20} />
                </span>
                <span className="hotel-option-main">
                  <strong>O mais barato da cidade</strong>
                  <span className="card-sub">{board === 'any' ? 'Seja qual for o hotel' : `Seja qual for o hotel, sempre ${boardLabel(board).toLowerCase()}`}</span>
                </span>
                <span className="hotel-option-price">{brl(result.price)}</span>
              </label>
              {result.options.map((o) => (
                <label key={o.hotelId} className={`hotel-option${selected === o.hotelId ? ' is-on' : ''}`}>
                  <input type="radio" name="hotel" checked={selected === o.hotelId} onChange={() => pick(o.hotelId)} />
                  <HotelThumb src={o.thumbnail} />
                  <span className="hotel-option-main">
                    <strong>{o.name}</strong>
                    <span className="card-sub">
                      {[o.stars ? `${o.stars}★` : '', o.rating ? `nota ${o.rating.toLocaleString('pt-BR')}` : '', boardLabel(o.board, o.boardName)].filter(Boolean).join(' · ')}
                    </span>
                    <span className="card-sub">
                      {[`${brl(o.perNight)}/noite`, o.refundable ? 'cancelamento grátis' : o.refundable === false ? 'não reembolsável' : '', o.payAtHotel ? `+ ${brl(o.payAtHotel.amount)} no hotel` : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className="hotel-option-price">{brl(o.total)}</span>
                </label>
              ))}
            </div>
            <p className="card-sub">
              Total de {n} {n === 1 ? 'noite' : 'noites'} para {lodgingGuests(query)}, com as taxas cobradas na reserva. Taxas pagas direto no hotel aparecem à parte.
            </p>
          </Section>

          <TrackingFields value={tracking} onChange={setTracking} price={price} />
        </>
      )}

      <ErrorText error={error} />

      {result && (
        <FormFooter onCancel={onCancel}>
          <button type="submit" className="btn btn-primary">
            <Icon name="check" size={18} /> Criar monitor
          </button>
        </FormFooter>
      )}
    </form>
  );
}

/** Foto do hotel; se o Google bloquear a imagem, mostra o ícone */
function HotelThumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="hotel-option-thumb hotel-option-thumb-icon">
        <Icon name="bed" size={20} />
      </span>
    );
  }
  return <img className="hotel-option-thumb" src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

/* ---------- Outra tarifa (manual) ---------- */

const MANUAL_CATEGORIES: { value: Category; label: string; unit: string; placeholder: string }[] = [
  { value: 'energia', label: 'Energia', unit: '/kWh', placeholder: 'Ex.: Energia residencial' },
  { value: 'bancaria', label: 'Tarifa bancária', unit: '/mês', placeholder: 'Ex.: Pacote de serviços do banco' },
  { value: 'outro', label: 'Outro', unit: '', placeholder: 'Ex.: Plano de internet' },
];

function ManualForm({ onBack, onCreate, onCancel }: Props & { onBack: () => void }) {
  const [category, setCategory] = useState<Category>('energia');
  const [detail, setDetail] = useState('');
  const [price, setPrice] = useState('');
  const [tracking, setTracking] = useState<Tracking>({ name: '', target: '', alertPct: 3 });
  const [error, setError] = useState<string | null>(null);
  const cat = MANUAL_CATEGORIES.find((c) => c.value === category)!;
  const value = parseMoney(price);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!(value > 0)) return setError('Informe o valor atual, maior que zero.');
    const problem = trackingError(tracking);
    if (problem) return setError(problem);
    onCreate({
      name: tracking.name.trim(),
      category,
      detail: detail.trim(),
      unit: cat.unit,
      targetPrice: targetValue(tracking),
      alertPct: tracking.alertPct,
      currentPrice: value,
      source: 'manual',
    });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <StepHeader icon="bolt" title="Outra tarifa" onBack={onBack} />

      <Section icon="bolt" title="Tarifa">
        <ChoiceChips segmented label="Tipo" value={category} onChange={setCategory} options={MANUAL_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} />
        <label className="field">
          <span>Detalhes <em>(opcional)</em></span>
          <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Ex.: Distribuidora, plano ou conta" maxLength={120} />
        </label>
        <label className="field">
          <span>Valor atual</span>
          <div className="money-input">
            <span>R$</span>
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0,00" />
            {cat.unit && <span>{cat.unit}</span>}
          </div>
        </label>
        <p className="card-sub">Essas tarifas não têm busca automática. Você registra o valor novo na tela do monitor sempre que ele mudar.</p>
      </Section>

      <TrackingFields value={tracking} onChange={setTracking} price={value > 0 ? value : null} unit={cat.unit} placeholder={cat.placeholder} />

      <ErrorText error={error} />

      <FormFooter onCancel={onCancel}>
        <button type="submit" className="btn btn-primary">
          <Icon name="check" size={18} /> Criar monitor
        </button>
      </FormFooter>
    </form>
  );
}
