export const schemaSql = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS ticket_counters (
    prefix TEXT PRIMARY KEY,
    last_value INTEGER NOT NULL CHECK (last_value >= 0)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL UNIQUE,
    tally_submission_id TEXT NOT NULL UNIQUE,
    tally_form_id TEXT NOT NULL,
    form_type TEXT NOT NULL,
    calculator_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    submitted_at TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    normalized_json TEXT NOT NULL,
    numbers_synced INTEGER NOT NULL DEFAULT 0 CHECK (numbers_synced IN (0, 1)),
    numbers_synced_at TEXT,
    sync_error TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_sync_attempt TEXT,
    next_sync_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS tickets_pending_sync_idx
    ON tickets(numbers_synced, next_sync_at, submitted_at);
`;
