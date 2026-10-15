import { useState } from 'react';
import { EmptyState, PageHeader } from '../components/common';
import { Icon, type IconName } from '../components/Icon';
import { useStore } from '../data/store';
import type { Alert, AlertKind } from '../data/types';
import { fmtRelativeDay } from '../lib/format';
import { navigate } from '../lib/router';

const KIND: Record<AlertKind, { label: string; icon: IconName; tone: 'good' | 'warning' }> = {
  alvo: { label: 'Alvo atingido', icon: 'target', tone: 'good' },
  queda: { label: 'Queda de preço', icon: 'down', tone: 'good' },
  alta: { label: 'Alta de preço', icon: 'up', tone: 'warning' },
};

export function AlertItem({ alert: a }: { alert: Alert }) {
  const { markAlertRead } = useStore();
  const kind = KIND[a.kind];
  return (
    <li>
      <button
        type="button"
        className={`alert-item${a.read ? '' : ' is-unread'}`}
        onClick={() => {
          markAlertRead(a.id);
          navigate(`/monitor/${a.monitorId}`);
        }}
      >
        <span className={`alert-icon tone-${kind.tone}`}>
          <Icon name={kind.icon} size={18} />
        </span>
        <span className="alert-body">
          <span className="alert-meta">
            <strong>{kind.label}</strong>
            <span className="muted">· {fmtRelativeDay(a.date)}</span>
            {!a.read && <span className="dot" aria-label="não lido" />}
          </span>
          <span className="alert-message">{a.message}</span>
        </span>
      </button>
    </li>
  );
}

export function Alerts() {
  const { alerts, unreadCount, markAllRead, clearAlerts } = useStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const visible = filter === 'unread' ? alerts.filter((a) => !a.read) : alerts;

  return (
    <div className="page">
      <PageHeader
        title="Alertas"
        subtitle={unreadCount ? `${unreadCount} não ${unreadCount === 1 ? 'lido' : 'lidos'}` : 'Tudo em dia'}
        actions={
          unreadCount > 0 && (
            <button type="button" className="btn" onClick={markAllRead}>
              <Icon name="check" size={18} />
              <span>Marcar todos como lidos</span>
            </button>
          )
        }
      />

      {alerts.length > 0 && (
        <div className="filters">
          <div className="segmented" role="group" aria-label="Filtrar alertas">
            <button type="button" className={filter === 'all' ? 'is-active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              Todos
            </button>
            <button type="button" className={filter === 'unread' ? 'is-active' : ''} aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>
              Não lidos {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState icon="bell" title={filter === 'unread' ? 'Nenhum alerta não lido' : 'Nenhum alerta ainda'}>
          <p>Você será avisado quando um preço cair, atingir o seu alvo ou, se ativar nos ajustes, subir.</p>
        </EmptyState>
      ) : (
        <ul className="alert-list">
          {visible.map((a) => (
            <AlertItem key={a.id} alert={a} />
          ))}
        </ul>
      )}

      {alerts.length > 0 && (
        <button
          type="button"
          className="btn btn-ghost btn-danger-text"
          onClick={() => confirm('Apagar todos os alertas?') && clearAlerts()}
        >
          <Icon name="trash" size={16} /> Apagar todos os alertas
        </button>
      )}
    </div>
  );
}
