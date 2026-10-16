import { useState, type FormEvent } from 'react';
import { isAuto, type Monitor } from '../data/types';
import { brl } from '../lib/format';
import { hotelDetail } from '../data/describe';
import { ChoiceChips, moneyInput, parseMoney, Switch } from './fields';

export type MonitorEdit = Pick<Monitor, 'name' | 'detail' | 'targetPrice' | 'alertPct'> & { query?: Monitor['query'] };

/** Edição do que não muda a busca. Para mudar datas ou passageiros, crie outro monitor. */
export function EditMonitorForm({ monitor: m, onSubmit, onCancel }: { monitor: Monitor; onSubmit: (d: MonitorEdit) => void; onCancel: () => void }) {
  const current = m.history[m.history.length - 1]?.value ?? null;
  const hotel = m.query?.kind === 'hotel' && m.query.childrenAges.length > 0 ? m.query : null;
  const [name, setName] = useState(m.name);
  const [detail, setDetail] = useState(m.detail);
  const [target, setTarget] = useState(moneyInput(m.targetPrice));
  const [alertPct, setAlertPct] = useState(m.alertPct);
  const [childrenFree, setChildrenFree] = useState(!!hotel?.childrenFree);
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const targetPrice = target.trim() ? parseMoney(target) : null;
    if (!name.trim()) return setError('Dê um nome ao monitor.');
    if (targetPrice != null && !(targetPrice > 0)) return setError('O preço-alvo precisa ser maior que zero.');
    const query = hotel && childrenFree !== !!hotel.childrenFree ? { ...hotel, childrenFree } : undefined;
    onSubmit({
      name: name.trim(),
      detail: query ? hotelDetail(query) : isAuto(m) ? m.detail : detail.trim(),
      targetPrice,
      alertPct,
      ...(query ? { query } : {}),
    });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="form-card">
      <label className="field">
        <span>Nome</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
      </label>

      {!isAuto(m) && (
        <label className="field">
          <span>Detalhes</span>
          <input value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={120} />
        </label>
      )}

      <label className="field">
        <span>
          Preço-alvo <em>(opcional)</em>
        </span>
        <div className="money-input">
          <span>R$</span>
          <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="0,00" />
          {m.unit && <span>{m.unit}</span>}
        </div>
        {current != null && <span className="field-hint">Preço atual: {brl(current, m.unit)}</span>}
      </label>

      <ChoiceChips
        segmented label="Avisar quando variar em um dia"
        value={alertPct}
        onChange={setAlertPct}
        options={Array.from(new Set([3, 5, 10, 15, alertPct])).sort((a, b) => a - b).map((v) => ({ value: v, label: `${String(v).replace('.', ',')}%` }))}
      />

      {hotel && (
        <Switch
          label="Crianças não pagam"
          hint="O Google cobra cada criança como um adulto. Ligado, o preço considera só os adultos. Depois de salvar, toque em “Atualizar agora”."
          checked={childrenFree}
          onChange={setChildrenFree}
        />
      )}
      </div>

      {isAuto(m) && <p className="card-sub form-note">Para mudar datas, trecho ou passageiros, crie um novo monitor.</p>}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-footer">
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          Salvar
        </button>
      </div>
    </form>
  );
}
