import { useState } from 'react';
import { LineChart } from '../components/charts';
import { Delta, EmptyState, RangeFilter } from '../components/common';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { EditMonitorForm } from '../components/MonitorForm';
import { moneyInput, parseMoney } from '../components/fields';
import { AlertItem } from './Alerts';
import { querySummary } from '../data/describe';
import { monitorStats, useRange } from '../data/stats';
import { useStore } from '../data/store';
import { CATEGORY_LABEL, type Monitor } from '../data/types';
import { brl, brlAxis } from '../lib/format';
import { navigate } from '../lib/router';

const LEVEL: Record<string, { label: string; tone: string }> = {
  low: { label: 'Preço baixo', tone: 'good' },
  typical: { label: 'Preço típico', tone: 'flat' },
  high: { label: 'Preço alto', tone: 'bad' },
};

function fmtChecked(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? `hoje às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function SourcePanel({ m }: { m: Monitor }) {
  const { refreshMonitor, recordPrice, refreshing } = useStore();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const last = m.history[m.history.length - 1]?.value;

  if (m.source === 'simulado') {
    return (
      <section className="card source-card">
        <p className="card-sub">
          <strong>Monitor de exemplo.</strong> Os preços são simulados para demonstração. Crie um monitor de passagem ou hospedagem para ver preços reais.
        </p>
      </section>
    );
  }

  if (m.source === 'manual') {
    const save = () => {
      const v = parseMoney(value);
      if (!(v > 0)) return setError('Informe um valor maior que zero.');
      recordPrice(m.id, v);
      setValue('');
      setError('');
    };
    return (
      <section className="card source-card">
        <div>
          <h2>Registrar valor</h2>
          <p className="card-sub">Esta tarifa é atualizada por você. {m.lastChecked ? `Último registro ${fmtChecked(m.lastChecked)}.` : ''}</p>
        </div>
        <div className="record-row">
          <div className="money-input">
            <span>R$</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              inputMode="decimal"
              placeholder={last != null ? moneyInput(last) : '0,00'}
              aria-label="Novo valor"
            />
            {m.unit && <span>{m.unit}</span>}
          </div>
          <button type="button" className="btn btn-primary" onClick={save}>
            Registrar
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </section>
    );
  }

  const level = m.insights?.priceLevel ? LEVEL[m.insights.priceLevel] : null;
  return (
    <section className="card source-card">
      <div className="card-header">
        <div>
          <h2>{m.query?.kind === 'voo' ? 'Google Flights' : 'Google Hotels'}</h2>
          <p className="card-sub">
            {m.lastChecked ? `Atualizado ${fmtChecked(m.lastChecked)}` : 'Ainda não atualizado'} · busca automática 1 vez por dia
          </p>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => refreshMonitor(m.id)} disabled={refreshing}>
          <Icon name="refresh" size={16} className={refreshing ? 'spin' : undefined} /> Atualizar
        </button>
      </div>

      {m.lastError && (
        <p className="form-error" role="alert">
          {m.lastError}
        </p>
      )}

      {(level || m.insights?.typicalRange || m.insights?.best) && (
        <div className="insights">
          {level && <span className={`level level-${level.tone}`}>{level.label}</span>}
          {m.insights?.typicalRange && (
            <span className="card-sub">
              Normalmente entre {brl(m.insights.typicalRange[0])} e {brl(m.insights.typicalRange[1])}
            </span>
          )}
          {m.insights?.best && <span className="card-sub">Melhor opção: {m.insights.best}</span>}
        </div>
      )}

      {m.query && (
        <dl className="summary">
          {querySummary(m.query).map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function MonitorDetail({ id }: { id: string }) {
  const { monitors, alerts, updateMonitor, deleteMonitor, setPendingPrompt } = useStore();
  const [range, setRange] = useRange('monitor');
  const [editing, setEditing] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const m = monitors.find((x) => x.id === id);
  if (!m) {
    return (
      <div className="page">
        <EmptyState icon="chart" title="Monitor não encontrado">
          <button type="button" className="btn" onClick={() => navigate('/')}>
            Voltar ao painel
          </button>
        </EmptyState>
      </div>
    );
  }

  const s = monitorStats(m, range);
  const fmt = (v: number) => brl(v, m.unit);
  const fmtTile = (v: number) => (v >= 100 ? brlAxis(v) + m.unit : fmt(v));
  const monitorAlerts = alerts.filter((a) => a.monitorId === m.id).slice(0, 5);

  const onDelete = () => {
    if (confirm(`Excluir o monitor "${m.name}"? O histórico e os alertas dele serão apagados.`)) {
      deleteMonitor(m.id);
      navigate('/');
    }
  };

  const askAI = () => {
    setPendingPrompt(`Analise o monitor "${m.name}". Vale a pena comprar agora ou esperar?`);
    navigate('/chat');
  };

  return (
    <div className="page">
      <div className="detail-top">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
          <Icon name="back" size={18} /> Painel
        </button>
        <div className="detail-actions">
          <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label="Editar monitor" title="Editar">
            <Icon name="edit" />
          </button>
          <button type="button" className="icon-btn icon-btn-danger" onClick={onDelete} aria-label="Excluir monitor" title="Excluir">
            <Icon name="trash" />
          </button>
        </div>
      </div>

      <header className="detail-header">
        <span className="tag">{CATEGORY_LABEL[m.category]}</span>
        <h1>{m.name}</h1>
        {m.detail && <p className="muted">{m.detail}</p>}
        <div className="detail-price">
          <span className="price price-lg">{brl(s.current)}</span>
          {m.unit && <span className="unit">{m.unit}</span>}
        </div>
        {s.points.length > 1 ? <Delta change={s.change} suffix={`em ${range} dias`} /> : <span className="delta delta-flat">Monitorando desde hoje</span>}
      </header>

      <SourcePanel m={m} />

      <div className="filters">
        <RangeFilter value={range} onChange={setRange} />
      </div>

      <section className="tiles tiles-3" aria-label={`Resumo de ${range} dias`}>
        <div className="tile">
          <span className="tile-label">Mínima</span>
          <span className="tile-value tile-value-sm">{fmtTile(s.min)}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Média</span>
          <span className="tile-value tile-value-sm">{fmtTile(s.avg)}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Máxima</span>
          <span className="tile-value tile-value-sm">{fmtTile(s.max)}</span>
        </div>
      </section>

      <section className="card" aria-labelledby="hist-title">
        <div className="card-header">
          <div>
            <h2 id="hist-title">Histórico de preço</h2>
            <p className="card-sub">Últimos {range} dias</p>
          </div>
          <button type="button" className="icon-btn" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable} title={showTable ? 'Ver gráfico' : 'Ver tabela'}>
            <Icon name={showTable ? 'chart' : 'table'} />
          </button>
        </div>

        {showTable ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col" className="num">Preço</th>
                </tr>
              </thead>
              <tbody>
                {[...s.points].reverse().map((p) => (
                  <tr key={p.date}>
                    <td>{new Date(p.date + 'T12:00').toLocaleDateString('pt-BR')}</td>
                    <td className="num">{fmt(p.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : s.points.length < 2 ? (
          <p className="muted">
            O histórico começa hoje com {fmt(s.current)}. O gráfico aparece a partir do segundo dia de monitoramento
            {m.source === 'serpapi' ? ': o app busca o preço de novo uma vez por dia, quando você abre.' : '.'}
          </p>
        ) : (
          <LineChart
            series={[{ id: m.id, label: m.name, color: 'var(--series-1)', points: s.points }]}
            format={fmt}
            axisFormat={brlAxis}
            height={280}
            area
            reference={m.targetPrice != null ? { value: m.targetPrice, label: `Alvo ${brl(m.targetPrice)}` } : null}
            label={`Histórico de preço de ${m.name}`}
          />
        )}
      </section>

      <section className="card">
        <div className="setting-row">
          <div>
            <h2>Monitoramento ativo</h2>
            <p className="card-sub">
              {m.targetPrice != null ? `Alvo ${brl(m.targetPrice, m.unit)} · ` : ''}avisa com variação de {String(m.alertPct).replace('.', ',')}% em um dia
            </p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={m.active} onChange={(e) => updateMonitor(m.id, { active: e.target.checked })} />
            <span className="switch-track" aria-hidden="true" />
            <span className="sr-only">Monitoramento ativo</span>
          </label>
        </div>
      </section>

      <button type="button" className="btn btn-block btn-ai" onClick={askAI}>
        <Icon name="sparkle" size={18} /> Perguntar à IA sobre este monitor
      </button>

      {monitorAlerts.length > 0 && (
        <section aria-labelledby="mon-alerts">
          <h2 className="section-title" id="mon-alerts">
            Alertas recentes
          </h2>
          <ul className="alert-list">
            {monitorAlerts.map((a) => (
              <AlertItem key={a.id} alert={a} />
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <Modal title="Editar monitor" onClose={() => setEditing(false)}>
          <EditMonitorForm
            monitor={m}
            onCancel={() => setEditing(false)}
            onSubmit={(d) => {
              updateMonitor(m.id, d);
              setEditing(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
