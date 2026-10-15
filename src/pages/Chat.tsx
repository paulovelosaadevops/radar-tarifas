import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Icon } from '../components/Icon';
import { Markdown } from '../components/Markdown';
import { monitorStats } from '../data/stats';
import { useStore } from '../data/store';
import { CATEGORY_LABEL, type ChatMessage, type Monitor } from '../data/types';
import { askAI } from '../lib/ai';
import { todayISO } from '../lib/dates';
import { brl, fmtTime, signedPct } from '../lib/format';
import { uid } from '../lib/random';

const SUGGESTIONS = [
  'Qual dos meus monitores está com o melhor momento para comprar?',
  'Resuma como os preços mudaram nos últimos 30 dias.',
  'Que preço-alvo faz sentido para a passagem para Lisboa?',
  'Dicas para pagar menos em passagens aéreas.',
];

const HISTORY_SENT = 10;

function describe(m: Monitor): string {
  const s30 = monitorStats(m, 30);
  const s7 = monitorStats(m, 7);
  const f = (v: number) => brl(v, m.unit);
  return [
    `- ${m.name} (${CATEGORY_LABEL[m.category]}${m.detail ? `, ${m.detail}` : ''})${m.active ? '' : ' [pausado]'}`,
    `  atual ${f(s30.current)}; 7 dias ${signedPct(s7.change)}; 30 dias ${signedPct(s30.change)}`,
    `  mín. 30d ${f(s30.min)}, média ${f(s30.avg)}, máx. ${f(s30.max)}`,
    m.targetPrice != null ? `  alvo ${f(m.targetPrice)} (${s30.belowTarget ? 'atingido' : 'ainda não'})` : '  sem alvo',
  ].join('\n');
}

function systemPrompt(monitors: Monitor[]): string {
  return [
    'Você é o assistente do Radar de Tarifas, um app que acompanha preços de passagens, hospedagens e tarifas.',
    'Responda em português do Brasil, de forma clara e objetiva, em poucos parágrafos curtos ou tópicos.',
    'Use os dados dos monitores abaixo quando a pergunta for sobre eles. Não invente números que não estão aqui.',
    'Quando der uma recomendação de compra, deixe claro que é uma estimativa baseada no histórico, não uma garantia.',
    `Data de hoje: ${todayISO()}.`,
    '',
    monitors.length ? `Monitores do usuário:\n${monitors.map(describe).join('\n')}` : 'O usuário ainda não tem monitores.',
  ].join('\n');
}

export function Chat() {
  const { chat, setChat, monitors, settings, pendingPrompt, setPendingPrompt } = useStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.length, loading]);

  useEffect(() => {
    if (pendingPrompt) {
      setPendingPrompt(null);
      send(pendingPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  async function send(text: string, base: ChatMessage[] = chat) {
    const content = text.trim();
    if (!content || loading) return;

    const userMsg: ChatMessage = { id: uid(), role: 'user', content, at: new Date().toISOString() };
    const history = [...base.filter((m) => !m.error), userMsg];
    setChat(() => [...base, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const reply = await askAI(
        [
          { role: 'system', content: systemPrompt(monitors) },
          ...history.slice(-HISTORY_SENT).map((m) => ({ role: m.role, content: m.content.slice(0, 3000) })),
        ],
        { model: settings.aiModel },
      );
      setChat((c) => [...c, { id: uid(), role: 'assistant', content: reply || '(resposta vazia)', at: new Date().toISOString() }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao falar com a IA.';
      setChat((c) => [...c, { id: uid(), role: 'assistant', content: message, at: new Date().toISOString(), error: true }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const retry = () => {
    const lastUser = [...chat].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    const idx = chat.lastIndexOf(lastUser);
    send(lastUser.content, chat.slice(0, idx));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  const last = chat[chat.length - 1];

  return (
    <div className="page chat-page">
      <header className="page-header">
        <div className="page-header-text">
          <h1>Chat IA</h1>
          <p>Pergunte sobre seus monitores e preços</p>
        </div>
        {chat.length > 0 && (
          <div className="page-header-actions">
            <button type="button" className="btn btn-ghost" onClick={() => confirm('Apagar a conversa?') && setChat(() => [])} disabled={loading}>
              <Icon name="trash" size={16} /> <span className="hide-sm">Limpar</span>
            </button>
          </div>
        )}
      </header>

      <div className="chat-list" ref={listRef} aria-live="polite">
        {chat.length === 0 && !loading && (
          <div className="chat-empty">
            <div className="empty-icon">
              <Icon name="sparkle" size={28} />
            </div>
            <h2>Como posso ajudar?</h2>
            <p className="muted">A IA conhece os preços dos seus monitores.</p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chat.map((m) => (
          <div key={m.id} className={`bubble-row ${m.role}`}>
            <div className={`bubble${m.error ? ' is-error' : ''}`}>
              {m.role === 'assistant' && !m.error ? <Markdown text={m.content} /> : m.content}
              <span className="bubble-time">{fmtTime(m.at)}</span>
            </div>
          </div>
        ))}

        {last?.error && !loading && (
          <div className="bubble-row assistant">
            <button type="button" className="btn btn-sm" onClick={retry}>
              <Icon name="refresh" size={16} /> Tentar de novo
            </button>
          </div>
        )}

        {loading && (
          <div className="bubble-row assistant">
            <div className="bubble typing" aria-label="A IA está escrevendo">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      <form className="chat-input" onSubmit={onSubmit}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escreva sua pergunta…"
          rows={1}
          maxLength={2000}
          aria-label="Mensagem"
        />
        <button type="submit" className="send-btn" disabled={!input.trim() || loading} aria-label="Enviar">
          <Icon name="send" size={20} />
        </button>
      </form>
    </div>
  );
}
