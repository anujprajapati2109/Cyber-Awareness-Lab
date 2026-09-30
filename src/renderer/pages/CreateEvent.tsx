import { useState } from "react";
import { defaultOptions, type AutoCollectionKey, type EventOptions, type PermissionKey } from "../../shared/types";
import { Layout } from "../components/Layout";
import { api } from "../utils/api";

const autoLabels: Record<AutoCollectionKey, string> = {
  publicIp: "Public IP",
  ipLocation: "Approximate Location (IP based)",
  isp: "ISP",
  country: "Country",
  region: "Region",
  browser: "Browser",
  browserVersion: "Browser Version",
  operatingSystem: "Operating System",
  deviceType: "Device Type",
  screenResolution: "Screen Resolution",
  language: "Language",
  timezone: "Timezone",
  cookiesEnabled: "Cookies Enabled",
  cpuCores: "CPU Cores",
  memory: "Memory (if available)",
  network: "Network Information (if available)",
  battery: "Battery Information (if supported)"
};

const permissionLabels: Record<PermissionKey, string> = {
  location: "Location",
  camera: "Camera",
  microphone: "Microphone",
  notifications: "Notifications",
  clipboard: "Clipboard Read"
};

type Props = {
  navigate: (page: string, eventId?: string) => void;
};

export function CreateEvent({ navigate }: Props) {
  const [name, setName] = useState("EXP-1");
  const [options, setOptions] = useState<EventOptions>(defaultOptions);
  const [creating, setCreating] = useState(false);

  const toggleAuto = (key: AutoCollectionKey) =>
    setOptions((current) => ({ ...current, autoCollection: { ...current.autoCollection, [key]: !current.autoCollection[key] } }));
  const togglePermission = (key: PermissionKey) =>
    setOptions((current) => ({ ...current, permissions: { ...current.permissions, [key]: !current.permissions[key] } }));

  const create = async () => {
    setCreating(true);
    try {
      const event = await api.createEvent({ name, options });
      navigate("dashboard", event.id);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout title="Create Event" active="create" onNavigate={navigate}>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-md border border-cyber/20 bg-panel p-6 backdrop-blur">
          <label className="text-sm text-slate-300">Event Name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-black/40 px-4 py-3 text-lg outline-none ring-cyber/40 focus:ring-2" />
          <h2 className="mt-8 text-lg font-semibold">Automatically Collected Information</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(Object.keys(autoLabels) as AutoCollectionKey[]).map((key) => (
              <label key={key} className="toggle-row">
                <input type="checkbox" checked={options.autoCollection[key]} onChange={() => toggleAuto(key)} />
                <span>{autoLabels[key]}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-signal/20 bg-white/[0.045] p-6 backdrop-blur">
          <h2 className="text-lg font-semibold">Browser Permissions Demonstration</h2>
          <p className="mt-2 text-sm text-slate-400">Each enabled permission is shown as a separate explanation and click action on the participant page.</p>
          <div className="mt-5 space-y-3">
            {(Object.keys(permissionLabels) as PermissionKey[]).map((key) => (
              <label key={key} className="toggle-row">
                <input type="checkbox" checked={options.permissions[key]} onChange={() => togglePermission(key)} />
                <span>{permissionLabels[key]}</span>
              </label>
            ))}
          </div>
          <button disabled={creating || !name.trim()} onClick={create} className="primary-action mt-8">{creating ? "Generating Event..." : "Generate Event"}</button>
        </div>
      </section>
    </Layout>
  );
}
