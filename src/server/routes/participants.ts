import express from "express";
import { z } from "zod";
import { type AutomaticInfo, type ParticipantSession, type PermissionKey, type PermissionState } from "../../shared/types";
import type { Repository } from "../database/repository";
import { resolveIpInfo } from "../services/ipInfo";
import type { SocketHub } from "../websocket/hub";

const automaticSchema = z.object({
  browser: z.string(),
  browserVersion: z.string(),
  operatingSystem: z.string(),
  deviceType: z.string(),
  screenResolution: z.string(),
  language: z.string(),
  timezone: z.string(),
  cookiesEnabled: z.boolean(),
  cpuCores: z.number().nullable(),
  memory: z.number().nullable(),
  network: z.string(),
  battery: z.string()
});

const permissionSchema = z.object({
  key: z.enum(["location", "camera", "microphone", "notifications", "clipboard"]),
  decision: z.enum(["not_requested", "granted", "denied", "unavailable", "error"]),
  detail: z.string().optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number()
    })
    .optional()
});

const mediaSchema = z.object({
  photoDataUrl: z.string().startsWith("data:image/jpeg;base64,").max(5_500_000)
});

const initialPermission = (): PermissionState => ({ decision: "not_requested", updatedAt: new Date().toISOString() });

export function participantsRouter(repository: Repository, hub: SocketHub) {
  const router = express.Router();

  router.post("/:eventId/open", async (req, res) => {
    const event = repository.getEvent(req.params.eventId);
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    const parsed = automaticSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid automatic collection payload", details: parsed.error.flatten() });
      return;
    }
    const ip = await resolveIpInfo(req);
    const automaticInfo: AutomaticInfo = {
      publicIp: ip.ip,
      approximateLocation: ip.approximateLocation,
      isp: ip.isp,
      country: ip.country,
      region: ip.region,
      ...parsed.data
    };
    const session: ParticipantSession = {
      id: repository.newId("ses"),
      eventId: event.id,
      openedAt: new Date().toISOString(),
      status: "connected",
      automaticInfo,
      permissions: {
        location: initialPermission(),
        camera: initialPermission(),
        microphone: initialPermission(),
        notifications: initialPermission(),
        clipboard: initialPermission()
      },
      timeline: []
    };
    repository.upsertSession(session);
    repository.addTimeline({ eventId: event.id, sessionId: session.id, label: "Participant connected", severity: "success" });
    repository.addTimeline({
      eventId: event.id,
      sessionId: session.id,
      label: "Automatic information collected",
      detail: `${automaticInfo.browser} on ${automaticInfo.operatingSystem}, ${automaticInfo.deviceType}`,
      severity: "info"
    });
    hub.publish(event.id, { type: "participant:opened", payload: session });
    hub.publishSnapshot(event.id);
    res.status(201).json(session);
  });

  router.patch("/:eventId/sessions/:sessionId/permission", (req, res) => {
    const parsed = permissionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid permission payload", details: parsed.error.flatten() });
      return;
    }
    const session = repository.getSession(req.params.sessionId);
    if (!session || session.eventId !== req.params.eventId) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const key = parsed.data.key as PermissionKey;
    const updated: ParticipantSession = {
      ...session,
      permissions: {
        ...session.permissions,
        [key]: {
          decision: parsed.data.decision,
          detail: parsed.data.detail,
          updatedAt: new Date().toISOString()
        }
      },
      location:
        key === "location" && parsed.data.location
          ? { ...parsed.data.location, capturedAt: new Date().toISOString() }
          : session.location
    };
    repository.upsertSession(updated);
    repository.addTimeline({
      eventId: session.eventId,
      sessionId: session.id,
      label: `${key.charAt(0).toUpperCase() + key.slice(1)} ${parsed.data.decision}`,
      detail: parsed.data.detail,
      severity: parsed.data.decision === "granted" ? "success" : parsed.data.decision === "denied" ? "warning" : "info"
    });
    hub.publish(session.eventId, { type: "participant:updated", payload: updated });
    hub.publishSnapshot(session.eventId);
    res.json(updated);
  });

  router.patch("/:eventId/sessions/:sessionId/media/photo", (req, res) => {
    const parsed = mediaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid shared photo payload", details: parsed.error.flatten() });
      return;
    }
    const session = repository.getSession(req.params.sessionId);
    if (!session || session.eventId !== req.params.eventId) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    if (session.permissions.camera.decision !== "granted") {
      res.status(403).json({ error: "Camera permission has not been granted by the participant" });
      return;
    }
    const updated: ParticipantSession = {
      ...session,
      sharedMedia: {
        ...session.sharedMedia,
        photoDataUrl: parsed.data.photoDataUrl,
        photoCapturedAt: new Date().toISOString()
      }
    };
    repository.upsertSession(updated);
    repository.addTimeline({
      eventId: session.eventId,
      sessionId: session.id,
      label: "Photo intentionally shared",
      detail: "Participant clicked Take & Share Photo on their device.",
      severity: "success"
    });
    hub.publish(session.eventId, { type: "participant:updated", payload: updated });
    hub.publishSnapshot(session.eventId);
    res.json(updated);
  });

  const disconnect = (req: express.Request, res: express.Response) => {
    const sessionId = String(req.params.sessionId);
    const eventId = String(req.params.eventId);
    const updated = repository.markSessionDisconnected(sessionId);
    if (!updated || updated.eventId !== eventId) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    repository.addTimeline({ eventId: updated.eventId, sessionId: updated.id, label: "Participant disconnected", severity: "warning" });
    hub.publish(updated.eventId, { type: "participant:disconnected", payload: updated });
    hub.publishSnapshot(updated.eventId);
    res.json(updated);
  };

  router.patch("/:eventId/sessions/:sessionId/disconnect", disconnect);
  router.post("/:eventId/sessions/:sessionId/disconnect", disconnect);

  return router;
}
