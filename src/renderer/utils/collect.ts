type NavigatorWithExtras = Navigator & {
  deviceMemory?: number;
  connection?: { effectiveType?: string; downlink?: number; rtt?: number };
  getBattery?: () => Promise<{ charging: boolean; level: number }>;
};

function browserName(userAgent: string) {
  if (userAgent.includes("Edg/")) return "Microsoft Edge";
  if (userAgent.includes("Chrome/")) return "Google Chrome";
  if (userAgent.includes("Firefox/")) return "Mozilla Firefox";
  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) return "Apple Safari";
  return "Unknown";
}

function browserVersion(userAgent: string) {
  const match = userAgent.match(/(Edg|Chrome|Firefox|Version)\/([\d.]+)/);
  return match?.[2] ?? "Unknown";
}

function operatingSystem(userAgent: string) {
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Mac OS")) return "macOS";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS/iPadOS";
  if (userAgent.includes("Linux")) return "Linux";
  return "Unknown";
}

function deviceType() {
  if (window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 800) return "Mobile";
  if (window.matchMedia("(pointer: coarse)").matches) return "Tablet or touch device";
  return "Desktop or laptop";
}

export async function collectAutomaticInfo() {
  const nav = navigator as NavigatorWithExtras;
  let battery = "Unavailable";
  if (typeof nav.getBattery === "function") {
    try {
      const status = await nav.getBattery();
      battery = `${Math.round(status.level * 100)}%, ${status.charging ? "charging" : "not charging"}`;
    } catch {
      battery = "Unavailable";
    }
  }

  const network = nav.connection
    ? `${nav.connection.effectiveType ?? "unknown"} / ${nav.connection.downlink ?? "?"} Mbps / ${nav.connection.rtt ?? "?"} ms`
    : "Unavailable";

  return {
    browser: browserName(navigator.userAgent),
    browserVersion: browserVersion(navigator.userAgent),
    operatingSystem: operatingSystem(navigator.userAgent),
    deviceType: deviceType(),
    screenResolution: `${screen.width} x ${screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookiesEnabled: navigator.cookieEnabled,
    cpuCores: navigator.hardwareConcurrency || null,
    memory: nav.deviceMemory ?? null,
    network,
    battery
  };
}
