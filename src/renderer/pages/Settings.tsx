import { useEffect, useState } from "react";
import { defaultOptions, type Settings as SettingsType } from "../../shared/types";
import { Layout } from "../components/Layout";
import { API_BASE, api } from "../utils/api";

type Props = {
  navigate: (page: string, eventId?: string) => void;
};

export function Settings({ navigate }: Props) {
  const [settings, setSettings] = useState<SettingsType>({ theme: "matrix", port: 4100, tunnelProvider: "local", exportFolder: "", defaults: defaultOptions });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings().then(setSettings).catch(console.error);
  }, []);

  const save = async () => {
    const updated = await api.saveSettings(settings);
    setSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <Layout title="Settings" active="settings" onNavigate={navigate}>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-md border border-cyber/20 bg-panel p-6 backdrop-blur">
          <label className="text-sm text-slate-300">Theme</label>
          <select value={settings.theme} onChange={(event) => setSettings({ ...settings, theme: event.target.value as SettingsType["theme"] })} className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-4 py-3">
            <option value="matrix">Matrix</option>
            <option value="midnight">Midnight</option>
            <option value="contrast">High Contrast</option>
          </select>
          <label className="mt-5 block text-sm text-slate-300">Port</label>
          <input type="number" min={1024} max={65535} value={settings.port} onChange={(event) => setSettings({ ...settings, port: Number(event.target.value) })} className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-4 py-3" />
          <label className="mt-5 block text-sm text-slate-300">Default Tunnel Provider</label>
          <select value={settings.tunnelProvider} onChange={(event) => setSettings({ ...settings, tunnelProvider: event.target.value as SettingsType["tunnelProvider"] })} className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-4 py-3">
            <option value="local">Local Only</option>
            <option value="cloudflare">Cloudflare Tunnel</option>
            <option value="ngrok">ngrok</option>
          </select>
          <label className="mt-5 block text-sm text-slate-300">Export Folder</label>
          <input value={settings.exportFolder} onChange={(event) => setSettings({ ...settings, exportFolder: event.target.value })} placeholder="Optional folder path for saved reports" className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-4 py-3" />
          <button onClick={save} className="primary-action mt-6">{saved ? "Saved" : "Save Settings"}</button>
        </div>
        <div className="rounded-md border border-signal/20 bg-white/[0.045] p-6 backdrop-blur">
          <h2 className="text-lg font-semibold">Database Backup</h2>
          <p className="mt-2 text-sm text-slate-400">Exports settings, events, automatic information, and permission decisions as JSON.</p>
          <a className="secondary-link mt-5 inline-block" href={`${API_BASE}/api/settings/backup`}>Download Backup</a>
          <h2 className="mt-8 text-lg font-semibold">Default Event Options</h2>
          <p className="mt-2 text-sm text-slate-400">New events start with all automatic fields and permission demonstrations enabled.</p>
        </div>
      </section>
    </Layout>
  );
}
