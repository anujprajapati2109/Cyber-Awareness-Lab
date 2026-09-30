import express from "express";
import QRCode from "qrcode";
import { z } from "zod";
import type { TunnelManager } from "../services/tunnelManager";

const startSchema = z.object({
  provider: z.enum(["local", "cloudflare", "ngrok"])
});

export function deploymentRouter(tunnels: TunnelManager) {
  const router = express.Router();

  router.get("/", (_req, res) => {
    res.json(tunnels.getState());
  });

  router.post("/start", async (req, res) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid deployment provider" });
      return;
    }
    res.json(await tunnels.start(parsed.data.provider));
  });

  router.post("/stop", async (_req, res) => {
    await tunnels.stop();
    res.json(tunnels.getState());
  });

  router.get("/qr", async (req, res) => {
    const url = typeof req.query.url === "string" ? req.query.url : tunnels.getState().publicUrl;
    if (!url) {
      res.status(400).json({ error: "No URL available for QR generation" });
      return;
    }
    res.json({ qrCode: await QRCode.toDataURL(url, { margin: 2, width: 280, color: { dark: "#25f39b", light: "#020403" } }) });
  });

  return router;
}
