// Componentes base do visual (estilo iOS): barra de navegação, título grande, listas agrupadas e linhas
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RANGES, type Range } from '../data/stats';
import { signedPct } from '../lib/format';
import { Icon, type IconName } from './Icon';

/* ---------- Barra de navegação + título grande ---------- */

/** A barra fica transparente enquanto o título grande está visível e ganha fundo translúcido ao rolar */
function useCompact<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), { rootMargin: '-52px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, compact] as const;
}

export function NavBar({ title, compact, leading, trailing }: { title: ReactNode; compact: boolean; leading?: ReactNode; trailing?: ReactNode }) {
  return (
    <div className={`navbar${compact ? ' is-compact' : ''}`}>
      <div className="navbar-side">{leading}</div>
      <div className="navbar-title" aria-hidden={!compact}>
        {title}
      </div>
      <div className="navbar-side navbar-side-end">{trailing}</div>
    </div>
  );
}

export function LargeTitle({ title, subtitle, leading, trailing }: { title: string; subtitle?: ReactNode; leading?: ReactNode; trailing?: ReactNode }) {
  const [ref, compact] = useCompact<HTMLHeadingElement>();
  return (
    <>
      <NavBar title={title} compact={compact} leading={leading} trailing={trailing} />
      <header className="large-title">
        <h1 ref={ref}>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </header>
    </>
  );
}

/** Cabeçalho com conteúdo próprio (ex.: detalhe do monitor) que também encolhe a barra */
export function CompactHeader({ title, leading, trailing, children }: { title: string; leading?: ReactNode; trailing?: ReactNode; children: ReactNode }) {
  const [ref, compact] = useCompact<HTMLDivElement>();
  return (
    <>
      <NavBar title={title} compact={compact} leading={leading} trailing={trailing} />
      <div ref={ref}>{children}</div>
    </>
  );
}

/** Mantido para telas antigas: equivale ao título grande */
export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) => (
  <LargeTitle title={title} subtitle={subtitle} trailing={actions} />
);

export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="nav-back" onClick={onClick}>
      <Icon name="back" size={22} />
      <span>{label}</span>
    </button>
  );
}

export function TextButton({ children, onClick, disabled, destructive }: { children: ReactNode; onClick: () => void; disabled?: boolean; destructive?: boolean }) {
  return (
    <button type="button" className={`text-btn${destructive ? ' is-destructive' : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function CircleButton({ icon, label, onClick, disabled, spinning, filled }: { icon: IconName; label: string; onClick: () => void; disabled?: boolean; spinning?: boolean; filled?: boolean }) {
  return (
    <button type="button" className={`circle-btn${filled ? ' is-filled' : ''}`} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <Icon name={icon} size={18} className={spinning ? 'spin' : undefined} />
    </button>
  );
}

/* ---------- Controle segmentado ---------- */

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  full,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  full?: boolean;
}) {
  return (
    <div className={`segmented${full ? ' segmented-full' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'is-active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const RANGE_LABEL: Record<Range, string> = { 7: '7 dias', 30: '1 mês', 90: '3 meses' };

export function RangeFilter({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return <Segmented label="Período" full value={value} onChange={onChange} options={RANGES.map((r) => ({ value: r, label: RANGE_LABEL[r] }))} />;
}

export const rangeText = (r: number) => (r === 7 ? 'em 7 dias' : r === 30 ? 'em 1 mês' : 'em 3 meses');

/* ---------- Variação ---------- */

export type Direction = 'good' | 'bad' | 'flat';
export const direction = (change: number): Direction => {
  const r = Math.round(change * 10) / 10;
  return r < 0 ? 'good' : r > 0 ? 'bad' : 'flat';
};

/** Variação de preço: cair é bom (verde), subir é ruim (vermelho). Sempre com ícone. */
export function Delta({ change, suffix }: { change: number; suffix?: string }) {
  const kind = direction(change);
  return (
    <span className={`delta delta-${kind}`}>
      {kind !== 'flat' && <Icon name={kind === 'good' ? 'down' : 'up'} size={14} />}
      <span>{kind === 'flat' ? 'Estável' : signedPct(Math.round(change * 10) / 10)}</span>
      {suffix && <span className="delta-suffix">{suffix}</span>}
    </span>
  );
}

/** Pílula do app Ações */
export function Pill({ change, isNew }: { change: number; isNew?: boolean }) {
  if (isNew) return <span className="pill pill-flat">Novo</span>;
  const kind = direction(change);
  return (
    <span className={`pill pill-${kind}`} aria-label={kind === 'good' ? `caiu ${signedPct(change)}` : kind === 'bad' ? `subiu ${signedPct(change)}` : 'estável'}>
      {kind === 'flat' ? '0,0%' : signedPct(Math.round(change * 10) / 10)}
    </span>
  );
}

/* ---------- Listas agrupadas ---------- */

export function Group({ header, footer, children, className }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`group${className ? ` ${className}` : ''}`}>
      {header && <h2 className="group-header">{header}</h2>}
      <div className="list">{children}</div>
      {footer && <div className="group-footer">{footer}</div>}
    </section>
  );
}

export type Tone = 'green' | 'blue' | 'indigo' | 'orange' | 'red' | 'purple' | 'gray' | 'teal' | 'yellow' | 'pink';

export function RowIcon({ icon, tone }: { icon: IconName; tone: Tone }) {
  return (
    <span className={`row-icon tone-${tone}`}>
      <Icon name={icon} size={17} />
    </span>
  );
}

type RowProps = {
  icon?: IconName;
  tone?: Tone;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
  tint?: boolean;
  center?: boolean;
  disabled?: boolean;
  multiline?: boolean;
};

export function Row({ icon, tone = 'gray', title, subtitle, value, trailing, chevron, href, onClick, destructive, tint, center, disabled, multiline }: RowProps) {
  const external = !!href;
  const cls = ['row', destructive && 'is-destructive', tint && 'is-tint', center && 'is-center', (href || onClick) && 'is-action', multiline && 'is-multiline'].filter(Boolean).join(' ');
  const body = (
    <>
      {icon && <RowIcon icon={icon} tone={tone} />}
      <span className="row-body">
        <span className="row-text">
          <span className="row-title">{title}</span>
          {subtitle && <span className="row-subtitle">{subtitle}</span>}
        </span>
        {value != null && <span className="row-value">{value}</span>}
        {trailing}
        {external && <Icon name="external" size={15} className="row-chevron" />}
        {chevron && !external && <Icon name="back" size={16} className="row-chevron row-chevron-right" />}
      </span>
    </>
  );
  if (href) {
    return (
      <a className={cls} href={href} target="_blank" rel="noopener noreferrer">
        {body}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={disabled}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </label>
  );
}

/* ---------- Avisos e estados ---------- */

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

export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={30} />
      </div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
