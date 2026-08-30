import "./env.js";
import { resolve } from "node:path";
import { TicketApi } from "./api.js";
import { log } from "./log.js";
import { syncPending } from "./sync.js";
import { readNumbersStatuses } from "./numbers.js";

const apiUrl = process.env.SYNC_API_URL || "http://127.0.0.1:8787";
const apiSecret = process.env.API_SECRET;
const configuredPath = process.env.NUMBERS_DOCUMENT_PATH;
const dryRun = process.env.DRY_RUN !== "false";
const watch = process.argv.includes("--watch");
const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const ticketId = positional[0];

if (!apiSecret) throw new Error("API_SECRET is required by the Mac sync agent");
if (!configuredPath && !dryRun) throw new Error("NUMBERS_DOCUMENT_PATH is required when DRY_RUN=false");

const api = new TicketApi(apiUrl, apiSecret);
const documentPath = resolve(configuredPath || "TI Tickets.numbers");
let running = false;

async function runOnce(): Promise<void> {
  if (running) return;
  running = true;
  try {
    if (!dryRun && process.env.SYNC_NUMBERS_STATUSES !== "false") {
      try {
        const statuses = await readNumbersStatuses(documentPath);
        for (const item of statuses) await api.updateStatus(item.ticketId, item.status);
        if (statuses.length) log.info("Reconciled Numbers statuses", `tickets=${statuses.length}`);
      } catch (error) {
        log.warn("Could not reconcile Numbers statuses", `error=${JSON.stringify(String(error))}`);
      }
    }
    const result = await syncPending({ api, documentPath, dryRun, ticketId, force: !watch });
    if (result.processed || result.failed) log.info("Sync pass finished", `processed=${result.processed} failed=${result.failed}`);
  } catch (error) {
    log.warn("Sync server unavailable; will retry", `error=${JSON.stringify(String(error))}`);
    if (!watch) process.exitCode = 1;
  } finally {
    running = false;
  }
}

await runOnce();
if (watch) {
  const intervalSeconds = Math.max(30, Number(process.env.SYNC_INTERVAL_SECONDS || 45));
  log.info("Mac sync agent watching", `intervalSeconds=${intervalSeconds} dryRun=${dryRun}`);
  setInterval(runOnce, intervalSeconds * 1000);
}
