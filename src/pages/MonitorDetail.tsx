import { useState } from 'react';
import { LineChart } from '../components/charts';
import { BackButton, CompactHeader, Delta, direction, EmptyState, Group, RangeFilter, rangeText, Row, TextButton, Toggle } from '../components/common';
import { moneyInput, parseMoney } from '../components/fields';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { EditMonitorForm } from '../components/MonitorForm';
import { airlineSite } from '../data/airlines';
import { nights, querySummary } from '../data/describe';
import { monitorStats, useRange } from '../data/stats';
import { useStore } from '../data/store';
import { CATEGORY_LABEL, type Monitor } from '../data/types';
import { brl, brlAxis, fmtRelativeDay } from '../lib/format';
import { fallbackBookingUrl } from '../lib/prices';
import { navigate } from '../lib/router';
import { ALERT_KIND } from './Alerts';

const LEVEL: Record<string, { label: string; tone: string }> = {
  low: { label: 'Baixo para a rota', tone: 'good' },
  typical: { label: 'Típico para a rota', tone: 'flat' },
  high: { label: 'Alto para a rota', tone: 'bad' },
};

const LINE_COLOR = { good: 'var(--green)', bad: 'var(--red)', flat: 'var(--blue)' } as const;

function fmtChecked(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? `hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Links para reservar: Google Flights/Hotels, site da companhia e do hotel */
function BookingGroup({ m }: { m: Monitor }) {
  if (m.source !== 'serpapi' || !m.query) return null;
  const googleUrl = m.insights?.bookingUrl || fallbackBookingUrl(m);
  const isFlight = m.query.kind === 'voo';
  const airlines = (m.insights?.airlines ?? []).map(airlineSite).filter((a): a is { name: string; url: string } => !!a);
  const uniqueAirlines = airlines.filter((a, i) => airlines.findIndex((b) => b.name === a.name) === i);

  return (
    <Group
      header="Reservar"
      footer={
        isFlight
          ? 'O Google Flights abre com o trecho, as datas e os passageiros preenchidos. Lá aparecem os botões para comprar direto com a companhia.'
          : 'Os preços podem mudar até a hora da reserva.'
      }
    >
      {googleUrl && (
        <Row
          icon={isFlight ? 'plane' : 'bed'}
          tone="blue"
          title={isFlight ? 'Ver voos no Google Flights' : 'Ver no Google Hotels'}
          subtitle={isFlight ? 'Compare e escolha a companhia' : 'Compare preços entre sites de reserva'}
          href={googleUrl}
        />
      )}
      {uniqueAirlines.map((a) => (
        <Row key={a.name} icon="globe" tone="indigo" title={`Site da ${a.name}`} subtitle="Companhia da opção mais barata" href={a.url} />
      ))}
      {m.insights?.siteUrl && <Row icon="house" tone="teal" title="Site do hotel" subtitle={m.query.kind === 'hotel' ? m.query.propertyName || m.insights.best || undefined : undefined} href={m.insights.siteUrl} />}
    </Group>
  );
}

function PriceGroup({ m }: { m: Monitor }) {
  const { refreshMonitor, recordPrice, refreshing } = useStore();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const last = m.history[m.history.length - 1]?.value;

  if (m.source === 'simulado') {
    return (
      <Group footer="Monitor de exemplo: os preços são simulados para demonstração. Crie um monitor de passagem ou hospedagem para ver preços reais.">
        <Row icon="info" tone="gray" title="Preço simulado" />
      </Group>
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
      <Group header="Registrar valor" footer={error || (m.lastChecked ? `Último registro: ${fmtChecked(m.lastChecked)}. Esta tarifa é atualizada por você.` : 'Esta tarifa é atualizada por você.')}>
        <div className="row row-input">
          <span className="row-body">
            <span className="money-input money-input-plain">
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
            </span>
            <button type="button" className="btn btn-sm btn-tinted" onClick={save}>
              Registrar
            </button>
          </span>
        </div>
      </Group>
    );
  }

  const level = m.insights?.priceLevel ? LEVEL[m.insights.priceLevel] : null;
  const hotel = m.query?.kind === 'hotel' ? m.query : null;
  const sources = m.insights?.sources ?? [];
  const mealFilter = hotel?.amenities?.some((id) => id === 52 || id === 9);

  return (
    <>
    {hotel && (
      <Group
        header="Preço por site"
        footer={
          <>
            {sources.length > 0
              ? 'Total da estadia com taxas, segundo o Google Hotels. '
              : hotel.propertyToken
                ? 'Toque em "Atualizar agora" para ver o preço de cada site. '
                : 'Este monitor acompanha a hospedagem mais barata do destino; para ver o preço por site, crie um monitor escolhendo um hotel específico. '}
            Sites que o Google não lista para essa busca (como alguns sites de reserva direta) não entram na comparação e podem ter outros valores.
            {mealFilter && ' O filtro de café da manhã ou all inclusive garante que o hotel oferece a opção, mas o preço é o do quarto mais barato, que pode não incluir refeições.'}
          </>
        }
      >
        {sources.length > 0 ? (
          sources.map((src) => (
            <Row
              key={src.source}
              title={src.official ? `${src.source} (site oficial)` : src.source}
              subtitle={[src.room, src.perNight ? `${brl(src.perNight)}/noite` : null].filter(Boolean).join(' · ') || undefined}
              value={brl(src.total)}
              href={src.link ?? undefined}
            />
          ))
        ) : (
          <Row icon="info" tone="gray" title={m.insights?.perNight ? `${brl(m.insights.perNight)} por noite` : 'Menor preço no Google Hotels'} value={brl(m.history[m.history.length - 1]?.value ?? 0)} />
        )}
      </Group>
    )}
    <Group header={m.query?.kind === 'voo' ? 'Google Flights' : 'Google Hotels'} footer={m.lastError ? <span className="text-bad">{m.lastError}</span> : 'O app busca o preço de novo uma vez por dia, quando você abre.'}>
      {level && <Row icon="chart" tone={level.tone === 'good' ? 'green' : level.tone === 'bad' ? 'red' : 'gray'} title="Preço atual" value={level.label} />}
      {m.insights?.typicalRange && <Row icon="target" tone="orange" title="Normalmente" value={`${brlAxis(m.insights.typicalRange[0])} – ${brlAxis(m.insights.typicalRange[1])}`} />}
      {m.insights?.best && <Row icon={m.query?.kind === 'voo' ? 'plane' : 'bed'} tone="indigo" title="Mais barato" value={m.insights.best} />}
      <Row icon="clock" tone="gray" title="Atualizado" value={m.lastChecked ? fmtChecked(m.lastChecked) : 'nunca'} />
      <Row
        icon="refresh"
        tone="green"
        title={refreshing ? 'Atualizando…' : 'Atualizar agora'}
        tint
        onClick={() => refreshMonitor(m.id)}
        disabled={refreshing}
      />
    </Group>
    </>
  );
}

export function MonitorDetail({ id }: { id: string }) {
  const { monitors, alerts, updateMonitor, deleteMonitor, setPendingPrompt, markAlertRead } = useStore();
  const [range, setRange] = useRange('monitor');
  const [editing, setEditing] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const m = monitors.find((x) => x.id === id);
  if (!m) {
    return (
      <div className="page">
        <EmptyState icon="chart" title="Monitor não encontrado">
          <button type="button" className="btn btn-tinted" onClick={() => navigate('/')}>
            Voltar ao Radar
          </button>
        </EmptyState>
      </div>
    );
  }

  const s = monitorStats(m, range);
  const fmt = (v: number) => brl(v, m.unit);
  const fmtTile = (v: number) => (v >= 100 ? brlAxis(v) + m.unit : fmt(v));
  const monitorAlerts = alerts.filter((a) => a.monitorId === m.id).slice(0, 5);
  const isNew = s.points.length < 2;
  const dir = direction(s.change);

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
      <CompactHeader
        title={m.name}
        leading={<BackButton label="Radar" onClick={() => navigate('/')} />}
        trailing={<TextButton onClick={() => setEditing(true)}>Editar</TextButton>}
      >
        <header className="detail-header">
          <span className="detail-eyebrow">
            {CATEGORY_LABEL[m.category]}
            {m.source === 'serpapi' && <span className="status status-good">Preço real</span>}
            {m.source === 'simulado' && <span className="status">Exemplo</span>}
            {!m.active && <span className="status">Pausado</span>}
          </span>
          <h1>{m.name}</h1>
          {m.detail && <p className="detail-sub">{m.detail}</p>}
          <div className="detail-price">
            <span className="price-hero">{brl(s.current)}</span>
            {m.unit && <span className="unit">{m.unit}</span>}
          </div>
          {m.query?.kind === 'hotel' && (
            <span className="detail-sub">
              Total de {nights(m.query)} {nights(m.query) === 1 ? 'noite' : 'noites'}
              {m.insights?.perNight ? ` · ${brl(m.insights.perNight)} por noite` : ''}
            </span>
          )}
          {isNew ? <span className="delta delta-flat">Monitorando desde hoje</span> : <Delta change={s.change} suffix={rangeText(range)} />}
        </header>
      </CompactHeader>

      <RangeFilter value={range} onChange={setRange} />

      <section className="card chart-card" aria-labelledby="hist-title">
        <div className="card-header">
          <h2 id="hist-title" className="sr-only">
            Histórico de preço
          </h2>
          <span className="card-sub">Histórico {rangeText(range).replace('em ', 'de ')}</span>
          <button type="button" className="text-btn" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
            {showTable ? 'Gráfico' : 'Tabela'}
          </button>
        </div>

        {showTable ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col" className="num">
                    Preço
                  </th>
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
        ) : isNew ? (
          <div className="chart-empty">
            <Icon name="chart" size={28} />
            <p>O gráfico aparece a partir do segundo dia de acompanhamento.</p>
          </div>
        ) : (
          <LineChart
            series={[{ id: m.id, label: m.name, color: LINE_COLOR[dir], points: s.points }]}
            format={fmt}
            axisFormat={brlAxis}
            height={260}
            area
            reference={m.targetPrice != null ? { value: m.targetPrice, label: `Alvo ${brl(m.targetPrice)}` } : null}
            label={`Histórico de preço de ${m.name}`}
          />
        )}

        <dl className="stats-strip">
          <div>
            <dt>Mínima</dt>
            <dd>{fmtTile(s.min)}</dd>
          </div>
          <div>
            <dt>Média</dt>
            <dd>{fmtTile(s.avg)}</dd>
          </div>
          <div>
            <dt>Máxima</dt>
            <dd>{fmtTile(s.max)}</dd>
          </div>
        </dl>
      </section>

      <BookingGroup m={m} />

      <PriceGroup m={m} />

      <Group header="Alerta">
        <Row
          icon="target"
          tone="green"
          title="Preço-alvo"
          value={m.targetPrice != null ? brl(m.targetPrice, m.unit) : 'Nenhum'}
          chevron
          onClick={() => setEditing(true)}
        />
        <Row icon="bell" tone="red" title="Variação em um dia" value={`${String(m.alertPct).replace('.', ',')}%`} chevron onClick={() => setEditing(true)} />
        <Row icon="radar" tone="blue" title="Monitoramento ativo" trailing={<Toggle checked={m.active} onChange={(v) => updateMonitor(m.id, { active: v })} label="Monitoramento ativo" />} />
      </Group>

      {m.query && (
        <Group header="Busca">
          {querySummary(m.query).map((row) => (
            <Row key={row.label} title={row.label} value={row.value} multiline />
          ))}
        </Group>
      )}

      <Group>
        <Row icon="sparkle" tone="purple" title="Perguntar ao RadÁ" subtitle="Vale a pena comprar agora ou esperar?" chevron onClick={askAI} />
      </Group>

      {monitorAlerts.length > 0 && (
        <Group header="Alertas recentes">
          {monitorAlerts.map((a) => {
            const k = ALERT_KIND[a.kind];
            return (
              <Row
                key={a.id}
                icon={k.icon}
                tone={k.tone}
                title={k.label}
                subtitle={a.message}
                value={fmtRelativeDay(a.date)}
                multiline
                onClick={() => markAlertRead(a.id)}
              />
            );
          })}
        </Group>
      )}

      <Group>
        <Row title="Excluir monitor" destructive center onClick={onDelete} />
      </Group>

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
