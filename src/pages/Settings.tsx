import { useState } from 'react';
import { PageHeader } from '../components/common';
import { useStore } from '../data/store';
import type { FreeModel, ThemePref } from '../data/types';

const FREE_MODELS: { id: FreeModel; label: string }[] = [
  { id: 'free/deepseek-v4.1-flash', label: 'DeepSeek V4.1 Flash (padrão, rápido)' },
  { id: 'free/gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { id: 'free/qwen-3.8-max', label: 'Qwen 3.8 Max' },
  { id: 'free/gpt-6-luna', label: 'GPT-6 Luna' },
  { id: 'free/kimi-k3', label: 'Kimi K3' },
  { id: 'free/glm-5.3-flash', label: 'GLM 5.3 Flash' },
];

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'Sistema' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
];

const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export function Settings() {
  const { settings, updateSettings, monitors, updateMonitor, resetDemo, clearAll } = useStore();
  const [permission, setPermission] = useState(() => (notificationsSupported() ? Notification.permission : 'denied'));

  const toggleNotifications = async (on: boolean) => {
    if (!on) return updateSettings({ notifications: false });
    if (!notificationsSupported()) return;
    const result = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    setPermission(result);
    updateSettings({ notifications: result === 'granted' });
  };

  return (
    <div className="page page-narrow">
      <PageHeader title="Ajustes" />

      <section className="card settings-group">
        <h2>Aparência</h2>
        <div className="setting-row">
          <span>Tema</span>
          <div className="segmented" role="group" aria-label="Tema">
            {THEMES.map((t) => (
              <button key={t.id} type="button" className={settings.theme === t.id ? 'is-active' : ''} aria-pressed={settings.theme === t.id} onClick={() => updateSettings({ theme: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card settings-group">
        <h2>Alertas e notificações</h2>
        <div className="setting-row">
          <div>
            <span>Notificações no aparelho</span>
            <p className="card-sub">
              {!notificationsSupported()
                ? 'Este navegador não suporta notificações.'
                : permission === 'denied'
                  ? 'Bloqueadas no navegador. Libere nas configurações do site.'
                  : 'Aviso quando surgir um alerta novo.'}
            </p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.notifications}
              disabled={!notificationsSupported() || permission === 'denied'}
              onChange={(e) => toggleNotifications(e.target.checked)}
            />
            <span className="switch-track" aria-hidden="true" />
            <span className="sr-only">Notificações no aparelho</span>
          </label>
        </div>
        <div className="setting-row">
          <div>
            <span>Avisar também quando o preço subir</span>
            <p className="card-sub">Por padrão, só quedas e alvos atingidos geram alerta.</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.alertOnRise} onChange={(e) => updateSettings({ alertOnRise: e.target.checked })} />
            <span className="switch-track" aria-hidden="true" />
            <span className="sr-only">Avisar quando o preço subir</span>
          </label>
        </div>
      </section>

      <section className="card settings-group">
        <h2>Inteligência artificial</h2>
        <label className="field">
          <span>Modelo do chat (somente gratuitos)</span>
          <select value={settings.aiModel} onChange={(e) => updateSettings({ aiModel: e.target.value as FreeModel })}>
            {FREE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <p className="card-sub">
          Os modelos gratuitos do APInex exigem um check-in diário em{' '}
          <a href="https://apinex.bond/airdrop?tab=quests" target="_blank" rel="noreferrer">
            apinex.bond
          </a>
          .
        </p>
      </section>

      <section className="card settings-group">
        <h2>Monitores</h2>
        {monitors.length === 0 ? (
          <p className="card-sub">Nenhum monitor criado.</p>
        ) : (
          monitors.map((m) => (
            <div className="setting-row" key={m.id}>
              <a href={`#/monitor/${m.id}`} className="setting-link">
                {m.name}
              </a>
              <label className="switch">
                <input type="checkbox" checked={m.active} onChange={(e) => updateMonitor(m.id, { active: e.target.checked })} />
                <span className="switch-track" aria-hidden="true" />
                <span className="sr-only">{m.active ? 'Pausar' : 'Ativar'} {m.name}</span>
              </label>
            </div>
          ))
        )}
      </section>

      <section className="card settings-group">
        <h2>Dados</h2>
        <p className="card-sub">Os preços atuais são simulados, para demonstração. Tudo fica salvo só neste aparelho.</p>
        <div className="form-actions form-actions-start">
          <button type="button" className="btn" onClick={() => confirm('Substituir tudo pelos dados de exemplo?') && resetDemo()}>
            Restaurar dados de exemplo
          </button>
          <button type="button" className="btn btn-danger" onClick={() => confirm('Apagar todos os monitores, alertas e conversas?') && clearAll()}>
            Apagar tudo
          </button>
        </div>
      </section>

      <p className="about">Radar de Tarifas · versão {__APP_VERSION__}</p>
    </div>
  );
}
