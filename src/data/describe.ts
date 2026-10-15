import { cityOf } from './airports';
import { daysBetween } from '../lib/dates';
import { fmtShortDate } from '../lib/format';
import type { FlightQuery, HotelQuery, MonitorQuery, TravelClass } from './types';

export const TRAVEL_CLASS_LABEL: Record<TravelClass, string> = {
  1: 'Econômica',
  2: 'Econômica premium',
  3: 'Executiva',
  4: 'Primeira classe',
};

export const STOPS_LABEL = ['Qualquer número de paradas', 'Somente voo direto', 'Até 1 parada', 'Até 2 paradas'] as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function flightPassengers(q: Pick<FlightQuery, 'adults' | 'children' | 'infantsInSeat' | 'infantsOnLap'>): string {
  const babies = q.infantsInSeat + q.infantsOnLap;
  return [
    plural(q.adults, 'adulto', 'adultos'),
    q.children ? plural(q.children, 'criança', 'crianças') : '',
    babies ? plural(babies, 'bebê', 'bebês') : '',
  ]
    .filter(Boolean)
    .join(', ');
}

export function hotelGuests(q: Pick<HotelQuery, 'adults' | 'childrenAges'>): string {
  return [plural(q.adults, 'adulto', 'adultos'), q.childrenAges.length ? plural(q.childrenAges.length, 'criança', 'crianças') : '']
    .filter(Boolean)
    .join(', ');
}

export const nights = (q: Pick<HotelQuery, 'checkIn' | 'checkOut'>) => Math.max(0, daysBetween(q.checkIn, q.checkOut));

export function flightName(q: FlightQuery) {
  return `${cityOf(q.origin)} → ${cityOf(q.destination)}`;
}

export function flightDetail(q: FlightQuery) {
  const dates = q.tripType === 'ida' ? fmtShortDate(q.departDate) : `${fmtShortDate(q.departDate)} – ${fmtShortDate(q.returnDate!)}`;
  return [
    `${q.origin}–${q.destination}`,
    q.tripType === 'ida' ? 'só ida' : 'ida e volta',
    dates,
    flightPassengers(q),
    q.travelClass !== 1 ? TRAVEL_CLASS_LABEL[q.travelClass] : '',
    q.stops === 1 ? 'voo direto' : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

export function hotelName(q: HotelQuery) {
  return q.propertyName || `Hospedagem em ${q.location}`;
}

export function hotelDetail(q: HotelQuery) {
  const n = nights(q);
  return [
    q.propertyName ? q.location : '',
    plural(n, 'noite', 'noites'),
    `${fmtShortDate(q.checkIn)} – ${fmtShortDate(q.checkOut)}`,
    hotelGuests(q),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Linhas de resumo da busca, para a tela de detalhe */
export function querySummary(q: MonitorQuery): { label: string; value: string }[] {
  if (q.kind === 'voo') {
    return [
      { label: 'Trecho', value: `${cityOf(q.origin)} (${q.origin}) → ${cityOf(q.destination)} (${q.destination})` },
      { label: 'Tipo', value: q.tripType === 'ida' ? 'Só ida' : 'Ida e volta' },
      { label: q.tripType === 'ida' ? 'Data' : 'Datas', value: q.tripType === 'ida' ? fmtShortDate(q.departDate) : `${fmtShortDate(q.departDate)} – ${fmtShortDate(q.returnDate!)}` },
      { label: 'Passageiros', value: flightPassengers(q) + (q.infantsOnLap ? ` (${plural(q.infantsOnLap, 'bebê', 'bebês')} no colo)` : '') },
      { label: 'Classe', value: TRAVEL_CLASS_LABEL[q.travelClass] },
      { label: 'Paradas', value: STOPS_LABEL[q.stops] },
      { label: 'Bagagem de mão', value: q.bags ? plural(q.bags, 'mala', 'malas') : 'Não incluída no filtro' },
    ];
  }
  return [
    { label: 'Destino', value: q.location },
    ...(q.propertyName ? [{ label: 'Hospedagem', value: q.propertyName }] : [{ label: 'Acompanha', value: 'A opção mais barata da busca' }]),
    { label: 'Datas', value: `${fmtShortDate(q.checkIn)} – ${fmtShortDate(q.checkOut)} (${plural(nights(q), 'noite', 'noites')})` },
    {
      label: 'Hóspedes',
      value: hotelGuests(q) + (q.childrenAges.length ? ` (idades: ${q.childrenAges.map((a) => (a === 0 ? 'menos de 1' : a)).join(', ')})` : ''),
    },
    ...(q.minRating ? [{ label: 'Avaliação mínima', value: { 7: '3,5+', 8: '4,0+', 9: '4,5+' }[q.minRating] }] : []),
    ...(q.hotelClass?.length ? [{ label: 'Estrelas', value: q.hotelClass.join(', ') }] : []),
    ...(q.freeCancellation ? [{ label: 'Cancelamento', value: 'Somente com cancelamento grátis' }] : []),
  ];
}
