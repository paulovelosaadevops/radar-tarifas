import { useEffect, useState } from 'react';
import { Group, LargeTitle, Row, Segmented, Toggle, type Tone } from '../components/common';
import type { IconName } from '../components/Icon';
import { fetchQuota, type Quota } from '../lib/prices';
import { navigate } from '../lib/router';
import { useStore } from '../data/store';
import type { Category, FreeModel, ThemePref } from '../data/types';

const FREE_MODELS: { id: FreeModel; label: string }[] = [
  { id: 'free/deepseek-v4.1-flash', label: 'DeepSeek V4.1 Flash' },
  { id: 'free/gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { id: 'free/qwen-3.8-max', label: 'Qwen 3.8 Max' },
  { id: 'free/gpt-6-luna', label: 'GPT-6 Luna' },
  { id: 'free/kimi-k3', label: 'Kimi K3' },
  { id: 'free/glm-5.3-flash', label: 'GLM 5.3 Flash' },
];

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

const CATEGORY_ICON: Record<Category, { icon: IconName; tone: Tone }> = {
  voo: { icon: 'plane', tone: 'blue' },
  hotel: { icon: 'bed', tone: 'indigo' },
  energia: { icon: 'bolt', tone: 'yellow' },
  bancaria: { icon: 'bag', tone: 'teal' },
  outro: { icon: 'chart', tone: 'gray' },
};

const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export function Settings() {
  const { settings, updateSettings, monitors, updateMonitor, resetDemo, clearAll } = useStore();
  const [permission, setPermission] = useState(() => (notificationsSupported() ? Notification.permission : 'denied'));
  const [quota, setQuota] = useState<Quota | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuota()
      .then(setQuota)
      .catch((err) => setQuotaError(err instanceof Error ? err.message : 'Não foi possível consultar a cota.'));
  }, []);

  const toggleNotifications = async (on: boolean) => {
    if (!on) return updateSettings({ notifications: false });
    if (!notificationsSupported()) return;
    const result = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    setPermission(result);
    updateSettings({ notifications: result === 'granted' });
  };

  const notifFooter = !notificationsSupported()
    ? 'Este navegador não suporta notificações.'
    : permission === 'denied'
      ? 'As notificações estão bloqueadas no navegador. Libere nas configurações do site.'
      : 'Por padrão, só quedas de preço e alvos atingidos geram alerta.';

  const quotaPct = quota ? Math.min(100, (quota.left / Math.max(1, quota.perMonth)) * 100) : 0;

  return (
    <div className="page page-narrow">
      <LargeTitle title="Ajustes" />

      <Group header="Aparência">
        <Row icon="moon" tone="indigo" title="Tema" trailing={<Segmented label="Tema" value={settings.theme} onChange={(theme) => updateSettings({ theme })} options={THEMES} />} />
      </Group>

      <Group header="Notificações" footer={notifFooter}>
        <Row
          icon="bell"
          tone="red"
          title="Notificações no aparelho"
          trailing={
            <Toggle
              checked={settings.notifications}
              disabled={!notificationsSupported() || permission === 'denied'}
              onChange={toggleNotifications}
              label="Notificações no aparelho"
            />
          }
        />
        <Row icon="up" tone="orange" title="Avisar quando o preço subir" trailing={<Toggle checked={settings.alertOnRise} onChange={(v) => updateSettings({ alertOnRise: v })} label="Avisar quando o preço subir" />} />
      </Group>

      <Group
        header="RadÁ"
        footer={
          <>
            Só modelos gratuitos. Eles exigem um check-in diário em{' '}
            <a href="https://apinex.bond/airdrop?tab=quests" target="_blank" rel="noreferrer">
              apinex.bond
            </a>
            .
          </>
        }
      >
        <Row
          icon="sparkle"
          tone="purple"
          title="Modelo"
          trailing={
            <span className="row-select">
              <select value={settings.aiModel} onChange={(e) => updateSettings({ aiModel: e.target.value as FreeModel })} aria-label="Modelo do RadÁ">
                {FREE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </span>
          }
        />
      </Group>

      <Group
        header="Preços reais"
        footer={
          quota
            ? `Plano ${quota.plan} do SerpApi. Cada monitor de passagem ou hospedagem faz 1 busca por dia, quando você abre o app. Buscas repetidas na mesma hora não contam.`
            : quotaError ?? 'Consultando…'
        }
      >
        <Row icon="search" tone="blue" title="Buscas restantes no mês" value={quota ? `${quota.left} de ${quota.perMonth}` : '—'} />
        {quota && (
          <div className="row row-meter">
            <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={quota.perMonth} aria-valuenow={quota.left} aria-label="Buscas restantes">
              <span style={{ width: `${quotaPct}%` }} className={quotaPct < 15 ? 'is-low' : ''} />
            </div>
          </div>
        )}
      </Group>

      {monitors.length > 0 && (
        <Group header="Monitores" footer="Monitores pausados não buscam preço nem geram alertas.">
          {monitors.map((m) => (
            <Row
              key={m.id}
              icon={CATEGORY_ICON[m.category].icon}
              tone={CATEGORY_ICON[m.category].tone}
              title={<button type="button" className="row-link" onClick={() => navigate(`/monitor/${m.id}`)}>{m.name}</button>}
              trailing={<Toggle checked={m.active} onChange={(v) => updateMonitor(m.id, { active: v })} label={`${m.active ? 'Pausar' : 'Ativar'} ${m.name}`} />}
            />
          ))}
        </Group>
      )}

      <Group header="Dados" footer="Tudo fica salvo só neste aparelho.">
        <Row title="Restaurar dados de exemplo" tint onClick={() => confirm('Substituir tudo pelos dados de exemplo?') && resetDemo()} />
        <Row title="Apagar tudo" destructive onClick={() => confirm('Apagar todos os monitores, alertas e conversas?') && clearAll()} />
      </Group>

      <p className="about">Radar de Tarifas · versão {__APP_VERSION__}</p>
    </div>
  );
}
