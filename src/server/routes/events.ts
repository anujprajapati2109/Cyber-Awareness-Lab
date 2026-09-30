import express from "express";
import QRCode from "qrcode";
import { z } from "zod";
import { defaultOptions, type EventOptions } from "../../shared/types";
import type { Repository } from "../database/repository";
import { snapshotToCsv, snapshotToJson, snapshotToPdf } from "../services/reportService";
import type { TunnelManager } from "../services/tunnelManager";

const createEventSchema = z.object({
  name: z.string().trim().min(1).max(80),
  options: z.custom<EventOptions>().optional()
});

export function eventsRouter(repository: Repository, tunnels: TunnelManager) {
  const router = express.Router();

  router.get("/", (_req, res) => {
    res.json(repository.listEvents());
  });

  router.post("/", async (req, res) => {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid event payload", details: parsed.error.flatten() });
      return;
    }

    const id = repository.newId("evt");
    const deployment = tunnels.getState();
    const origin =
      deployment.publicUrl ??
      (typeof req.headers.origin === "string" && req.headers.origin !== "null" ? req.headers.origin : `${req.protocol}://${req.get("host")}`);
    const url = `${origin}/participant/${id}`;
    const qrCode = await QRCode.toDataURL(url, { margin: 2, width: 280, color: { dark: "#25f39b", light: "#020403" } });
    const event = repository.createEvent({
      id,
      name: parsed.data.name,
      url,
      qrCode,
      options: parsed.data.options ?? defaultOptions
    });
    repository.addTimeline({
      eventId: event.id,
      label: "Event created",
      detail: `Participant URL generated using ${deployment.provider} deployment mode.`,
      severity: "info"
    });
    res.status(201).json(event);
  });

  router.get("/:eventId", (req, res) => {
    const event = repository.getEvent(req.params.eventId);
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json(event);
  });

  router.get("/:eventId/snapshot", (req, res) => {
    const snapshot = repository.snapshot(req.params.eventId);
    if (!snapshot) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json(snapshot);
  });

  router.get("/:eventId/export.json", (req, res) => {
    const snapshot = repository.snapshot(req.params.eventId);
    if (!snapshot) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.header("Content-Disposition", `attachment; filename="${snapshot.event.name}-history.json"`);
    res.type("application/json").send(snapshotToJson(snapshot));
  });

  router.get("/:eventId/export.csv", (req, res) => {
    const snapshot = repository.snapshot(req.params.eventId);
    if (!snapshot) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.type("text/csv");
    res.header("Content-Disposition", `attachment; filename="${snapshot.event.name}-history.csv"`);
    res.send(snapshotToCsv(snapshot));
  });

  router.get("/:eventId/export.pdf", async (req, res) => {
    const snapshot = repository.snapshot(req.params.eventId);
    if (!snapshot) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.type("application/pdf");
    res.header("Content-Disposition", `attachment; filename="${snapshot.event.name}-report.pdf"`);
    res.send(await snapshotToPdf(snapshot));
  });

  return router;
}
