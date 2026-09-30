import { useEffect, useState } from "react";
import type { LabEvent } from "../../shared/types";
import { Layout } from "../components/Layout";
import { api } from "../utils/api";

type Props = {
  navigate: (page: string, eventId?: string) => void;
};

export function Home({ navigate }: Props) {
  const [events, setEvents] = useState<LabEvent[]>([]);

  useEffect(() => {
    api.events().then(setEvents).catch(console.error);
  }, []);

  return (
    <Layout title="Welcome Back, Anuj" active="home" onNavigate={navigate}>
      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-md border border-cyber/20 bg-panel p-6 shadow-glow backdrop-blur">
          <div className="mb-6 font-mono text-sm text-cyber">SYSTEM READY</div>
          <div className="space-y-3">
            <button className="primary-action" onClick={() => navigate("create")}>Create New Event</button>
            <button className="secondary-action" onClick={() => events[0] && navigate("dashboard", events[0].id)} disabled={!events.length}>Open Existing Event</button>
            <button className="secondary-action" onClick={() => navigate("settings")}>Settings</button>
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Event History</h2>
            <span className="font-mono text-sm text-signal">{events.length} events</span>
          </div>
          <div className="space-y-3">
            {events.map((event) => (
              <button key={event.id} onClick={() => navigate("dashboard", event.id)} className="w-full rounded-md border border-white/10 bg-black/25 p-4 text-left transition hover:border-cyber/40 hover:bg-cyber/5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{event.name}</p>
                    <p className="font-mono text-xs text-slate-400">{event.id}</p>
                  </div>
                  <p className="text-sm text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
              </button>
            ))}
            {!events.length && <p className="rounded-md border border-white/10 bg-black/20 p-4 text-slate-400">No events have been created yet.</p>}
          </div>
        </div>
      </section>
    </Layout>
  );
}
