import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formConfigs } from "../server/src/config/forms.js";
import { openDatabase } from "../server/src/database/db.js";
import { TicketService, RETRY_DELAYS_MS } from "../server/src/tickets/ticketService.js";
import type { TallyWebhookPayload } from "../server/src/tally/types.js";

function fixture(name: string): TallyWebhookPayload {
  return JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
}

test("ticket IDs are stable, prefixed, sequential, and duplicate-safe", () => {
  const db = openDatabase(":memory:");
  const service = new TicketService(db, formConfigs);
  const config = formConfigs.find((item) => item.formType === "evo")!;
  const first = service.create(fixture("tally-evo.json"), config);
  const duplicate = service.create(fixture("tally-evo.json"), config);
  const secondPayload = fixture("tally-evo.json");
  secondPayload.data.submissionId = "evo-submission-002";
  const second = service.create(secondPayload, config);
  assert.equal(first.ticketId, "EVO-0001");
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.ticketId, "EVO-0001");
  assert.equal(second.ticketId, "EVO-0002");
  db.close();
});

test("pending, failure backoff, and synchronized state transitions", () => {
  const db = openDatabase(":memory:");
  const service = new TicketService(db, formConfigs);
  const config = formConfigs.find((item) => item.formType === "ce")!;
  const created = service.create(fixture("tally-ce.json"), config);
  const now = new Date("2026-08-30T22:00:00.000Z");
  assert.equal(service.listPending(now).length, 1);
  const retry = service.markFailed(created.id, "Numbers is unavailable", now)!;
  assert.equal(retry.retryCount, 1);
  assert.equal(new Date(retry.nextSyncAt).getTime() - now.getTime(), RETRY_DELAYS_MS[0]);
  assert.equal(service.listPending(new Date(now.getTime() + 59_000)).length, 0);
  assert.equal(service.listPending(new Date(now.getTime() + 59_000), undefined, true).length, 1);
  assert.equal(service.listPending(new Date(now.getTime() + 60_000)).length, 1);
  assert.equal(service.markSynced(created.id, new Date(now.getTime() + 61_000)), true);
  assert.equal(service.listPending(new Date(now.getTime() + 120_000)).length, 0);
  assert.equal(service.getById(created.id)?.numbersSynced, true);
  db.close();
});

test("ticket status is stored for program-builder filters and can be updated", () => {
  const db = openDatabase(":memory:");
  const service = new TicketService(db, formConfigs);
  const config = formConfigs.find((item) => item.formType === "evo")!;
  const created = service.create(fixture("tally-evo.json"), config);
  assert.equal(service.listForProgramBuilder()[0].status, "New");
  assert.equal(service.updateStatus(created.id, "Ready for Delivery"), true);
  assert.equal(service.listForProgramBuilder()[0].status, "Ready for Delivery");
  db.close();
});
