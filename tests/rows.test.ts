import assert from "node:assert/strict";
import test from "node:test";
import type { PendingTicketRecord } from "@ti-tickets/shared";
import { buildDetailRow, buildMasterRow } from "../mac-sync/src/rows.js";

const record: PendingTicketRecord = {
  id: 1,
  ticketId: "EVO-0001",
  formType: "evo",
  calculatorType: "TI-84 Evo",
  submittedAt: "2026-08-30T20:30:00.000Z",
  retryCount: 0,
  normalized: {
    ticketId: "EVO-0001", tallySubmissionId: "abc123", formId: "form", formType: "evo",
    calculatorType: "TI-84 Evo", submittedAt: "2026-08-30T20:30:00.000Z",
    person: { firstName: "John", phone: "555", email: "john@example.com", grade: "Junior" },
    calculator: { model: "TI-84 Evo", version: "7.0", python: "Yes", caseIncluded: "Yes", chargerIncluded: "Yes" },
    options: { background: "Blue", signatureReceived: "Yes", signatureUrl: "https://example/signature" },
    games: ["Snake", "Tetris"], programs: ["Quadratic Formula"], delivery: { option: "Before school" }, files: [], raw: {}
  },
  numbers: {
    sheet: "TI-84 Evo", table: "Tickets", masterSheet: "All Tickets", masterTable: "Tickets", ticketType: "Game Ticket",
    detailColumns: { "Ticket ID": "ticketId", "Games Requested": "games", "Status": "$status" }
  }
};

test("Numbers rows use configured headers and newline-separated selections", () => {
  const detail = buildDetailRow(record);
  assert.equal(detail["Games Requested"], "Snake\nTetris");
  assert.equal(detail.Status, "New");
  const master = buildMasterRow(record, new Date("2026-08-30T22:00:00.000Z"));
  assert.equal(master["Ticket Type"], "Game Ticket");
  assert.equal(master.Status, "New");
  assert.equal(master["Last Updated"], "2026-08-30T22:00:00.000Z");
});
