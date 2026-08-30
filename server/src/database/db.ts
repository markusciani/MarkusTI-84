import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { schemaSql } from "./schema.js";

export function openDatabase(path = process.env.DATABASE_PATH || "./data/ti-tickets.sqlite"): DatabaseSync {
  const resolved = path === ":memory:" ? path : resolve(path);
  if (resolved !== ":memory:") mkdirSync(dirname(resolved), { recursive: true });
  const db = new DatabaseSync(resolved);
  db.exec(schemaSql);
  const columns = db.prepare("PRAGMA table_info(tickets)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "status")) {
    db.exec("ALTER TABLE tickets ADD COLUMN status TEXT NOT NULL DEFAULT 'New'");
  }
  return db;
}
