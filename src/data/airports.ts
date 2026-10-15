// Aeroportos para o autocompletar (lista local, não gasta buscas). Qualquer código IATA de 3 letras também é aceito.
export type Airport = { iata: string; city: string; name: string; country: string };

export const AIRPORTS: Airport[] = [
  // Brasil
  { iata: 'GRU', city: 'São Paulo', name: 'Guarulhos', country: 'Brasil' },
  { iata: 'CGH', city: 'São Paulo', name: 'Congonhas', country: 'Brasil' },
  { iata: 'VCP', city: 'Campinas', name: 'Viracopos', country: 'Brasil' },
  { iata: 'GIG', city: 'Rio de Janeiro', name: 'Galeão', country: 'Brasil' },
  { iata: 'SDU', city: 'Rio de Janeiro', name: 'Santos Dumont', country: 'Brasil' },
  { iata: 'BSB', city: 'Brasília', name: 'Presidente Juscelino Kubitschek', country: 'Brasil' },
  { iata: 'CNF', city: 'Belo Horizonte', name: 'Confins', country: 'Brasil' },
  { iata: 'SSA', city: 'Salvador', name: 'Dep. Luís Eduardo Magalhães', country: 'Brasil' },
  { iata: 'REC', city: 'Recife', name: 'Guararapes', country: 'Brasil' },
  { iata: 'FOR', city: 'Fortaleza', name: 'Pinto Martins', country: 'Brasil' },
  { iata: 'NAT', city: 'Natal', name: 'São Gonçalo do Amarante', country: 'Brasil' },
  { iata: 'MCZ', city: 'Maceió', name: 'Zumbi dos Palmares', country: 'Brasil' },
  { iata: 'JPA', city: 'João Pessoa', name: 'Castro Pinto', country: 'Brasil' },
  { iata: 'AJU', city: 'Aracaju', name: 'Santa Maria', country: 'Brasil' },
  { iata: 'SLZ', city: 'São Luís', name: 'Marechal Cunha Machado', country: 'Brasil' },
  { iata: 'THE', city: 'Teresina', name: 'Senador Petrônio Portella', country: 'Brasil' },
  { iata: 'BEL', city: 'Belém', name: 'Val-de-Cans', country: 'Brasil' },
  { iata: 'MAO', city: 'Manaus', name: 'Eduardo Gomes', country: 'Brasil' },
  { iata: 'POA', city: 'Porto Alegre', name: 'Salgado Filho', country: 'Brasil' },
  { iata: 'CWB', city: 'Curitiba', name: 'Afonso Pena', country: 'Brasil' },
  { iata: 'FLN', city: 'Florianópolis', name: 'Hercílio Luz', country: 'Brasil' },
  { iata: 'NVT', city: 'Navegantes', name: 'Ministro Victor Konder', country: 'Brasil' },
  { iata: 'IGU', city: 'Foz do Iguaçu', name: 'Cataratas', country: 'Brasil' },
  { iata: 'GYN', city: 'Goiânia', name: 'Santa Genoveva', country: 'Brasil' },
  { iata: 'CGB', city: 'Cuiabá', name: 'Marechal Rondon', country: 'Brasil' },
  { iata: 'CGR', city: 'Campo Grande', name: 'Campo Grande', country: 'Brasil' },
  { iata: 'VIX', city: 'Vitória', name: 'Eurico de Aguiar Salles', country: 'Brasil' },
  { iata: 'UDI', city: 'Uberlândia', name: 'Ten. Cel. Aviador César Bombonato', country: 'Brasil' },
  { iata: 'RAO', city: 'Ribeirão Preto', name: 'Leite Lopes', country: 'Brasil' },
  { iata: 'LDB', city: 'Londrina', name: 'Gov. José Richa', country: 'Brasil' },
  { iata: 'PMW', city: 'Palmas', name: 'Brigadeiro Lysias Rodrigues', country: 'Brasil' },
  { iata: 'PVH', city: 'Porto Velho', name: 'Gov. Jorge Teixeira', country: 'Brasil' },
  { iata: 'BPS', city: 'Porto Seguro', name: 'Porto Seguro', country: 'Brasil' },
  { iata: 'FEN', city: 'Fernando de Noronha', name: 'Fernando de Noronha', country: 'Brasil' },
  { iata: 'JDO', city: 'Juazeiro do Norte', name: 'Orlando Bezerra de Menezes', country: 'Brasil' },
  // América do Sul
  { iata: 'EZE', city: 'Buenos Aires', name: 'Ezeiza', country: 'Argentina' },
  { iata: 'AEP', city: 'Buenos Aires', name: 'Aeroparque', country: 'Argentina' },
  { iata: 'BRC', city: 'Bariloche', name: 'Bariloche', country: 'Argentina' },
  { iata: 'MDZ', city: 'Mendoza', name: 'El Plumerillo', country: 'Argentina' },
  { iata: 'SCL', city: 'Santiago', name: 'Arturo Merino Benítez', country: 'Chile' },
  { iata: 'MVD', city: 'Montevidéu', name: 'Carrasco', country: 'Uruguai' },
  { iata: 'PDP', city: 'Punta del Este', name: 'Capitán Corbeta', country: 'Uruguai' },
  { iata: 'ASU', city: 'Assunção', name: 'Silvio Pettirossi', country: 'Paraguai' },
  { iata: 'LIM', city: 'Lima', name: 'Jorge Chávez', country: 'Peru' },
  { iata: 'CUZ', city: 'Cusco', name: 'Alejandro Velasco Astete', country: 'Peru' },
  { iata: 'BOG', city: 'Bogotá', name: 'El Dorado', country: 'Colômbia' },
  { iata: 'CTG', city: 'Cartagena', name: 'Rafael Núñez', country: 'Colômbia' },
  // América do Norte e Caribe
  { iata: 'MIA', city: 'Miami', name: 'Miami International', country: 'EUA' },
  { iata: 'FLL', city: 'Fort Lauderdale', name: 'Fort Lauderdale–Hollywood', country: 'EUA' },
  { iata: 'MCO', city: 'Orlando', name: 'Orlando International', country: 'EUA' },
  { iata: 'JFK', city: 'Nova York', name: 'John F. Kennedy', country: 'EUA' },
  { iata: 'EWR', city: 'Nova York', name: 'Newark', country: 'EUA' },
  { iata: 'LAX', city: 'Los Angeles', name: 'Los Angeles International', country: 'EUA' },
  { iata: 'LAS', city: 'Las Vegas', name: 'Harry Reid', country: 'EUA' },
  { iata: 'ATL', city: 'Atlanta', name: 'Hartsfield–Jackson', country: 'EUA' },
  { iata: 'IAH', city: 'Houston', name: 'George Bush', country: 'EUA' },
  { iata: 'DFW', city: 'Dallas', name: 'Dallas/Fort Worth', country: 'EUA' },
  { iata: 'ORD', city: 'Chicago', name: "O'Hare", country: 'EUA' },
  { iata: 'BOS', city: 'Boston', name: 'Logan', country: 'EUA' },
  { iata: 'SFO', city: 'São Francisco', name: 'San Francisco International', country: 'EUA' },
  { iata: 'YYZ', city: 'Toronto', name: 'Pearson', country: 'Canadá' },
  { iata: 'MEX', city: 'Cidade do México', name: 'Benito Juárez', country: 'México' },
  { iata: 'CUN', city: 'Cancún', name: 'Cancún', country: 'México' },
  { iata: 'PTY', city: 'Cidade do Panamá', name: 'Tocumen', country: 'Panamá' },
  { iata: 'PUJ', city: 'Punta Cana', name: 'Punta Cana', country: 'Rep. Dominicana' },
  // Europa
  { iata: 'LIS', city: 'Lisboa', name: 'Humberto Delgado', country: 'Portugal' },
  { iata: 'OPO', city: 'Porto', name: 'Francisco Sá Carneiro', country: 'Portugal' },
  { iata: 'FAO', city: 'Faro', name: 'Faro', country: 'Portugal' },
  { iata: 'MAD', city: 'Madri', name: 'Barajas', country: 'Espanha' },
  { iata: 'BCN', city: 'Barcelona', name: 'El Prat', country: 'Espanha' },
  { iata: 'CDG', city: 'Paris', name: 'Charles de Gaulle', country: 'França' },
  { iata: 'ORY', city: 'Paris', name: 'Orly', country: 'França' },
  { iata: 'LHR', city: 'Londres', name: 'Heathrow', country: 'Reino Unido' },
  { iata: 'LGW', city: 'Londres', name: 'Gatwick', country: 'Reino Unido' },
  { iata: 'FCO', city: 'Roma', name: 'Fiumicino', country: 'Itália' },
  { iata: 'MXP', city: 'Milão', name: 'Malpensa', country: 'Itália' },
  { iata: 'VCE', city: 'Veneza', name: 'Marco Polo', country: 'Itália' },
  { iata: 'FRA', city: 'Frankfurt', name: 'Frankfurt', country: 'Alemanha' },
  { iata: 'MUC', city: 'Munique', name: 'Franz Josef Strauss', country: 'Alemanha' },
  { iata: 'AMS', city: 'Amsterdã', name: 'Schiphol', country: 'Holanda' },
  { iata: 'BRU', city: 'Bruxelas', name: 'Bruxelas', country: 'Bélgica' },
  { iata: 'ZRH', city: 'Zurique', name: 'Zurique', country: 'Suíça' },
  { iata: 'VIE', city: 'Viena', name: 'Schwechat', country: 'Áustria' },
  { iata: 'PRG', city: 'Praga', name: 'Václav Havel', country: 'Tchéquia' },
  { iata: 'DUB', city: 'Dublin', name: 'Dublin', country: 'Irlanda' },
  { iata: 'ATH', city: 'Atenas', name: 'Eleftherios Venizelos', country: 'Grécia' },
  { iata: 'IST', city: 'Istambul', name: 'Istambul', country: 'Turquia' },
  // Outros
  { iata: 'DXB', city: 'Dubai', name: 'Dubai International', country: 'Emirados Árabes' },
  { iata: 'DOH', city: 'Doha', name: 'Hamad', country: 'Catar' },
  { iata: 'JNB', city: 'Joanesburgo', name: 'O. R. Tambo', country: 'África do Sul' },
  { iata: 'CPT', city: 'Cidade do Cabo', name: 'Cidade do Cabo', country: 'África do Sul' },
  { iata: 'NRT', city: 'Tóquio', name: 'Narita', country: 'Japão' },
  { iata: 'HND', city: 'Tóquio', name: 'Haneda', country: 'Japão' },
  { iata: 'SYD', city: 'Sydney', name: 'Kingsford Smith', country: 'Austrália' },
];

const BY_IATA = new Map(AIRPORTS.map((a) => [a.iata, a]));

export const findAirport = (iata: string) => BY_IATA.get(iata.toUpperCase());

export const airportLabel = (a: Airport) => `${a.iata} · ${a.city} (${a.name})`;

/** Aceita "GRU", "GRU · São Paulo (Guarulhos)" ou o nome da cidade */
export function parseAirport(input: string): string | null {
  const text = input.trim();
  const code = text.match(/^([A-Za-z]{3})(\b|\s|·|$)/);
  if (code) return code[1].toUpperCase();
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const match = AIRPORTS.find((a) => norm(a.city) === norm(text));
  return match?.iata ?? null;
}

export const cityOf = (iata: string) => findAirport(iata)?.city ?? iata.toUpperCase();
