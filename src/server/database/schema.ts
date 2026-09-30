import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { config } from "../config";

export function openDatabase() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const db = new DatabaseSync(config.databasePath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      url TEXT NOT NULL,
      qr_code TEXT NOT NULL,
      options_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      opened_at TEXT NOT NULL,
      disconnected_at TEXT,
      status TEXT NOT NULL,
      automatic_json TEXT NOT NULL,
      permissions_json TEXT NOT NULL,
      location_json TEXT,
      shared_media_json TEXT,
      timeline_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS timeline (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      session_id TEXT,
      timestamp TEXT NOT NULL,
      label TEXT NOT NULL,
      detail TEXT,
      severity TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );
  `);

  const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
  if (!sessionColumns.some((column) => column.name === "timeline_json")) {
    db.exec("ALTER TABLE sessions ADD COLUMN timeline_json TEXT NOT NULL DEFAULT '[]'");
  }
  if (!sessionColumns.some((column) => column.name === "shared_media_json")) {
    db.exec("ALTER TABLE sessions ADD COLUMN shared_media_json TEXT");
  }

  return db;
}
