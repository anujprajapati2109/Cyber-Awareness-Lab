import { useEffect, useState } from "react";
import type { DeploymentState, TunnelProvider } from "../../shared/types";
import { api } from "../utils/api";

const providers: Array<{ value: TunnelProvider; label: string }> = [
  { value: "local", label: "Local Only" },
  { value: "cloudflare", label: "Cloudflare Tunnel" },
  { value: "ngrok", label: "ngrok" }
];

export function DeploymentPanel({ eventPath }: { eventPath?: string }) {
  const [provider, setProvider] = useState<TunnelProvider>("local");
  const [state, setState] = useState<DeploymentState | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [busy, setBusy] = useState(false);

  const publicParticipantUrl = state?.publicUrl && eventPath ? `${state.publicUrl}${eventPath}` : state?.publicUrl;

  useEffect(() => {
    api.deployment().then((deployment) => {
      setState(deployment);
      setProvider(deployment.provider);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!publicParticipantUrl) return;
    api.deploymentQr(publicParticipantUrl).then((result) => setQrCode(result.qrCode)).catch(console.error);
  }, [publicParticipantUrl]);

  useEffect(() => {
    if (state?.status !== "starting") return;
    const timer = window.setInterval(() => {
      api.deployment().then((deployment) => {
        setState(deployment);
        setProvider(deployment.provider);
      }).catch(console.error);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [state?.status]);

  const start = async () => {
    setBusy(true);
    try {
      const deployment = await api.startDeployment(provider);
      setState(deployment);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border border-signal/20 bg-white/[0.045] p-5 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-signal">Deployment</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Public HTTPS Session</h2>
        </div>
        <span className={`rounded px-2 py-1 text-xs uppercase ${state?.status === "online" ? "bg-cyber text-black" : "bg-white/10 text-slate-300"}`}>
          {state?.status ?? "stopped"}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {providers.map((item) => (
          <label key={item.value} className="toggle-row">
            <input type="radio" name="provider" checked={provider === item.value} onChange={() => setProvider(item.value)} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
      <button className="primary-action mt-4" disabled={busy} onClick={start}>{busy ? "Starting..." : "Start Public Session"}</button>
      <div className="mt-4 rounded border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
        <p><span className="text-slate-500">Local:</span> {state?.localUrl ?? "http://localhost:4100"}</p>
        <p className="mt-1"><span className="text-slate-500">Public HTTPS:</span> {publicParticipantUrl ?? "Not started"}</p>
        <p className="mt-1"><span className="text-slate-500">Status:</span> {state?.message ?? "Choose a provider and start a session."}</p>
      </div>
      {qrCode && <img src={qrCode} alt="Deployment QR Code" className="mt-4 h-40 w-40 rounded-md border border-cyber/30 bg-black p-2" />}
      {state?.installInstructions && (
        <div className="mt-4 rounded border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          {state.installInstructions.map((line) => <p key={line}>{line}</p>)}
        </div>
      )}
    </div>
  );
}
