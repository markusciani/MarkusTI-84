import type { NormalizedTicket, PendingTicketRecord } from "@ti-tickets/shared";
import type { DatabaseSync } from "node:sqlite";
import type { FormConfig } from "../config/forms.js";
import { normalizeSubmission } from "../tally/normalize.js";
import type { TallyWebhookPayload } from "../tally/types.js";
import { nextTicketId } from "./ticketIds.js";

interface TicketRow {
  id: number;
  ticket_id: string;
  tally_submission_id: string;
  tally_form_id: string;
  form_type: string;
  calculator_type: string;
  status: string;
  submitted_at: string;
  payload_json: string;
  normalized_json: string;
  numbers_synced: number;
  numbers_synced_at: string | null;
  sync_error: string | null;
  retry_count: number;
  last_sync_attempt: string | null;
  next_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateTicketResult =
  | { duplicate: false; id: number; ticketId: string; normalized: NormalizedTicket }
  | { duplicate: true; id: number; ticketId: string };

const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000, 60 * 60_000];

export class TicketService {
  constructor(private readonly db: DatabaseSync, private readonly configs: FormConfig[]) {}

  create(payload: TallyWebhookPayload, config: FormConfig): CreateTicketResult {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.db.prepare(
        "SELECT id, ticket_id FROM tickets WHERE tally_submission_id = ?"
      ).get(payload.data.submissionId) as { id: number; ticket_id: string } | undefined;
      if (existing) {
        this.db.exec("COMMIT");
        return { duplicate: true, id: existing.id, ticketId: existing.ticket_id };
      }

      const ticketId = nextTicketId(this.db, config.ticketPrefix);
      const normalized = normalizeSubmission(payload, config, ticketId);
      const now = new Date().toISOString();
      const result = this.db.prepare(`
        INSERT INTO tickets (
          ticket_id, tally_submission_id, tally_form_id, form_type, calculator_type,
          submitted_at, payload_json, normalized_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ticketId, payload.data.submissionId, payload.data.formId, config.formType,
        config.calculatorType, normalized.submittedAt, JSON.stringify(payload),
        JSON.stringify(normalized), now, now
      );
      this.db.exec("COMMIT");
      return { duplicate: false, id: Number(result.lastInsertRowid), ticketId, normalized };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  getById(id: number): ReturnType<TicketService["serialize"]> | undefined {
    const row = this.db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as unknown as TicketRow | undefined;
    return row ? this.serialize(row) : undefined;
  }

  getByTicketId(ticketId: string): ReturnType<TicketService["serialize"]> | undefined {
    const row = this.db.prepare("SELECT * FROM tickets WHERE ticket_id = ?").get(ticketId) as unknown as TicketRow | undefined;
    return row ? this.serialize(row) : undefined;
  }

  listForProgramBuilder(): Array<{
    id: number;
    ticketId: string;
    firstName: string;
    phone: string;
    email: string;
    calculator: string;
    status: string;
    games: string[];
    programs: string[];
    delivery: string;
    submittedAt: string;
  }> {
    const rows = this.db.prepare("SELECT * FROM tickets ORDER BY submitted_at DESC, id DESC").all() as unknown as TicketRow[];
    return rows.map((row) => {
      const ticket = JSON.parse(row.normalized_json) as NormalizedTicket;
      return {
        id: row.id,
        ticketId: row.ticket_id,
        firstName: ticket.person.firstName,
        phone: ticket.person.phone,
        email: ticket.person.email,
        calculator: ticket.calculator.model || ticket.calculatorType,
        status: row.status,
        games: ticket.games,
        programs: ticket.programs,
        delivery: String(ticket.delivery.option ?? ""),
        submittedAt: ticket.submittedAt
      };
    });
  }

  updateStatus(identifier: number | string, status: string): boolean {
    const result = typeof identifier === "number"
      ? this.db.prepare("UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?")
        .run(status, new Date().toISOString(), identifier)
      : this.db.prepare("UPDATE tickets SET status = ?, updated_at = ? WHERE ticket_id = ?")
        .run(status, new Date().toISOString(), identifier);
    return result.changes === 1;
  }

  listPending(now = new Date(), ticketId?: string, ignoreSchedule = false): PendingTicketRecord[] {
    const params: Array<string> = [];
    let where = "numbers_synced = 0";
    if (!ignoreSchedule) {
      where += " AND (next_sync_at IS NULL OR next_sync_at <= ?)";
      params.push(now.toISOString());
    }
    if (ticketId) { where += " AND ticket_id = ?"; params.push(ticketId); }
    const rows = this.db.prepare(`SELECT * FROM tickets WHERE ${where} ORDER BY submitted_at, id`).all(...params) as unknown as TicketRow[];
    return rows.map((row) => {
      const config = this.configs.find((item) => item.formType === row.form_type);
      if (!config) throw new Error(`No active configuration for stored form type ${row.form_type}`);
      return {
        id: row.id,
        ticketId: row.ticket_id,
        formType: row.form_type,
        calculatorType: row.calculator_type,
        submittedAt: row.submitted_at,
        retryCount: row.retry_count,
        normalized: JSON.parse(row.normalized_json) as NormalizedTicket,
        numbers: {
          sheet: config.numbersSheet,
          table: config.numbersTable,
          masterSheet: "All Tickets",
          masterTable: "Tickets",
          ticketType: config.ticketType,
          detailColumns: config.detailColumns
        }
      };
    });
  }

  markSynced(id: number, now = new Date()): boolean {
    const result = this.db.prepare(`
      UPDATE tickets SET numbers_synced = 1, numbers_synced_at = ?, sync_error = NULL,
        next_sync_at = NULL, last_sync_attempt = ?, updated_at = ? WHERE id = ?
    `).run(now.toISOString(), now.toISOString(), now.toISOString(), id);
    return result.changes === 1;
  }

  markFailed(id: number, error: string, now = new Date()): { retryCount: number; nextSyncAt: string } | undefined {
    const current = this.db.prepare("SELECT retry_count FROM tickets WHERE id = ? AND numbers_synced = 0").get(id) as { retry_count: number } | undefined;
    if (!current) return undefined;
    const retryCount = current.retry_count + 1;
    const delay = RETRY_DELAYS_MS[Math.min(retryCount - 1, RETRY_DELAYS_MS.length - 1)];
    const nextSyncAt = new Date(now.getTime() + delay).toISOString();
    this.db.prepare(`
      UPDATE tickets SET retry_count = ?, sync_error = ?, last_sync_attempt = ?,
        next_sync_at = ?, updated_at = ? WHERE id = ?
    `).run(retryCount, error.slice(0, 4000), now.toISOString(), nextSyncAt, now.toISOString(), id);
    return { retryCount, nextSyncAt };
  }

  private serialize(row: TicketRow) {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      tallySubmissionId: row.tally_submission_id,
      tallyFormId: row.tally_form_id,
      formType: row.form_type,
      calculatorType: row.calculator_type,
      status: row.status,
      submittedAt: row.submitted_at,
      numbersSynced: Boolean(row.numbers_synced),
      numbersSyncedAt: row.numbers_synced_at,
      syncError: row.sync_error,
      retryCount: row.retry_count,
      lastSyncAttempt: row.last_sync_attempt,
      nextSyncAt: row.next_sync_at,
      normalized: JSON.parse(row.normalized_json) as NormalizedTicket,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export { RETRY_DELAYS_MS };
