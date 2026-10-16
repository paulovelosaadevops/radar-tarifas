// Controles de formulário reutilizáveis
import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="stepper-row">
      <div className="stepper-text">
        <span className="stepper-label">{label}</span>
        {hint && <span className="stepper-hint">{hint}</span>}
      </div>
      <output className="stepper-value" aria-live="polite">
        {value}
      </output>
      <div className="stepper" role="group" aria-label={label}>
        <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Menos ${label.toLowerCase()}`}>
          <Icon name="minus" size={16} />
        </button>
        <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Mais ${label.toLowerCase()}`}>
          <Icon name="plus" size={16} />
        </button>
      </div>
    </div>
  );
}

export function ChoiceChips<T extends string | number>({
  label,
  options,
  value,
  onChange,
  segmented,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** Controle segmentado do iOS (para poucas opções curtas) */
  segmented?: boolean;
}) {
  if (segmented) {
    return (
      <div className="field">
        <span>{label}</span>
        <div className="segmented segmented-full" role="radiogroup" aria-label={label}>
          {options.map((o) => (
            <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'is-active' : ''} onClick={() => onChange(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="field">
      <span>{label}</span>
      <div className="choice-chips" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={`choice-chip${value === o.value ? ' is-on' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {value === o.value && <Icon name="check" size={14} />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MultiChips({
  label,
  options,
  value,
  onChange,
  visible,
}: {
  label: string;
  options: { value: number; label: string }[];
  value: number[];
  onChange: (v: number[]) => void;
  /** Quantas mostrar antes do "Mostrar mais" (as já marcadas sempre aparecem) */
  visible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const toggle = (v: number) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const shown = !visible || expanded ? options : options.filter((o, i) => i < visible || value.includes(o.value));
  const hidden = options.length - shown.length;

  return (
    <div className="field">
      <span>
        {label}
        {value.length > 0 && (
          <button type="button" className="link-btn" onClick={() => onChange([])}>
            limpar ({value.length})
          </button>
        )}
      </span>
      <div className="choice-chips" role="group" aria-label={label}>
        {shown.map((o) => {
          const on = value.includes(o.value);
          return (
            <button key={o.value} type="button" aria-pressed={on} className={`choice-chip${on ? ' is-on' : ''}`} onClick={() => toggle(o.value)}>
              {on && <Icon name="check" size={14} />}
              {o.label}
            </button>
          );
        })}
        {visible && (hidden > 0 || expanded) && (
          <button type="button" className="choice-chip choice-chip-more" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
            {expanded ? 'Mostrar menos' : `+ ${hidden} opções`}
          </button>
        )}
      </div>
    </div>
  );
}

/** Seção do formulário no estilo lista agrupada: título acima, conteúdo num cartão */
export function Section({ icon, title, children, aside }: { icon: IconName; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="form-section" aria-label={title}>
      <h3 className="form-section-title">
        <Icon name={icon} size={14} />
        {title}
        {aside && <span className="form-section-aside">{aside}</span>}
      </h3>
      <div className="form-card">{children}</div>
    </section>
  );
}

export function DateField({ label, value, min, onChange }: { label: string; value: string; min?: string; onChange: (v: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="date" value={value} min={min} onChange={(e) => onChange(e.target.value)} required />
    </label>
  );
}

export function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="setting-row switch-row">
      <span>
        <span>{label}</span>
        {hint && <span className="card-sub" style={{ display: 'block' }}>{hint}</span>}
      </span>
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch-track" aria-hidden="true" />
      </span>
    </label>
  );
}

export const parseMoney = (s: string) => {
  const v = Number(s.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
};

export const moneyInput = (v: number | null | undefined) =>
  v == null ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
