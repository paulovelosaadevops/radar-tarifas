import { useEffect, type ReactNode } from 'react';
import { RANGES, type Range } from '../data/stats';
import { signedPct } from '../lib/format';
import { Icon } from './Icon';

export function RangeFilter({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="segmented" role="group" aria-label="Período">
      {RANGES.map((r) => (
        <button key={r} type="button" className={value === r ? 'is-active' : ''} aria-pressed={value === r} onClick={() => onChange(r)}>
          {r} dias
        </button>
      ))}
    </div>
  );
}

/** Variação de preço: cair é bom (verde), subir é ruim (vermelho). Sempre com ícone. */
export function Delta({ change, suffix }: { change: number; suffix?: string }) {
  const rounded = Math.round(change * 10) / 10;
  const kind = rounded < 0 ? 'good' : rounded > 0 ? 'bad' : 'flat';
  return (
    <span className={`delta delta-${kind}`}>
      {kind !== 'flat' && <Icon name={kind === 'good' ? 'down' : 'up'} size={14} />}
      <span>{kind === 'flat' ? 'Estável' : signedPct(rounded)}</span>
      {suffix && <span className="delta-suffix">{suffix}</span>}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: Parameters<typeof Icon>[0]['name']; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={28} />
      </div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
