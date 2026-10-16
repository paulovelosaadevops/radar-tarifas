import { useState } from 'react';
import { EmptyState, Group, LargeTitle, Row, Segmented, TextButton, type Tone } from '../components/common';
import type { IconName } from '../components/Icon';
import { useStore } from '../data/store';
import type { Alert, AlertKind } from '../data/types';
import { fmtRelativeDay } from '../lib/format';
import { navigate } from '../lib/router';

export const ALERT_KIND: Record<AlertKind, { label: string; icon: IconName; tone: Tone }> = {
  alvo: { label: 'Alvo atingido', icon: 'target', tone: 'green' },
  queda: { label: 'Queda de preço', icon: 'down', tone: 'green' },
  alta: { label: 'Alta de preço', icon: 'up', tone: 'orange' },
};

function AlertRow({ alert: a }: { alert: Alert }) {
  const { markAlertRead } = useStore();
  const k = ALERT_KIND[a.kind];
  return (
    <Row
      icon={k.icon}
      tone={k.tone}
      title={
        <span className="alert-title">
          {!a.read && <span className="unread-dot" aria-label="não lido" />}
          {k.label}
        </span>
      }
      subtitle={a.message}
      value={fmtRelativeDay(a.date)}
      multiline
      onClick={() => {
        markAlertRead(a.id);
        navigate(`/monitor/${a.monitorId}`);
      }}
    />
  );
}

export function Alerts() {
  const { alerts, unreadCount, markAllRead, clearAlerts } = useStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const visible = filter === 'unread' ? alerts.filter((a) => !a.read) : alerts;

  return (
    <div className="page">
      <LargeTitle
        title="Alertas"
        subtitle={unreadCount ? `${unreadCount} não ${unreadCount === 1 ? 'lido' : 'lidos'}` : 'Tudo em dia'}
        trailing={unreadCount > 0 ? <TextButton onClick={markAllRead}>Ler todos</TextButton> : undefined}
      />

      {alerts.length > 0 && (
        <Segmented
          label="Filtrar alertas"
          full
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'unread', label: unreadCount ? `Não lidos (${unreadCount})` : 'Não lidos' },
          ]}
        />
      )}

      {visible.length === 0 ? (
        <EmptyState icon="bell" title={filter === 'unread' ? 'Nenhum alerta não lido' : 'Nenhum alerta ainda'}>
          <p>Você será avisado quando um preço cair, atingir o seu alvo ou, se ativar nos ajustes, subir.</p>
        </EmptyState>
      ) : (
        <Group>
          {visible.map((a) => (
            <AlertRow key={a.id} alert={a} />
          ))}
        </Group>
      )}

      {alerts.length > 0 && (
        <Group>
          <Row title="Apagar todos os alertas" destructive center onClick={() => confirm('Apagar todos os alertas?') && clearAlerts()} />
        </Group>
      )}
    </div>
  );
}
