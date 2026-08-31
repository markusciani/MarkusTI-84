import { randomBytes } from "node:crypto";
import { chmodSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashBuilderPassword } from "../src/security.js";

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
const password = Buffer.concat(chunks).toString("utf8").trimEnd();
if (!password) throw new Error("Provide the builder password on standard input");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const numbersPath = resolve(homedir(), "Documents/TI Tickets.numbers");
const secret = () => randomBytes(32).toString("base64url");
const contents = [
  "PORT=8787", "HOST=127.0.0.1", "DATABASE_PATH=./data/ti-tickets.sqlite",
  `API_SECRET=${secret()}`, `BUILDER_PASSWORD_HASH=${hashBuilderPassword(password)}`,
  `BUILDER_SESSION_SECRET=${secret()}`, "TALLY_WEBHOOK_SECRET=", "WEBHOOK_PATH_TOKEN=",
  "ALLOW_INSECURE_WEBHOOKS=true", "TALLY_EVO_FORM_ID=", "TALLY_CE_FORM_ID=", "TALLY_PLUS_FORM_ID=",
  "SYNC_API_URL=http://127.0.0.1:8787", "SYNC_INTERVAL_SECONDS=45",
  `NUMBERS_DOCUMENT_PATH=${numbersPath}`, "DRY_RUN=false", "SYNC_NUMBERS_STATUSES=true",
  "WEB_APP_ORIGIN=https://ti-ticket-builder.pages.dev", "LOG_LEVEL=info", ""
].join("\n");
const path = resolve(root, ".env");
writeFileSync(path, contents, { mode: 0o600 });
chmodSync(path, 0o600);
process.stdout.write("[INFO] Local secrets and runtime configuration created\n");
