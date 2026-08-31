import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import type { AddressInfo } from "node:net";
import { createApp } from "../server/src/app.js";
import { openDatabase } from "../server/src/database/db.js";
import { hashBuilderPassword, validateTallyRequest } from "../server/src/security.js";

test("validates official Tally HMAC SHA-256 base64 signatures", () => {
  const body = { eventType: "FORM_RESPONSE", data: { submissionId: "abc" } };
  const secret = "test-signing-secret";
  const signature = createHmac("sha256", secret).update(JSON.stringify(body)).digest("base64");
  assert.equal(validateTallyRequest({ body, receivedSignature: signature, signingSecret: secret }), true);
  assert.equal(validateTallyRequest({ body, receivedSignature: "wrong", signingSecret: secret }), false);
});

test("unknown forms, including a search form, are acknowledged and ignored", async () => {
  const db = openDatabase(":memory:");
  const { app, service } = createApp(db, { apiSecret: "api-test", allowInsecureWebhooks: true });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const port = (server.address() as AddressInfo).port;
  const response = await fetch(`http://127.0.0.1:${port}/webhooks/tally`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventType: "FORM_RESPONSE",
      data: { submissionId: "search-001", formId: "TI_FAMILY_FORM_SEARCH_ID", fields: [] }
    })
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, ignored: true });
  assert.equal(service.listPending().length, 0);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
});

test("known ticket form names work before real Tally form IDs are configured", async () => {
  const db = openDatabase(":memory:");
  const { app, service } = createApp(db, { apiSecret: "api-test", allowInsecureWebhooks: true });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const port = (server.address() as AddressInfo).port;
  const response = await fetch(`http://127.0.0.1:${port}/webhooks/tally`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventType: "FORM_RESPONSE", data: {
      submissionId: "live-evo-001", formId: "unconfigured-real-id", formName: "TI-84 Evo Ticket", fields: []
    } })
  });
  assert.equal(response.status, 200);
  assert.equal(service.listPending().length, 1);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
});

test("sync API requires bearer authentication", async () => {
  const db = openDatabase(":memory:");
  const { app } = createApp(db, { apiSecret: "api-test", allowInsecureWebhooks: true });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const port = (server.address() as AddressInfo).port;
  const denied = await fetch(`http://127.0.0.1:${port}/api/tickets/pending-sync`);
  assert.equal(denied.status, 401);
  const allowed = await fetch(`http://127.0.0.1:${port}/api/tickets/pending-sync`, {
    headers: { authorization: "Bearer api-test" }
  });
  assert.equal(allowed.status, 200);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
});

test("program builder UI is public but ticket data and generation remain authenticated", async () => {
  const db = openDatabase(":memory:");
  const { app } = createApp(db, {
    apiSecret: "api-test", allowInsecureWebhooks: true,
    builderPasswordHash: hashBuilderPassword("builder-test", "fixed-test-salt"), builderSessionSecret: "session-test"
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const port = (server.address() as AddressInfo).port;
  const page = await fetch(`http://127.0.0.1:${port}/program-builder/`);
  assert.equal(page.status, 200);
  const pageHtml = await page.text();
  assert.match(pageHtml, /Calculator Program Builder/);
  assert.match(pageHtml, /id="syncSheets"[^>]*>Refresh Google Sheets/);
  assert.doesNotMatch(pageHtml, /id="syncSheets"[^>]*disabled/);
  const denied = await fetch(`http://127.0.0.1:${port}/api/program-builder/tickets`);
  assert.equal(denied.status, 401);
  const config = await fetch(`http://127.0.0.1:${port}/api/program-builder/config`, { headers: { authorization: "Bearer api-test" } });
  assert.equal(config.status, 200);
  const body = await config.json() as { models: Array<{ id: string }>; formats: Array<{ id: string }> };
  assert.deepEqual(body.models.map((model) => model.id), ["TI-84 Evo", "TI-84 Plus CE", "TI-84 Plus CE Python", "TI-84 Plus"]);
  assert.deepEqual(body.formats.map((format) => format.id), ["ti-basic"]);
  const login = await fetch(`http://127.0.0.1:${port}/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "builder-test" })
  });
  assert.equal(login.status, 200);
  const { token } = await login.json() as { token: string };
  const builderAllowed = await fetch(`http://127.0.0.1:${port}/api/program-builder/tickets`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(builderAllowed.status, 200);
  const syncDenied = await fetch(`http://127.0.0.1:${port}/api/tickets/pending-sync`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(syncDenied.status, 401);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
});
