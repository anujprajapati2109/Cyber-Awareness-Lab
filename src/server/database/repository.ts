import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type { DashboardSnapshot, LabEvent, ParticipantSession, Settings, TimelineEntry } from "../../shared/types";
import { defaultOptions } from "../../shared/types";

type EventRow = {
  id: string;
  name: string;
  created_at: string;
  url: string;
  qr_code: string;
  options_json: string;
};

type SessionRow = {
  id: string;
  event_id: string;
  opened_at: string;
  disconnected_at: string | null;
  status: "connected" | "disconnected";
  automatic_json: string;
  permissions_json: string;
  location_json: string | null;
  shared_media_json: string | null;
  timeline_json: string;
};

const defaultSettings: Settings = {
  theme: "matrix",
  port: 4100,
  tunnelProvider: "local",
  exportFolder: "",
  defaults: defaultOptions
};

export class Repository {
  constructor(private readonly db: DatabaseSync) {}

  createEvent(input: Omit<LabEvent, "createdAt">): LabEvent {
    const event: LabEvent = { ...input, createdAt: new Date().toISOString() };
    this.db
      .prepare("INSERT INTO events (id, name, created_at, url, qr_code, options_json) VALUES (?, ?, ?, ?, ?, ?)")
      .run(event.id, event.name, event.createdAt, event.url, event.qrCode, JSON.stringify(event.options));
    return event;
  }

  listEvents(): LabEvent[] {
    return this.db
      .prepare("SELECT * FROM events ORDER BY created_at DESC")
      .all()
      .map((row) => this.toEvent(row as EventRow));
  }

  getEvent(id: string): LabEvent | null {
    const row = this.db.prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRow | undefined;
    return row ? this.toEvent(row) : null;
  }

  upsertSession(session: ParticipantSession) {
    this.db
      .prepare(
        `INSERT INTO sessions (id, event_id, opened_at, disconnected_at, status, automatic_json, permissions_json, location_json, shared_media_json, timeline_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
          disconnected_at = excluded.disconnected_at,
          status = excluded.status,
          automatic_json = excluded.automatic_json,
          permissions_json = excluded.permissions_json,
          location_json = excluded.location_json,
          shared_media_json = excluded.shared_media_json,
          timeline_json = excluded.timeline_json`
      )
      .run(
        session.id,
        session.eventId,
        session.openedAt,
        session.disconnectedAt ?? null,
        session.status,
        JSON.stringify(session.automaticInfo),
        JSON.stringify(session.permissions),
        session.location ? JSON.stringify(session.location) : null,
        session.sharedMedia ? JSON.stringify(session.sharedMedia) : null,
        JSON.stringify(session.timeline ?? [])
      );
  }

  getSession(id: string): ParticipantSession | null {
    const row = this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined;
    return row ? this.toSession(row) : null;
  }

  listSessions(eventId: string): ParticipantSession[] {
    return this.db
      .prepare("SELECT * FROM sessions WHERE event_id = ? ORDER BY opened_at DESC")
      .all(eventId)
      .map((row) => this.toSession(row as SessionRow));
  }

  markSessionDisconnected(id: string): ParticipantSession | null {
    const session = this.getSession(id);
    if (!session) return null;
    const updated: ParticipantSession = {
      ...session,
      status: "disconnected",
      disconnectedAt: new Date().toISOString()
    };
    this.upsertSession(updated);
    return updated;
  }

  addTimeline(entry: Omit<TimelineEntry, "id" | "timestamp"> & { timestamp?: string }): TimelineEntry {
    const timeline: TimelineEntry = {
      id: this.newId("tle"),
      timestamp: entry.timestamp ?? new Date().toISOString(),
      eventId: entry.eventId,
      sessionId: entry.sessionId,
      label: entry.label,
      detail: entry.detail,
      severity: entry.severity
    };
    this.db
      .prepare("INSERT INTO timeline (id, event_id, session_id, timestamp, label, detail, severity) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(timeline.id, timeline.eventId, timeline.sessionId ?? null, timeline.timestamp, timeline.label, timeline.detail ?? null, timeline.severity);

    if (timeline.sessionId) {
      const session = this.getSession(timeline.sessionId);
      if (session) this.upsertSession({ ...session, timeline: [...session.timeline, timeline] });
    }
    return timeline;
  }

  listTimeline(eventId: string): TimelineEntry[] {
    return this.db
      .prepare("SELECT * FROM timeline WHERE event_id = ? ORDER BY timestamp DESC LIMIT 200")
      .all(eventId)
      .map((row) => {
        const item = row as {
          id: string;
          event_id: string;
          session_id: string | null;
          timestamp: string;
          label: string;
          detail: string | null;
          severity: TimelineEntry["severity"];
        };
        return {
          id: item.id,
          eventId: item.event_id,
          sessionId: item.session_id ?? undefined,
          timestamp: item.timestamp,
          label: item.label,
          detail: item.detail ?? undefined,
          severity: item.severity
        };
      });
  }

  snapshot(eventId: string): DashboardSnapshot | null {
    const event = this.getEvent(eventId);
    if (!event) return null;
    const sessions = this.listSessions(eventId);
    return {
      event,
      participantCount: sessions.length,
      sessions,
      timeline: this.listTimeline(eventId)
    };
  }

  getSettings(): Settings {
    const row = this.db.prepare("SELECT value_json FROM settings WHERE key = 'app'").get() as { value_json: string } | undefined;
    return row ? { ...defaultSettings, ...JSON.parse(row.value_json) } : defaultSettings;
  }

  saveSettings(settings: Settings): Settings {
    this.db
      .prepare("INSERT INTO settings (key, value_json) VALUES ('app', ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json")
      .run(JSON.stringify(settings));
    return settings;
  }

  newId(prefix: string) {
    return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  }

  private toEvent(row: EventRow): LabEvent {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      url: row.url,
      qrCode: row.qr_code,
      options: JSON.parse(row.options_json)
    };
  }

  private toSession(row: SessionRow): ParticipantSession {
    return {
      id: row.id,
      eventId: row.event_id,
      openedAt: row.opened_at,
      disconnectedAt: row.disconnected_at ?? undefined,
      status: row.status,
      automaticInfo: JSON.parse(row.automatic_json),
      permissions: JSON.parse(row.permissions_json),
      location: row.location_json ? JSON.parse(row.location_json) : undefined,
      sharedMedia: row.shared_media_json ? JSON.parse(row.shared_media_json) : undefined,
      timeline: row.timeline_json ? JSON.parse(row.timeline_json) : []
    };
  }
}
