import type { ParticipantSession } from "../../shared/types";

const csvValue = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function sessionsToCsv(sessions: ParticipantSession[]) {
  const header = [
    "session_id",
    "event_id",
    "opened_at",
    "disconnected_at",
    "status",
    "public_ip",
    "browser",
    "operating_system",
    "device_type",
    "location_decision",
    "camera_decision",
    "microphone_decision",
    "notifications_decision",
    "clipboard_decision",
    "latitude",
    "longitude",
    "accuracy"
  ];
  const rows = sessions.map((session) => [
    session.id,
    session.eventId,
    session.openedAt,
    session.disconnectedAt ?? "",
    session.status,
    session.automaticInfo.publicIp,
    session.automaticInfo.browser,
    session.automaticInfo.operatingSystem,
    session.automaticInfo.deviceType,
    session.permissions.location.decision,
    session.permissions.camera.decision,
    session.permissions.microphone.decision,
    session.permissions.notifications.decision,
    session.permissions.clipboard.decision,
    session.location?.latitude ?? "",
    session.location?.longitude ?? "",
    session.location?.accuracy ?? ""
  ]);

  return [header, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
}
