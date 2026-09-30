import http from "node:http";
import path from "node:path";
import cors from "cors";
import express from "express";
import { config } from "./config";
import { openDatabase } from "./database/schema";
import { Repository } from "./database/repository";
import { eventsRouter } from "./routes/events";
import { deploymentRouter } from "./routes/deployment";
import { participantsRouter } from "./routes/participants";
import { settingsRouter } from "./routes/settings";
import { TunnelManager } from "./services/tunnelManager";
import { SocketHub } from "./websocket/hub";

export function startServer(portOverride?: number) {
  const app = express();
  const server = http.createServer(app);
  const repository = new Repository(openDatabase());
  const hub = new SocketHub(server, repository);
  const settings = repository.getSettings();
  const port = Number(portOverride ?? process.env.CYBER_LAB_PORT ?? settings.port ?? config.defaultPort);
  const tunnels = new TunnelManager(port);

  app.disable("x-powered-by");
  app.use(cors({ origin: true, credentials: false }));
  app.use(express.json({ limit: "6mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "ReconLens" }));
  app.use("/api/deployment", deploymentRouter(tunnels));
  app.use("/api/events", eventsRouter(repository, tunnels));
  app.use("/api/settings", settingsRouter(repository));
  app.use("/api/participants", participantsRouter(repository, hub));

  if (process.env.CYBER_LAB_STATIC_DIR) {
    const staticDir = process.env.CYBER_LAB_STATIC_DIR;
    app.use(express.static(staticDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path === "/health" || req.path === "/ws") {
        next();
        return;
      }
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  const ready = new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, config.host, () => {
      server.off("error", reject);
      console.log(`ReconLens API listening on http://localhost:${port}`);
      resolve();
    });
  });

  return { app, server, port, ready };
}
