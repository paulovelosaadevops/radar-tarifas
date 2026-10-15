// Markdown mínimo para as respostas da IA (negrito, itálico, código, listas e títulos).
// Gera elementos React, nunca HTML cru.
import type { ReactNode } from 'react';

function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*\s][^*]*)\*|_([^_\s][^_]*)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${m.index}`;
    if (m[2] ?? m[3]) out.push(<strong key={k}>{inline(m[2] ?? m[3], key + 1)}</strong>);
    else if (m[4]) out.push(<code key={k}>{m[4]}</code>);
    else out.push(<em key={k}>{inline(m[5] ?? m[6], key + 1)}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block = { type: 'p' | 'ul' | 'ol' | 'h'; lines: string[] };

export function Markdown({ text }: { text: string }) {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const prev = blocks[blocks.length - 1];

    if (!line.trim()) blocks.push({ type: 'p', lines: [] });
    else if (heading) blocks.push({ type: 'h', lines: [heading[1]] });
    else if (bullet) prev?.type === 'ul' ? prev.lines.push(bullet[1]) : blocks.push({ type: 'ul', lines: [bullet[1]] });
    else if (numbered) prev?.type === 'ol' ? prev.lines.push(numbered[1]) : blocks.push({ type: 'ol', lines: [numbered[1]] });
    else if (prev?.type === 'p') prev.lines.push(line);
    else blocks.push({ type: 'p', lines: [line] });
  }

  return (
    <div className="md">
      {blocks
        .filter((b) => b.lines.length > 0)
        .map((b, i) => {
          if (b.type === 'h') return <p key={i} className="md-h">{inline(b.lines[0])}</p>;
          if (b.type === 'ul' || b.type === 'ol') {
            const List = b.type;
            return (
              <List key={i}>
                {b.lines.map((l, j) => (
                  <li key={j}>{inline(l)}</li>
                ))}
              </List>
            );
          }
          return (
            <p key={i}>
              {b.lines.flatMap((l, j) => (j ? [<br key={`br${j}`} />, ...inline(l, j)] : inline(l, j)))}
            </p>
          );
        })}
    </div>
  );
}
