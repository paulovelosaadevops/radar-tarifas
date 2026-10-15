import { useState, type FormEvent } from 'react';
import { CATEGORY_LABEL, type Category, type Monitor } from '../data/types';
import type { NewMonitor } from '../data/store';

const UNIT_BY_CATEGORY: Record<Category, string> = { voo: '', hotel: '', energia: '/kWh', bancaria: '/mês', outro: '' };

const parseNumber = (s: string) => {
  const v = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
};
const toInput = (v: number | null | undefined) => (v == null ? '' : String(v).replace('.', ','));

type Props = {
  initial?: Monitor;
  onSubmit: (data: NewMonitor) => void;
  onCancel: () => void;
};

export function MonitorForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'voo');
  const [detail, setDetail] = useState(initial?.detail ?? '');
  const [price, setPrice] = useState(toInput(initial?.history[initial.history.length - 1]?.value));
  const [target, setTarget] = useState(toInput(initial?.targetPrice));
  const [alertPct, setAlertPct] = useState(String(initial?.alertPct ?? 5));
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const currentPrice = parseNumber(price);
    const targetPrice = target.trim() ? parseNumber(target) : null;
    const pct = parseNumber(alertPct);

    if (!name.trim()) return setError('Dê um nome ao monitor.');
    if (!(currentPrice > 0)) return setError('Informe o preço atual, maior que zero.');
    if (targetPrice != null && !(targetPrice > 0)) return setError('O preço-alvo precisa ser maior que zero.');
    if (!(pct > 0 && pct <= 50)) return setError('A variação para alerta deve ficar entre 0,1% e 50%.');

    onSubmit({
      name: name.trim(),
      category,
      detail: detail.trim(),
      unit: UNIT_BY_CATEGORY[category],
      targetPrice,
      alertPct: pct,
      currentPrice,
    });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span>Nome</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: São Paulo → Lisboa" autoFocus />
      </label>

      <label className="field">
        <span>Categoria</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Detalhes <em>(opcional)</em></span>
        <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Ex.: GRU–LIS · ida e volta · março" />
      </label>

      <div className="field-row">
        <label className="field">
          <span>{initial ? 'Preço atual' : 'Preço atual (R$)'}</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            disabled={!!initial}
          />
        </label>
        <label className="field">
          <span>Preço-alvo <em>(opcional)</em></span>
          <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="0,00" />
        </label>
      </div>

      <label className="field">
        <span>Avisar quando variar mais de (% em um dia)</span>
        <input value={alertPct} onChange={(e) => setAlertPct(e.target.value)} inputMode="decimal" />
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          {initial ? 'Salvar' : 'Criar monitor'}
        </button>
      </div>
    </form>
  );
}
