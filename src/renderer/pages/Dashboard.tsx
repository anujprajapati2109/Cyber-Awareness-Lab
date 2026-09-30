import { useEffect, useRef, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { educationalNotes, permissionDescriptions, type ParticipantSession, type PermissionKey, type TimelineEntry } from "../../shared/types";
import { DeploymentPanel } from "../components/DeploymentPanel";
import { Layout } from "../components/Layout";
import { MapView } from "../components/MapView";
import { StatCard } from "../components/StatCard";
import { API_BASE } from "../utils/api";
import { useDashboardSocket } from "../hooks/useDashboardSocket";

type Props = {
  eventId: string;
  navigate: (page: string, eventId?: string) => void;
};

const permissionKeys: PermissionKey[] = ["location", "camera", "microphone", "notifications", "clipboard"];

function SessionDetails({ session }: { session: ParticipantSession }) {
  const rows = Object.entries(session.automaticInfo);
  return (
    <div className="rounded-md border border-white/10 bg-black/25 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{session.id}</p>
          <p className="text-sm text-slate-400">Opened {new Date(session.openedAt).toLocaleString()}</p>
        </div>
        <span className={`rounded px-2 py-1 text-xs uppercase ${session.status === "connected" ? "bg-cyber text-black" : "bg-white/10 text-slate-300"}`}>{session.status}</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map(([key, value]) => (
          <div key={key} className="rounded border border-white/10 bg-white/[0.035] px-3 py-2">
            <p className="font-mono text-[11px] uppercase text-slate-500">{key}</p>
            <p className="break-words text-sm text-slate-200">{String(value)}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {permissionKeys.map((key) => (
          <div key={key} className="rounded border border-signal/15 bg-signal/5 p-3">
            <p className="text-sm font-semibold capitalize text-signal">{key}</p>
            <p className="mt-1 text-sm text-slate-300">{session.permissions[key].decision}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded border border-white/10 bg-white/[0.035] p-4">
          <h3 className="font-semibold">Sensitive Permission Notes</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            {permissionKeys.map((key) => <p key={key}><span className="text-cyber">{key}:</span> {permissionDescriptions[key]}</p>)}
          </div>
        </div>
        <MapView location={session.location} />
      </div>
      {session.sharedMedia?.photoDataUrl && (
        <div className="mt-4 rounded border border-cyber/20 bg-cyber/5 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-cyber">Participant-Shared Photo</h3>
            <span className="text-sm text-slate-400">
              {session.sharedMedia.photoCapturedAt ? new Date(session.sharedMedia.photoCapturedAt).toLocaleString() : "Timestamp unavailable"}
            </span>
          </div>
          <img src={session.sharedMedia.photoDataUrl} alt="Participant shared camera capture" className="max-h-96 rounded-md border border-white/10 object-contain" />
          <p className="mt-2 text-xs text-slate-400">Captured only after the participant clicked Take & Share Photo on their device.</p>
        </div>
      )}
    </div>
  );
}

function Timeline({ items }: { items: TimelineEntry[] }) {
  const colors = {
    info: "border-signal/30 text-signal",
    success: "border-cyber/30 text-cyber",
    warning: "border-warning/30 text-warning",
    danger: "border-danger/30 text-danger"
  };
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.045] p-5 backdrop-blur">
      <h2 className="text-lg font-semibold">Event Timeline</h2>
      <div className="mt-4 max-h-[30rem] space-y-3 overflow-auto pr-1">
        {items.map((item) => (
          <div key={item.id} className={`rounded border bg-black/25 p-3 ${colors[item.severity]}`}>
            <p className="font-mono text-xs">{new Date(item.timestamp).toLocaleTimeString()}</p>
            <p className="mt-1 font-semibold text-white">{item.label}</p>
            {item.detail && <p className="mt-1 text-sm text-slate-400">{item.detail}</p>}
          </div>
        ))}
        {!items.length && <p className="text-sm text-slate-400">No participant activity yet.</p>}
      </div>
    </div>
  );
}

export function Dashboard({ eventId, navigate }: Props) {
  const { snapshot, connected } = useDashboardSocket(eventId);
  const [dashboardAlert, setDashboardAlert] = useState<TimelineEntry | null>(null);
  const seenAlertIds = useRef(new Set<string>());
  const sessions = snapshot?.sessions ?? [];
  const granted = sessions.reduce((count, session) => count + permissionKeys.filter((key) => session.permissions[key].decision === "granted").length, 0);
  const denied = sessions.reduce((count, session) => count + permissionKeys.filter((key) => session.permissions[key].decision === "denied").length, 0);
  const chart = [
    { name: "Granted", value: granted },
    { name: "Denied", value: denied },
    { name: "Pending", value: Math.max(sessions.length * permissionKeys.length - granted - denied, 0) }
  ];
  const activeSessions = sessions.filter((session) => session.status === "connected").length;
  const browsers = sessions.reduce<Record<string, number>>((acc, session) => {
    acc[session.automaticInfo.browser] = (acc[session.automaticInfo.browser] ?? 0) + 1;
    return acc;
  }, {});

  useEffect(() => {
    const latest = snapshot?.timeline.find((item) => item.label.toLowerCase().startsWith("notifications "));
    if (!latest || seenAlertIds.current.has(latest.id)) return;
    seenAlertIds.current.add(latest.id);
    setDashboardAlert(latest);
    const timer = window.setTimeout(() => setDashboardAlert(null), 7000);
    return () => window.clearTimeout(timer);
  }, [snapshot?.timeline]);

  return (
    <Layout title={snapshot?.event.name ?? "Operator Dashboard"} active="home" onNavigate={navigate}>
      {dashboardAlert && (
        <div className="mb-4 rounded-md border border-signal/30 bg-signal/10 p-4 shadow-blueglow">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-signal">Dashboard Notification</p>
          <p className="mt-1 font-semibold text-white">{dashboardAlert.label}</p>
          {dashboardAlert.detail && <p className="mt-1 text-sm text-slate-300">{dashboardAlert.detail}</p>}
        </div>
      )}
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Connection Status" value={connected ? "Live" : "Offline"} tone={connected ? "green" : "red"} />
        <StatCard label="Participant Count" value={snapshot?.participantCount ?? 0} tone="blue" />
        <StatCard label="Active Sessions" value={activeSessions} />
        <StatCard label="Permission Denials" value={denied} tone="yellow" />
      </section>
      {snapshot && (
        <section className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-5">
          <div className="rounded-md border border-cyber/20 bg-panel p-5 backdrop-blur">
            <h2 className="text-lg font-semibold">Event Access</h2>
            <img src={snapshot.event.qrCode} alt="Event QR Code" className="mt-4 h-56 w-56 rounded-md border border-cyber/30 bg-black p-2" />
            <input readOnly value={snapshot.event.url} className="mt-4 w-full rounded-md border border-white/10 bg-black/40 px-3 py-3 font-mono text-sm text-slate-200" />
            <button className="primary-action mt-3" onClick={() => navigator.clipboard.writeText(snapshot.event.url)}>Copy Link</button>
            <div className="mt-3 flex gap-2">
              <a className="secondary-link" href={`${API_BASE}/api/events/${eventId}/export.json`}>Export JSON</a>
              <a className="secondary-link" href={`${API_BASE}/api/events/${eventId}/export.csv`}>Export CSV</a>
              <a className="secondary-link" href={`${API_BASE}/api/events/${eventId}/export.pdf`}>Export PDF</a>
            </div>
          </div>
          <DeploymentPanel eventPath={`/participant/${eventId}`} />
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.045] p-5 backdrop-blur">
            <h2 className="text-lg font-semibold">Permission Status</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chart} innerRadius={70} outerRadius={105} dataKey="value" paddingAngle={3}>
                    {["#25f39b", "#f8d66d", "#38bdf8"].map((color) => <Cell key={color} fill={color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#071214", border: "1px solid rgba(255,255,255,.1)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded border border-white/10 bg-black/25 p-3">
                <p className="text-xs uppercase text-slate-500">Browser Fingerprint Summary</p>
                <p className="mt-2 text-sm text-slate-200">{Object.entries(browsers).map(([name, count]) => `${name}: ${count}`).join(", ") || "No sessions"}</p>
              </div>
              <div className="rounded border border-white/10 bg-black/25 p-3">
                <p className="text-xs uppercase text-slate-500">Network Information</p>
                <p className="mt-2 text-sm text-slate-200">{sessions[0]?.automaticInfo.isp ?? "Waiting for participant data"}</p>
              </div>
              <div className="rounded border border-white/10 bg-black/25 p-3">
                <p className="text-xs uppercase text-slate-500">Device Information</p>
                <p className="mt-2 text-sm text-slate-200">{sessions[0] ? `${sessions[0].automaticInfo.deviceType}, ${sessions[0].automaticInfo.operatingSystem}` : "Waiting for participant data"}</p>
              </div>
            </div>
          </div>
        </section>
      )}
      {snapshot && (
        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <Timeline items={snapshot.timeline} />
          <div className="rounded-md border border-cyber/20 bg-panel p-5 backdrop-blur">
            <h2 className="text-lg font-semibold">Educational Explanations</h2>
            <div className="mt-4 space-y-3">
              {Object.values(educationalNotes).slice(0, 6).map((note) => (
                <div key={note.title} className="rounded border border-white/10 bg-black/25 p-3">
                  <p className="font-semibold text-cyber">{note.title}</p>
                  <p className="mt-1 text-sm text-slate-300">{note.misuse}</p>
                  <p className="mt-1 text-sm text-slate-400">Protection: {note.protection}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="mt-5 space-y-4">
        {sessions.map((session) => <SessionDetails key={session.id} session={session} />)}
        {!sessions.length && <div className="rounded-md border border-white/10 bg-white/[0.035] p-8 text-center text-slate-400">Waiting for participants to open the event URL.</div>}
      </section>
    </Layout>
  );
}
