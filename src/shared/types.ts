export type PermissionKey = "location" | "camera" | "microphone" | "notifications" | "clipboard";

export type PermissionDecision = "not_requested" | "granted" | "denied" | "unavailable" | "error";
export type TunnelProvider = "local" | "cloudflare" | "ngrok";
export type TunnelStatus = "stopped" | "starting" | "online" | "error";

export type AutoCollectionKey =
  | "publicIp"
  | "ipLocation"
  | "isp"
  | "country"
  | "region"
  | "browser"
  | "browserVersion"
  | "operatingSystem"
  | "deviceType"
  | "screenResolution"
  | "language"
  | "timezone"
  | "cookiesEnabled"
  | "cpuCores"
  | "memory"
  | "network"
  | "battery";

export type EventOptions = {
  autoCollection: Record<AutoCollectionKey, boolean>;
  permissions: Record<PermissionKey, boolean>;
};

export type LabEvent = {
  id: string;
  name: string;
  createdAt: string;
  url: string;
  qrCode: string;
  options: EventOptions;
};

export type AutomaticInfo = {
  publicIp: string;
  approximateLocation: string;
  isp: string;
  country: string;
  region: string;
  browser: string;
  browserVersion: string;
  operatingSystem: string;
  deviceType: string;
  screenResolution: string;
  language: string;
  timezone: string;
  cookiesEnabled: boolean;
  cpuCores: number | null;
  memory: number | null;
  network: string;
  battery: string;
};

export type LocationGrant = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};

export type PermissionState = {
  decision: PermissionDecision;
  detail?: string;
  updatedAt: string;
};

export type SharedMedia = {
  photoDataUrl?: string;
  photoCapturedAt?: string;
};

export type ParticipantSession = {
  id: string;
  eventId: string;
  openedAt: string;
  disconnectedAt?: string;
  status: "connected" | "disconnected";
  automaticInfo: AutomaticInfo;
  permissions: Record<PermissionKey, PermissionState>;
  location?: LocationGrant;
  sharedMedia?: SharedMedia;
  timeline: TimelineEntry[];
};

export type Settings = {
  theme: "matrix" | "midnight" | "contrast";
  port: number;
  tunnelProvider: TunnelProvider;
  exportFolder: string;
  defaults: EventOptions;
};

export type DashboardSnapshot = {
  event: LabEvent;
  participantCount: number;
  sessions: ParticipantSession[];
  timeline: TimelineEntry[];
};

export type TimelineEntry = {
  id: string;
  eventId: string;
  sessionId?: string;
  timestamp: string;
  label: string;
  detail?: string;
  severity: "info" | "success" | "warning" | "danger";
};

export type DeploymentState = {
  provider: TunnelProvider;
  status: TunnelStatus;
  localUrl: string;
  publicUrl?: string;
  message?: string;
  startedAt?: string;
  installInstructions?: string[];
};

export type SocketMessage =
  | { type: "dashboard:snapshot"; payload: DashboardSnapshot }
  | { type: "participant:opened"; payload: ParticipantSession }
  | { type: "participant:updated"; payload: ParticipantSession }
  | { type: "participant:disconnected"; payload: ParticipantSession };

export const disclaimer =
  "This software is intended solely for cybersecurity education and awareness. Sensitive information is accessed only after the participant explicitly grants permission through standard browser security prompts.";

export const permissionDescriptions: Record<PermissionKey, string> = {
  location: "Requests your current browser location and records latitude, longitude, and accuracy only if you approve the browser prompt.",
  camera: "Requests temporary camera access so you can intentionally share the current browser media stream during this session.",
  microphone: "Requests temporary microphone access so you can intentionally share audio capability status during this session.",
  notifications: "Requests permission to show browser notifications from this demonstration page.",
  clipboard: "Attempts clipboard read only after a click and only when the browser allows the standard permission flow."
};

export const defaultOptions: EventOptions = {
  autoCollection: {
    publicIp: true,
    ipLocation: true,
    isp: true,
    country: true,
    region: true,
    browser: true,
    browserVersion: true,
    operatingSystem: true,
    deviceType: true,
    screenResolution: true,
    language: true,
    timezone: true,
    cookiesEnabled: true,
    cpuCores: true,
    memory: true,
    network: true,
    battery: true
  },
  permissions: {
    location: true,
    camera: true,
    microphone: true,
    notifications: true,
    clipboard: true
  }
};

export type EducationalNote = {
  title: string;
  collected: string;
  availability: string;
  misuse: string;
  protection: string;
};

export const educationalNotes: Record<string, EducationalNote> = {
  publicIp: {
    title: "Public IP",
    collected: "The public network address seen by the server.",
    availability: "Servers receive this to route traffic back to your device or network.",
    misuse: "Attackers may infer your ISP, rough region, or use it for targeted scams.",
    protection: "Use trusted networks and a reputable VPN when you need to mask network origin."
  },
  browserVersion: {
    title: "Browser Version",
    collected: "The browser family and version from standard browser headers and APIs.",
    availability: "Browsers expose this for compatibility and analytics.",
    misuse: "Attackers may tailor phishing or exploit attempts to browser-specific weaknesses.",
    protection: "Keep your browser updated and avoid unsupported browsers."
  },
  operatingSystem: {
    title: "Operating System",
    collected: "The operating system inferred from the browser user agent.",
    availability: "Websites use this to adapt downloads, layouts, and support flows.",
    misuse: "Attackers may craft platform-specific fake updates or malware lures.",
    protection: "Download software only from official sources and keep the OS patched."
  },
  screenResolution: {
    title: "Screen Resolution",
    collected: "The display dimensions available to the browser.",
    availability: "Websites use it for responsive layouts.",
    misuse: "It can contribute to browser fingerprinting when combined with other signals.",
    protection: "Use privacy-focused browser settings when fingerprinting risk matters."
  },
  timezone: {
    title: "Timezone",
    collected: "The timezone reported by the browser.",
    availability: "Web apps use it to show local dates and times.",
    misuse: "It can help profile location or working hours.",
    protection: "Be careful with unknown sites that combine many identifying signals."
  },
  location: {
    title: "Precise Browser Location",
    collected: "Latitude, longitude, and accuracy after explicit permission.",
    availability: "The browser releases it only after the user approves the permission prompt.",
    misuse: "Precise location can expose home, workplace, or travel patterns.",
    protection: "Grant location only to sites that genuinely need it and revoke stale permissions."
  },
  camera: {
    title: "Camera Permission",
    collected: "Permission status and local preview only after explicit consent.",
    availability: "Camera access requires a browser prompt and active page permission.",
    misuse: "Malicious sites may socially engineer users into enabling camera access.",
    protection: "Deny unexpected prompts and close tabs that request unnecessary hardware access."
  },
  microphone: {
    title: "Microphone Permission",
    collected: "Permission status only after explicit consent.",
    availability: "Microphone access requires a browser prompt and active page permission.",
    misuse: "Audio access can expose conversations or surroundings.",
    protection: "Grant microphone access only during trusted calls or recording workflows."
  },
  notifications: {
    title: "Notifications Permission",
    collected: "Whether browser notifications were granted or denied.",
    availability: "Notifications require an explicit browser permission decision.",
    misuse: "Attackers may abuse notifications for fake alerts or phishing links.",
    protection: "Deny notification prompts from sites you do not trust."
  }
};
