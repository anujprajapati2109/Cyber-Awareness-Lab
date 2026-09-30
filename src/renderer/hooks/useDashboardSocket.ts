import { useEffect, useState } from "react";
import type { DashboardSnapshot, SocketMessage } from "../../shared/types";
import { api, wsUrl } from "../utils/api";

export function useDashboardSocket(eventId: string | null) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    let alive = true;
    api.snapshot(eventId).then((data) => alive && setSnapshot(data)).catch(console.error);
    const socket = new WebSocket(wsUrl(eventId));
    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as SocketMessage;
      if (message.type === "dashboard:snapshot") setSnapshot(message.payload);
    };
    return () => {
      alive = false;
      socket.close();
    };
  }, [eventId]);

  return { snapshot, connected };
}
