import { useEffect, useState } from 'react';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const show = reducedMotion() ? 500 : 1900;
    const t1 = setTimeout(() => setLeaving(true), show);
    const t2 = setTimeout(onDone, show + 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div className={`splash${leaving ? ' is-leaving' : ''}`} role="status" aria-label="Carregando Radar de Tarifas">
      <div className="splash-content">
        <svg className="splash-icon" viewBox="0 0 100 100" width="112" height="112" aria-hidden="true">
          <defs>
            <clipPath id="splash-sq">
              <rect width="100" height="100" rx="22.4" />
            </clipPath>
          </defs>
          <g clipPath="url(#splash-sq)">
            <rect width="100" height="100" fill="#17191E" />
            <line x1="20" y1="78" x2="80" y2="78" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="3" strokeLinecap="round" />
            <polyline
              className="splash-line"
              points="22,30 40,44 54,37 74,61"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={100}
            />
            <circle className="splash-dot" cx="74" cy="61" r="8.5" fill="#30D158" stroke="#17191E" strokeWidth="3.5" />
          </g>
        </svg>
        <div className="splash-title">Radar de Tarifas</div>
        <div className="splash-tagline">Acompanhe e compare tarifas</div>
      </div>
    </div>
  );
}
