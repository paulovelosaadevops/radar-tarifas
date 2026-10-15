// Proxy de IA: a chave do APInex fica só no servidor e apenas modelos gratuitos ("free/...") são aceitos.

const FREE_PREFIX = 'free/';
const DEFAULT_MODEL = 'free/deepseek-v4.1-flash';
const DEFAULT_BASE_URL = 'https://api.apinex.bond/v1';

const MAX_MESSAGES = 30;
const MAX_TOTAL_CHARS = 40_000;
const DEFAULT_MAX_TOKENS = 1024;
const MAX_MAX_TOKENS = 2048;

type Role = 'system' | 'user' | 'assistant';
type ChatMessage = { role: Role; content: string };

export function isFreeModel(model: unknown): model is string {
  return typeof model === 'string' && model.startsWith(FREE_PREFIX) && model.length > FREE_PREFIX.length;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

function parseMessages(value: unknown): ChatMessage[] | string {
  if (!Array.isArray(value) || value.length === 0) return 'Envie "messages" como uma lista não vazia.';
  if (value.length > MAX_MESSAGES) return `No máximo ${MAX_MESSAGES} mensagens por pedido.`;

  let total = 0;
  const messages: ChatMessage[] = [];
  for (const m of value) {
    const role = m?.role;
    const content = m?.content;
    if (role !== 'system' && role !== 'user' && role !== 'assistant') return 'Cada mensagem precisa de "role": system, user ou assistant.';
    if (typeof content !== 'string' || content.trim() === '') return 'Cada mensagem precisa de "content" em texto.';
    total += content.length;
    messages.push({ role, content });
  }
  if (total > MAX_TOTAL_CHARS) return `O texto total passa do limite de ${MAX_TOTAL_CHARS} caracteres.`;
  return messages;
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.APINEX_API_KEY;
  const baseUrl = (process.env.APINEX_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const defaultModel = process.env.APINEX_MODEL || DEFAULT_MODEL;

  if (!apiKey) return json(500, { error: 'APINEX_API_KEY não configurada no servidor.' });
  if (!isFreeModel(defaultModel)) {
    return json(500, { error: `APINEX_MODEL="${defaultModel}" não é gratuito. Use um modelo "free/...".` });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Corpo da requisição precisa ser JSON.' });
  }

  const model = body?.model ?? defaultModel;
  if (!isFreeModel(model)) {
    return json(400, { error: `Modelo "${model}" bloqueado: só modelos gratuitos ("free/...") são permitidos.` });
  }

  const messages = parseMessages(body?.messages);
  if (typeof messages === 'string') return json(400, { error: messages });

  const requested = Number(body?.max_tokens);
  const maxTokens = Number.isFinite(requested) && requested > 0 ? Math.min(requested, MAX_MAX_TOKENS) : DEFAULT_MAX_TOKENS;

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, stream: false }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    return json(502, { error: 'Não foi possível falar com o provedor de IA.', detail: String(err) });
  }

  const data: any = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return json(upstream.status === 429 ? 429 : 502, {
      error: data?.error?.message || `Provedor de IA respondeu ${upstream.status}.`,
    });
  }

  return json(200, {
    content: data?.choices?.[0]?.message?.content ?? '',
    model,
    usage: data?.usage ?? null,
  });
}
