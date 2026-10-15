import { useEffect, useState } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'monitor'; id: string }
  | { name: 'alertas' }
  | { name: 'chat' }
  | { name: 'config' };

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'monitor':
      return parts[1] ? { name: 'monitor', id: decodeURIComponent(parts[1]) } : { name: 'dashboard' };
    case 'alertas':
      return { name: 'alertas' };
    case 'chat':
      return { name: 'chat' };
    case 'config':
      return { name: 'config' };
    default:
      return { name: 'dashboard' };
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const navigate = (path: string) => {
  location.hash = path;
};
