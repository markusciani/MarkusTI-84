import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { PendingTicketRecord } from "@ti-tickets/shared";
import { log } from "./log.js";
import { buildDetailRow, buildMasterRow } from "./rows.js";

const scriptPath = fileURLToPath(new URL("../applescript/numbers.applescript", import.meta.url));
const statusScriptPath = fileURLToPath(new URL("../applescript/read-statuses.applescript", import.meta.url));

function runAppleScript(args: string[], path = scriptPath): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/osascript", [path, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim() || `osascript exited ${code}`)));
  });
}

const STATUS_ALIASES: Record<string, string> = {
  "NEW": "New", "ACCEPTED": "Accepted", "REJECTED": "Rejected",
  "WAITING FOR CALCULATOR": "Waiting for Calculator", "WAIT CALC": "Waiting for Calculator",
  "WORKING": "Working", "WAITING FOR USER": "Waiting for User", "WAIT USER": "Waiting for User",
  "READY FOR DELIVERY": "Ready for Delivery", "READY": "Ready for Delivery",
  "COMPLETED": "Completed", "DONE": "Completed", "CANCELLED": "Cancelled", "CANCELED": "Cancelled"
};

export async function readNumbersStatuses(documentPath: string): Promise<Array<{ ticketId: string; status: string }>> {
  await access(documentPath);
  const output = await runAppleScript([documentPath, "All Tickets", "Tickets"], statusScriptPath);
  if (!output) return [];
  return output.split("\n").flatMap((line) => {
    const separator = line.indexOf("\t");
    if (separator < 1) return [];
    const ticketId = line.slice(0, separator).trim().toUpperCase();
    const status = STATUS_ALIASES[line.slice(separator + 1).trim().toUpperCase()];
    return ticketId && status ? [{ ticketId, status }] : [];
  });
}

async function writeTable(documentPath: string, sheet: string, table: string, row: Record<string, string>): Promise<string> {
  const pairs = Object.entries(row).flatMap(([header, value]) => [header, value]);
  return runAppleScript([documentPath, sheet, table, row["Ticket ID"], ...pairs]);
}

export async function syncToNumbers(record: PendingTicketRecord, documentPath: string, dryRun: boolean): Promise<void> {
  const master = buildMasterRow(record);
  const detail = buildDetailRow(record);
  if (dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      ticket: record.ticketId,
      targets: [
        { sheet: record.numbers.masterSheet, table: record.numbers.masterTable, fields: master },
        { sheet: record.numbers.sheet, table: record.numbers.table, fields: detail }
      ]
    }, null, 2));
    return;
  }

  await access(documentPath);
  log.info("Numbers sync started", `ticketId=${record.ticketId}`);
  const masterResult = await writeTable(documentPath, record.numbers.masterSheet, record.numbers.masterTable, master);
  log.info(masterResult === "EXISTS" ? "Master row already exists" : "Master row created", `ticketId=${record.ticketId}`);
  const detailResult = await writeTable(documentPath, record.numbers.sheet, record.numbers.table, detail);
  log.info(detailResult === "EXISTS" ? "Calculator row already exists" : "Calculator row created", `ticketId=${record.ticketId}`);
}
