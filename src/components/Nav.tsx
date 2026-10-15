import { useStore } from '../data/store';
import { navigate, type Route } from '../lib/router';
import { Icon, type IconName } from './Icon';

const ITEMS: { route: Route['name']; path: string; label: string; icon: IconName }[] = [
  { route: 'dashboard', path: '/', label: 'Painel', icon: 'home' },
  { route: 'alertas', path: '/alertas', label: 'Alertas', icon: 'bell' },
  { route: 'chat', path: '/chat', label: 'Chat IA', icon: 'sparkle' },
  { route: 'config', path: '/config', label: 'Ajustes', icon: 'gear' },
];

export function Nav({ current }: { current: Route['name'] }) {
  const { unreadCount } = useStore();
  const active = current === 'monitor' ? 'dashboard' : current;

  return (
    <nav className="nav" aria-label="Principal">
      <a className="nav-brand" href="#/" aria-label="Radar de Tarifas, início">
        <img src="/logo.svg" alt="" className="logo logo-light" />
        <img src="/logo-dark.svg" alt="" className="logo logo-dark" />
      </a>
      <ul className="nav-list">
        {ITEMS.map((item) => (
          <li key={item.route}>
            <button
              type="button"
              className={`nav-item${active === item.route ? ' is-active' : ''}`}
              aria-current={active === item.route ? 'page' : undefined}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">
                <Icon name={item.icon} size={22} />
                {item.route === 'alertas' && unreadCount > 0 && (
                  <span className="badge" aria-label={`${unreadCount} não lidos`}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
