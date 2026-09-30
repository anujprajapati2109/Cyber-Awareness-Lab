import express from "express";
import { z } from "zod";
import { defaultOptions } from "../../shared/types";
import type { Repository } from "../database/repository";

const settingsSchema = z.object({
  theme: z.enum(["matrix", "midnight", "contrast"]),
  port: z.number().int().min(1024).max(65535),
  tunnelProvider: z.enum(["local", "cloudflare", "ngrok"]),
  exportFolder: z.string(),
  defaults: z.object({
    autoCollection: z.record(z.boolean()).default(defaultOptions.autoCollection),
    permissions: z.record(z.boolean()).default(defaultOptions.permissions)
  })
});

export function settingsRouter(repository: Repository) {
  const router = express.Router();

  router.get("/", (_req, res) => {
    res.json(repository.getSettings());
  });

  router.put("/", (req, res) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid settings payload", details: parsed.error.flatten() });
      return;
    }
    res.json(repository.saveSettings(parsed.data));
  });

  router.post("/backup", (_req, res) => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings: repository.getSettings(),
      events: repository.listEvents().map((event) => ({
        ...event,
        sessions: repository.listSessions(event.id)
      }))
    };
    res.header("Content-Disposition", `attachment; filename="reconlens-backup.json"`);
    res.json(payload);
  });

  return router;
}
