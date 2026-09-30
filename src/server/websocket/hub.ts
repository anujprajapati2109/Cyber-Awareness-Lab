import type { Server as HttpServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { DashboardSnapshot, SocketMessage } from "../../shared/types";
import type { Repository } from "../database/repository";

export class SocketHub {
  private readonly channels = new Map<string, Set<WebSocket>>();

  constructor(
    server: HttpServer,
    private readonly repository: Repository
  ) {
    const wss = new WebSocketServer({ server, path: "/ws" });
    wss.on("connection", (socket, request) => {
      const url = new URL(request.url ?? "", "http://localhost");
      const eventId = url.searchParams.get("eventId");
      if (!eventId) {
        socket.close(1008, "eventId is required");
        return;
      }
      const sockets = this.channels.get(eventId) ?? new Set<WebSocket>();
      sockets.add(socket);
      this.channels.set(eventId, sockets);

      const snapshot = this.repository.snapshot(eventId);
      if (snapshot) this.send(socket, { type: "dashboard:snapshot", payload: snapshot });

      socket.on("close", () => {
        sockets.delete(socket);
        if (sockets.size === 0) this.channels.delete(eventId);
      });
    });
  }

  publishSnapshot(eventId: string) {
    const snapshot = this.repository.snapshot(eventId);
    if (!snapshot) return;
    this.publish(eventId, { type: "dashboard:snapshot", payload: snapshot });
  }

  publish(eventId: string, message: SocketMessage) {
    const sockets = this.channels.get(eventId);
    if (!sockets) return;
    for (const socket of sockets) this.send(socket, message);
  }

  private send(socket: WebSocket, message: SocketMessage | { type: "dashboard:snapshot"; payload: DashboardSnapshot }) {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  }
}
