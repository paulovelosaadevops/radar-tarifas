import { useCallback, useState } from 'react';
import { LineChart, Sparkline, type ChartSeries } from '../components/charts';
import { CircleButton, direction, EmptyState, Group, LargeTitle, Pill, RangeFilter, rangeText, Toast } from '../components/common';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { NewMonitor } from '../components/NewMonitor';
import { monitorStats, useRange } from '../data/stats';
import { useStore, type NewMonitor as NewMonitorData } from '../data/store';
import { type Monitor } from '../data/types';
import { brl, signedPct } from '../lib/format';
import { navigate } from '../lib/router';

const SERIES_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
type Slots = [string | null, string | null, string | null];

const today = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(new Date());

export function Dashboard() {
  const { monitors, unreadCount, checkNow, addMonitor, refreshing } = useStore();
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
  const biggestDrop = stats.reduce<(typeof stats)[number] | null>((best, x) => (x.s.points.length > 1 && (!best || x.s.change < best.s.change) ? x : best), null);

  const onCheck = async () => {
    const { alerts, errors } = await checkNow();
    const parts = [alerts === 0 ? 'Preços verificados. Nenhuma mudança relevante.' : `${alerts} ${alerts === 1 ? 'novo alerta' : 'novos alertas'}.`];
    if (errors) parts.push(`${errors} ${errors === 1 ? 'busca falhou' : 'buscas falharam'}.`);
    setToast(parts.join(' '));
  };

  const onCreate = (data: NewMonitorData) => {
    const id = addMonitor(data);
    setAdding(false);
    navigate(`/monitor/${id}`);
  };

  return (
    <div className="page">
      <LargeTitle
        title="Radar"
        subtitle={today}
        trailing={
          <>
            <CircleButton icon="refresh" label="Verificar preços agora" onClick={onCheck} disabled={refreshing} spinning={refreshing} />
            <CircleButton icon="plus" label="Novo monitor" onClick={() => setAdding(true)} filled />
          </>
        }
      />

      {monitors.length === 0 ? (
        <EmptyState icon="chart" title="Nenhum monitor ainda">
          <p>Acompanhe o preço de passagens, hospedagens e tarifas. Avisamos quando cair.</p>
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} /> Criar primeiro monitor
          </button>
        </EmptyState>
      ) : (
        <>
          <RangeFilter value={range} onChange={setRange} />

          <section className="widgets" aria-label="Resumo">
            <div className="widget">
              <span className="widget-label">
                <Icon name="target" size={14} /> Abaixo do alvo
              </span>
              <span className="widget-value">
                {below.length}
                <small> de {withTarget.length}</small>
              </span>
            </div>
            <div className="widget">
              <span className="widget-label">
                <Icon name="down" size={14} /> Maior queda
              </span>
              {biggestDrop && biggestDrop.s.change < 0 ? (
                <>
                  <span className="widget-value widget-value-good">{signedPct(biggestDrop.s.change)}</span>
                  <span className="widget-sub">{biggestDrop.m.name}</span>
                </>
              ) : (
                <>
                  <span className="widget-value">—</span>
                  <span className="widget-sub">nenhum preço caiu</span>
                </>
              )}
            </div>
            <button type="button" className="widget widget-link" onClick={() => navigate('/alertas')}>
              <span className="widget-label">
                <Icon name="bell" size={14} /> Alertas
              </span>
              <span className="widget-value">{unreadCount}</span>
              <span className="widget-sub">{unreadCount === 1 ? 'não lido' : 'não lidos'}</span>
            </button>
          </section>

          <Group header="Monitores">
            {monitors.map((m) => (
              <MonitorRow key={m.id} monitor={m} range={range} />
            ))}
          </Group>

          {comparable.length > 1 && (
            <Group
              header={
                <span className="group-header-row">
                  Comparar variação
                  <button type="button" className="text-btn" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
                    {showTable ? 'Ver gráfico' : 'Ver tabela'}
                  </button>
                </span>
              }
              footer={`Quanto cada preço mudou ${rangeText(range)}, em %. Escolha até 3.`}
            >
              <div className="list-pad">
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
                  <p className="muted">Escolha monitores acima para comparar.</p>
                ) : showTable ? (
                  <CompareTable series={series} />
                ) : (
                  <LineChart series={series} format={signedPct} axisFormat={(v) => `${v > 0 ? '+' : ''}${v}%`} label="Variação percentual dos preços no período" />
                )}
              </div>
            </Group>
          )}
        </>
      )}

      {adding && (
        <Modal title="Novo monitor" onClose={() => setAdding(false)}>
          <NewMonitor onCreate={onCreate} onCancel={() => setAdding(false)} />
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>
  );
}

const SPARK_COLOR = { good: 'var(--green)', bad: 'var(--red)', flat: 'var(--label-3)' } as const;

function MonitorRow({ monitor: m, range }: { monitor: Monitor; range: number }) {
  const s = monitorStats(m, range);
  const isNew = s.points.length < 2;
  const dir = direction(s.change);
  const status =
    m.lastError ? (
      <span className="status status-bad">Falha na busca</span>
    ) : s.belowTarget ? (
      <span className="status status-good">Alvo atingido</span>
    ) : m.source === 'simulado' ? (
      <span className="status">Exemplo</span>
    ) : !m.active ? (
      <span className="status">Pausado</span>
    ) : null;

  return (
    <button type="button" className={`stock-row${m.active ? '' : ' is-paused'}`} onClick={() => navigate(`/monitor/${m.id}`)}>
      <span className="stock-main">
        <span className="stock-name">{m.name}</span>
        <span className="stock-detail">
          {status}
          {m.detail}
        </span>
      </span>
      <span className="stock-spark">{!isNew && <Sparkline points={s.points} color={SPARK_COLOR[dir]} height={34} />}</span>
      <span className="stock-price">
        <span className="stock-value">
          {brl(s.current)}
          {m.unit && <small>{m.unit}</small>}
        </span>
        <Pill change={s.change} isNew={isNew} />
      </span>
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
