// Controles de formulário reutilizáveis
import type { ReactNode } from 'react';
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
      <div className="stepper" role="group" aria-label={label}>
        <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Menos ${label.toLowerCase()}`}>
          <Icon name="minus" size={18} />
        </button>
        <output aria-live="polite">{value}</output>
        <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Mais ${label.toLowerCase()}`}>
          <Icon name="plus" size={18} />
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
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
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

export function Section({ icon, title, children, aside }: { icon: IconName; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <fieldset className="form-section">
      <legend className="form-section-title">
        <span className="form-section-icon">
          <Icon name={icon} size={16} />
        </span>
        {title}
        {aside && <span className="form-section-aside">{aside}</span>}
      </legend>
      {children}
    </fieldset>
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
