export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type AskOptions = {
  /** Precisa começar com "free/". O servidor recusa qualquer outro. */
  model?: `free/${string}`;
  maxTokens?: number;
};

export async function askAI(messages: ChatMessage[], options: AskOptions = {}): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model: options.model, max_tokens: options.maxTokens }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status} ao consultar a IA.`);
  return data.content as string;
}
