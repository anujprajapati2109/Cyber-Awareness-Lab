import type { DashboardSnapshot, DeploymentState, LabEvent, ParticipantSession, Settings, TunnelProvider } from "../../shared/types";

function resolveApiBase() {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE;
  if (window.location.port === "5173") return "http://localhost:4100";
  return window.location.origin;
}

export const API_BASE = resolveApiBase();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export const api = {
  events: () => request<LabEvent[]>("/api/events"),
  event: (id: string) => request<LabEvent>(`/api/events/${id}`),
  createEvent: (body: Pick<LabEvent, "name" | "options">) =>
    request<LabEvent>("/api/events", { method: "POST", body: JSON.stringify(body) }),
  snapshot: (id: string) => request<DashboardSnapshot>(`/api/events/${id}/snapshot`),
  settings: () => request<Settings>("/api/settings"),
  saveSettings: (settings: Settings) => request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(settings) }),
  deployment: () => request<DeploymentState>("/api/deployment"),
  startDeployment: (provider: TunnelProvider) =>
    request<DeploymentState>("/api/deployment/start", { method: "POST", body: JSON.stringify({ provider }) }),
  stopDeployment: () => request<DeploymentState>("/api/deployment/stop", { method: "POST" }),
  deploymentQr: (url: string) => request<{ qrCode: string }>(`/api/deployment/qr?url=${encodeURIComponent(url)}`),
  openParticipant: (eventId: string, automatic: Record<string, unknown>) =>
    request<ParticipantSession>(`/api/participants/${eventId}/open`, { method: "POST", body: JSON.stringify(automatic) }),
  updatePermission: (eventId: string, sessionId: string, body: Record<string, unknown>) =>
    request<ParticipantSession>(`/api/participants/${eventId}/sessions/${sessionId}/permission`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  sharePhoto: (eventId: string, sessionId: string, photoDataUrl: string) =>
    request<ParticipantSession>(`/api/participants/${eventId}/sessions/${sessionId}/media/photo`, {
      method: "PATCH",
      body: JSON.stringify({ photoDataUrl })
    }),
  disconnect: (eventId: string, sessionId: string) =>
    request<ParticipantSession>(`/api/participants/${eventId}/sessions/${sessionId}/disconnect`, { method: "PATCH" })
};

export const wsUrl = (eventId: string) => `${API_BASE.replace(/^http/, "ws")}/ws?eventId=${encodeURIComponent(eventId)}`;
