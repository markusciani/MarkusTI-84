import type { DatabaseSync } from "node:sqlite";

export function nextTicketId(db: DatabaseSync, prefix: string): string {
  db.prepare(`
    INSERT INTO ticket_counters(prefix, last_value) VALUES (?, 1)
    ON CONFLICT(prefix) DO UPDATE SET last_value = last_value + 1
  `).run(prefix);
  const row = db.prepare("SELECT last_value FROM ticket_counters WHERE prefix = ?").get(prefix) as { last_value: number };
  return `${prefix}-${String(row.last_value).padStart(4, "0")}`;
}
