import "./env.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { findFormConfig } from "./config/forms.js";
import { normalizeSubmission } from "./tally/normalize.js";
import { isTallyWebhookPayload } from "./tally/types.js";

const fixturePath = process.argv[2];
if (!fixturePath) throw new Error("Usage: npm run fixture:preview -- fixtures/tally-evo.json");
const payload: unknown = JSON.parse(readFileSync(resolve(fixturePath), "utf8"));
if (!isTallyWebhookPayload(payload)) throw new Error("Fixture is not a valid Tally webhook payload");
const config = findFormConfig(payload.data.formId);
if (!config) throw new Error(`No active form configuration for ${payload.data.formId}`);
console.log(JSON.stringify(normalizeSubmission(payload, config, `${config.ticketPrefix}-PREVIEW`), null, 2));
