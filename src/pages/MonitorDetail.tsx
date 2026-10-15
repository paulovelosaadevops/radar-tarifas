import { useState } from 'react';
import { LineChart } from '../components/charts';
import { Delta, EmptyState, RangeFilter } from '../components/common';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { MonitorForm } from '../components/MonitorForm';
import { AlertItem } from './Alerts';
import { monitorStats, useRange } from '../data/stats';
import { useStore } from '../data/store';
import { CATEGORY_LABEL } from '../data/types';
import { brl, brlAxis } from '../lib/format';
import { navigate } from '../lib/router';

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
        <Delta change={s.change} suffix={`em ${range} dias`} />
      </header>

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
          <p className="muted">O histórico começa hoje. O gráfico aparece a partir do segundo dia de monitoramento.</p>
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
          <MonitorForm
            initial={m}
            onCancel={() => setEditing(false)}
            onSubmit={(d) => {
              updateMonitor(m.id, { name: d.name, category: d.category, detail: d.detail, unit: d.unit, targetPrice: d.targetPrice, alertPct: d.alertPct });
              setEditing(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
