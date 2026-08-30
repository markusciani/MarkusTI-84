import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formConfigs } from "../server/src/config/forms.js";
import { normalizeSubmission } from "../server/src/tally/normalize.js";
import type { TallyWebhookPayload } from "../server/src/tally/types.js";

function fixture(name: string): TallyWebhookPayload {
  return JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
}

test("normalizes Evo fields, option labels, files, and selected games/programs", () => {
  const config = formConfigs.find((item) => item.formType === "evo")!;
  const ticket = normalizeSubmission(fixture("tally-evo.json"), config, "EVO-0001");
  assert.equal(ticket.person.firstName, "John");
  assert.equal(ticket.person.grade, "Junior");
  assert.equal(ticket.calculator.python, "Yes");
  assert.equal(ticket.options.cleanCase, "Yes");
  assert.deepEqual(ticket.games, ["Snake", "Wordle", "2048"]);
  assert.deepEqual(ticket.programs, ["Quadratic Formula", "Unit Circle"]);
  assert.equal(ticket.options.signatureReceived, "Yes");
  assert.equal(ticket.options.signatureUrl, "https://storage.example/signature.png");
  assert.equal((ticket.raw as TallyWebhookPayload).data.submissionId, "evo-submission-001");
});

test("normalizes CE conditional launcher data", () => {
  const config = formConfigs.find((item) => item.formType === "ce")!;
  const ticket = normalizeSubmission(fixture("tally-ce.json"), config, "CE-0001");
  assert.equal(ticket.calculator.model, "TI-84 Plus CE Python");
  assert.equal(ticket.calculator.python, "Yes but remove it");
  assert.equal(ticket.options.gameLauncherMethod, "Existing launcher");
  assert.equal(ticket.options.launcherScreenshotUrl, "https://storage.example/launcher.png");
  assert.deepEqual(ticket.games, ["Tetris"]);
  assert.deepEqual(ticket.programs, ["Quadratic Formula"]);
});

test("missing optional conditional fields become blank instead of errors", () => {
  const payload = fixture("tally-ce.json");
  payload.data.fields = payload.data.fields.filter((field) =>
    !["TODO_TALLY_CE_EXISTING_LAUNCHER_NAME_FIELD_ID", "TODO_TALLY_CE_LAUNCHER_SCREENSHOT_FIELD_ID"].includes(field.key)
  );
  const config = formConfigs.find((item) => item.formType === "ce")!;
  const ticket = normalizeSubmission(payload, config, "CE-0002");
  assert.equal(ticket.options.existingLauncherName, "");
  assert.equal(ticket.options.launcherScreenshotUrl, "");
});

test("normalizes current live-form labels and matrix selections when keys change", () => {
  const config = formConfigs.find((item) => item.formType === "evo")!;
  const payload: TallyWebhookPayload = {
    data: {
      submissionId: "live-shape-test", formId: "Ek7G8A", fields: [
        { key: "live-first", label: "First Name", value: "Taylor" },
        { key: "live-grade", label: "Grade Level", value: ["junior"], options: [{ id: "junior", text: "Junior" }] },
        { key: "live-games", label: "Games for TI-84 Evo", type: "MATRIX", value: { snake: ["yes"], tetris: ["no"] }, rows: [{ id: "snake", text: "Snake" }, { id: "tetris", text: "Tetris" }], columns: [{ id: "yes", text: "Yes" }, { id: "no", text: "No" }] },
        { key: "live-programs", label: "Math Programs for TI-84 Evo", type: "MATRIX", value: { quadratic: ["yes"] }, rows: [{ id: "quadratic", text: "Quadratic Formula" }], columns: [{ id: "yes", text: "Yes" }, { id: "no", text: "No" }] }
      ]
    }
  };
  const ticket = normalizeSubmission(payload, config, "EVO-LIVE-0001");
  assert.equal(ticket.person.firstName, "Taylor");
  assert.equal(ticket.person.grade, "Junior");
  assert.deepEqual(ticket.games, ["Snake"]);
  assert.deepEqual(ticket.programs, ["Quadratic Formula"]);
});
