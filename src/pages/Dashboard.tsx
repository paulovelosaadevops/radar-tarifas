import { useCallback, useState } from 'react';
import { LineChart, Sparkline, type ChartSeries } from '../components/charts';
import { Delta, EmptyState, PageHeader, RangeFilter, Toast } from '../components/common';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { MonitorForm } from '../components/MonitorForm';
import { monitorStats, useRange } from '../data/stats';
import { useStore } from '../data/store';
import { CATEGORY_LABEL, type Monitor } from '../data/types';
import { brl, pct, signedPct } from '../lib/format';
import { navigate } from '../lib/router';

const SERIES_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
type Slots = [string | null, string | null, string | null];

export function Dashboard() {
  const { monitors, unreadCount, checkNow, addMonitor } = useStore();
  const [range, setRange] = useRange('dashboard');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const clearToast = useCallback(() => setToast(null), []);

  const active = monitors.filter((m) => m.active);
  const stats = active.map((m) => ({ m, s: monitorStats(m, range) }));

  // Comparação: até 3 monitores, cada um preso ao seu "slot" de cor
  const comparable = active.filter((m) => m.history.length > range);
  const [slots, setSlots] = useState<Slots>(() => {
    const ids = comparable.slice(0, 3).map((m) => m.id);
    return [ids[0] ?? null, ids[1] ?? null, ids[2] ?? null];
  });
  const validSlots = slots.map((id) => (id && comparable.some((m) => m.id === id) ? id : null)) as Slots;

  const toggleCompare = (id: string) => {
    setSlots((current) => {
      const next = [...current] as Slots;
      const at = next.indexOf(id);
      if (at >= 0) next[at] = null;
      else {
        const free = next.findIndex((s) => s == null || !comparable.some((m) => m.id === s));
        if (free >= 0) next[free] = id;
      }
      return next;
    });
  };

  const series: ChartSeries[] = validSlots.flatMap((id, slot) => {
    const m = comparable.find((c) => c.id === id);
    if (!m) return [];
    const points = m.history.slice(-(range + 1));
    const start = points[0].value;
    return [{ id: m.id, label: m.name, color: SERIES_COLORS[slot], points: points.map((p) => ({ date: p.date, value: ((p.value - start) / start) * 100 })) }];
  });

  const withTarget = stats.filter((x) => x.m.targetPrice != null);
  const below = withTarget.filter((x) => x.s.belowTarget);
  const biggestDrop = stats.reduce<(typeof stats)[number] | null>((best, x) => (!best || x.s.change < best.s.change ? x : best), null);

  const onCheck = () => {
    const found = checkNow();
    setToast(found === 0 ? 'Preços verificados. Nenhuma mudança relevante.' : `${found} ${found === 1 ? 'novo alerta' : 'novos alertas'}.`);
  };

  const onCreate = (data: Parameters<typeof addMonitor>[0]) => {
    const id = addMonitor(data);
    setAdding(false);
    navigate(`/monitor/${id}`);
  };

  return (
    <div className="page">
      <PageHeader
        title="Painel"
        subtitle={`${active.length} ${active.length === 1 ? 'monitor ativo' : 'monitores ativos'}`}
        actions={
          <>
            <button type="button" className="btn" onClick={onCheck}>
              <Icon name="refresh" size={18} />
              <span className="hide-sm">Verificar agora</span>
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
              <Icon name="plus" size={18} />
              <span>Novo monitor</span>
            </button>
          </>
        }
      />

      {monitors.length === 0 ? (
        <EmptyState icon="chart" title="Nenhum monitor ainda">
          <p>Crie um monitor para acompanhar o preço de uma passagem, hospedagem, conta de energia ou tarifa bancária.</p>
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} /> Criar primeiro monitor
          </button>
        </EmptyState>
      ) : (
        <>
          <div className="filters">
            <RangeFilter value={range} onChange={setRange} />
          </div>

          <section className="tiles" aria-label="Resumo">
            <div className="tile">
              <span className="tile-label">Abaixo do alvo</span>
              <span className="tile-value">
                {below.length}
                <small> de {withTarget.length}</small>
              </span>
              <span className="tile-sub">com preço-alvo</span>
            </div>
            <div className="tile">
              <span className="tile-label">Maior queda em {range} dias</span>
              {biggestDrop && biggestDrop.s.change < 0 ? (
                <>
                  <span className="tile-value">{signedPct(biggestDrop.s.change)}</span>
                  <span className="tile-sub">{biggestDrop.m.name}</span>
                </>
              ) : (
                <>
                  <span className="tile-value">—</span>
                  <span className="tile-sub">nenhum preço caiu</span>
                </>
              )}
            </div>
            <button type="button" className="tile tile-link" onClick={() => navigate('/alertas')}>
              <span className="tile-label">Alertas não lidos</span>
              <span className="tile-value">{unreadCount}</span>
              <span className="tile-sub">ver alertas →</span>
            </button>
          </section>

          {comparable.length > 0 && (
            <section className="card" aria-labelledby="compare-title">
              <div className="card-header">
                <div>
                  <h2 id="compare-title">Variação no período</h2>
                  <p className="card-sub">Quanto cada preço mudou desde {range} dias atrás, em %</p>
                </div>
                <button type="button" className="icon-btn" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable} title={showTable ? 'Ver gráfico' : 'Ver tabela'}>
                  <Icon name={showTable ? 'chart' : 'table'} />
                </button>
              </div>

              <div className="chips" role="group" aria-label="Monitores comparados (até 3)">
                {comparable.map((m) => {
                  const slot = validSlots.indexOf(m.id);
                  const full = slot < 0 && validSlots.every((s) => s != null);
                  return (
                    <button key={m.id} type="button" className={`chip${slot >= 0 ? ' is-on' : ''}`} aria-pressed={slot >= 0} disabled={full} onClick={() => toggleCompare(m.id)}>
                      {slot >= 0 && <span className="line-key" style={{ background: SERIES_COLORS[slot] }} />}
                      {m.name}
                    </button>
                  );
                })}
              </div>

              {series.length === 0 ? (
                <p className="muted">Escolha até 3 monitores acima para comparar.</p>
              ) : showTable ? (
                <CompareTable series={series} />
              ) : (
                <LineChart series={series} format={signedPct} axisFormat={(v) => `${v > 0 ? '+' : ''}${v}%`} label="Variação percentual dos preços no período" />
              )}
            </section>
          )}

          <section aria-label="Monitores">
            <h2 className="section-title">Monitores</h2>
            <div className="monitor-grid">
              {monitors.map((m) => (
                <MonitorCard key={m.id} monitor={m} range={range} />
              ))}
            </div>
          </section>
        </>
      )}

      {adding && (
        <Modal title="Novo monitor" onClose={() => setAdding(false)}>
          <MonitorForm onSubmit={onCreate} onCancel={() => setAdding(false)} />
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>
  );
}

