import { useCallback, useEffect, useState } from 'react';
import { Nav } from './components/Nav';
import { Splash } from './components/Splash';
import { StoreProvider, useStore } from './data/store';
import { useRoute } from './lib/router';
import { Alerts } from './pages/Alerts';
import { Chat } from './pages/Chat';
import { Dashboard } from './pages/Dashboard';
import { MonitorDetail } from './pages/MonitorDetail';
import { Settings } from './pages/Settings';

const SPLASH_KEY = 'radar-tarifas:splash';

function splashSeen() {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === '1';
  } catch {
    return false;
  }
}

function useTheme() {
  const { settings } = useStore();
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      if (settings.theme === 'system') delete root.dataset.theme;
      else root.dataset.theme = settings.theme;
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#F2F2F7');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings.theme]);
}

function Shell() {
  const route = useRoute();
  useTheme();

  return (
    <div className="shell">
      <Nav current={route.name} />
      <main className="main" key={route.name === 'monitor' ? `monitor-${route.id}` : route.name}>
        {route.name === 'dashboard' && <Dashboard />}
        {route.name === 'monitor' && <MonitorDetail id={route.id} />}
        {route.name === 'alertas' && <Alerts />}
        {route.name === 'chat' && <Chat />}
        {route.name === 'config' && <Settings />}
      </main>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !splashSeen());
  const done = useCallback(() => {
    try {
      sessionStorage.setItem(SPLASH_KEY, '1');
    } catch {
      /* ignora */
    }
    setShowSplash(false);
  }, []);

  return (
    <StoreProvider>
      <Shell />
      {showSplash && <Splash onDone={done} />}
    </StoreProvider>
  );
}
