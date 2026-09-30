import type { Request } from "express";

export type IpInfo = {
  ip: string;
  approximateLocation: string;
  isp: string;
  country: string;
  region: string;
};

function normalizeIp(value: string | undefined): string {
  if (!value) return "Unavailable";
  const first = value.split(",")[0]?.trim() ?? value;
  return first.replace("::ffff:", "");
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

export async function resolveIpInfo(req: Request): Promise<IpInfo> {
  const ip = normalizeIp((req.headers["x-forwarded-for"] as string | undefined) ?? req.socket.remoteAddress);
  const empty = {
    ip,
    approximateLocation: "Unavailable for local/private network",
    isp: "Unavailable",
    country: "Unavailable",
    region: "Unavailable"
  };

  if (ip === "Unavailable" || isPrivateIp(ip)) return empty;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return empty;
    const data = (await response.json()) as Record<string, unknown>;
    if (data.success === false) return empty;
    const city = typeof data.city === "string" ? data.city : "";
    const region = typeof data.region === "string" ? data.region : "Unavailable";
    const country = typeof data.country === "string" ? data.country : "Unavailable";
    const connection = data.connection && typeof data.connection === "object" ? (data.connection as Record<string, unknown>) : {};
    const isp = typeof connection.isp === "string" ? connection.isp : "Unavailable";
    return {
      ip,
      approximateLocation: [city, region, country].filter(Boolean).join(", ") || "Unavailable",
      isp,
      country,
      region
    };
  } catch {
    return empty;
  }
}