function MonitorCard({ monitor: m, range }: { monitor: Monitor; range: number }) {
  const s = monitorStats(m, range);
  const gap = m.targetPrice != null ? s.current - m.targetPrice : null;

  return (
    <button type="button" className={`monitor-card${m.active ? '' : ' is-paused'}`} onClick={() => navigate(`/monitor/${m.id}`)}>
      <div className="monitor-card-top">
        <span className="tag">{CATEGORY_LABEL[m.category]}</span>
        {!m.active && <span className="tag tag-muted">Pausado</span>}
      </div>
      <h3 className="monitor-card-name">{m.name}</h3>
      {m.detail && <p className="monitor-card-detail">{m.detail}</p>}
      <div className="monitor-card-price">
        <span className="price">{brl(s.current)}</span>
        {m.unit && <span className="unit">{m.unit}</span>}
      </div>
      <Delta change={s.change} suffix={`em ${range} dias`} />
      {s.points.length > 1 && <Sparkline points={s.points} />}
      {gap != null && (
        <p className={`monitor-card-target${gap <= 0 ? ' is-hit' : ''}`}>
          <Icon name={gap <= 0 ? 'check' : 'target'} size={14} />
          {gap <= 0 ? `Abaixo do alvo de ${brl(m.targetPrice!)}` : `Faltam ${brl(gap)} (${pct((gap / s.current) * 100)}) para o alvo`}
        </p>
      )}
    </button>
  );
}

function CompareTable({ series }: { series: ChartSeries[] }) {
  const dates = series[0].points.map((p) => p.date);
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Data</th>
            {series.map((s) => (
              <th key={s.id} scope="col">
                <span className="line-key" style={{ background: s.color }} /> {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...dates].reverse().map((d, ri) => {
            const i = dates.length - 1 - ri;
            return (
              <tr key={d}>
                <td>{new Date(d + 'T12:00').toLocaleDateString('pt-BR')}</td>
                {series.map((s) => (
                  <td key={s.id} className="num">
                    {signedPct(s.points[i]?.value ?? 0)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
