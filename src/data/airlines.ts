// Sites das companhias aéreas mais comuns em voos saindo do Brasil (para o botão "Ir para o site")
const SITES: { match: RegExp; name: string; url: string }[] = [
  { match: /latam/i, name: 'LATAM', url: 'https://www.latamairlines.com/br/pt' },
  { match: /\bgol\b/i, name: 'GOL', url: 'https://www.voegol.com.br' },
  { match: /azul/i, name: 'Azul', url: 'https://www.voeazul.com.br' },
  { match: /\btap\b/i, name: 'TAP', url: 'https://www.flytap.com/pt-br' },
  { match: /american/i, name: 'American Airlines', url: 'https://www.aa.com.br' },
  { match: /united/i, name: 'United', url: 'https://www.united.com/pt/br' },
  { match: /delta/i, name: 'Delta', url: 'https://pt.delta.com' },
  { match: /copa/i, name: 'Copa Airlines', url: 'https://www.copaair.com/pt-br' },
  { match: /avianca/i, name: 'Avianca', url: 'https://www.avianca.com/br/pt' },
  { match: /aerol[ií]neas argentinas/i, name: 'Aerolíneas Argentinas', url: 'https://www.aerolineas.com.ar/pt-br' },
  { match: /jetsmart/i, name: 'JetSMART', url: 'https://jetsmart.com/br/pt' },
  { match: /\bsky\b/i, name: 'SKY', url: 'https://www.skyairline.com/brasil' },
  { match: /air france/i, name: 'Air France', url: 'https://wwws.airfrance.com.br' },
  { match: /\bklm\b/i, name: 'KLM', url: 'https://www.klm.com.br' },
  { match: /iberia/i, name: 'Iberia', url: 'https://www.iberia.com/br' },
  { match: /air europa/i, name: 'Air Europa', url: 'https://www.aireuropa.com/br/pt/home' },
  { match: /british/i, name: 'British Airways', url: 'https://www.britishairways.com/pt-br' },
  { match: /lufthansa/i, name: 'Lufthansa', url: 'https://www.lufthansa.com/br/pt' },
  { match: /swiss/i, name: 'SWISS', url: 'https://www.swiss.com/br/pt' },
  { match: /\bita\b/i, name: 'ITA Airways', url: 'https://www.ita-airways.com/pt_br' },
  { match: /emirates/i, name: 'Emirates', url: 'https://www.emirates.com/br/portuguese' },
  { match: /qatar/i, name: 'Qatar Airways', url: 'https://www.qatarairways.com/pt-br' },
  { match: /turkish/i, name: 'Turkish Airlines', url: 'https://www.turkishairlines.com/pt-br' },
  { match: /ethiopian/i, name: 'Ethiopian', url: 'https://www.ethiopianairlines.com/br' },
  { match: /royal air maroc/i, name: 'Royal Air Maroc', url: 'https://www.royalairmaroc.com/br-pt' },
];

export function airlineSite(name: string): { name: string; url: string } | null {
  const hit = SITES.find((s) => s.match.test(name));
  return hit ? { name: hit.name, url: hit.url } : null;
}
