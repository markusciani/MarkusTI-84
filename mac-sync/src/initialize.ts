import "./env.js";
import { spawn } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tableSchemas } from "./tableSchemas.js";

const configuredPath = process.env.NUMBERS_DOCUMENT_PATH;
if (!configuredPath) throw new Error("NUMBERS_DOCUMENT_PATH is required for numbers:init");
const documentPath = resolve(configuredPath);
const scriptPath = fileURLToPath(new URL("../applescript/ensure-table.applescript", import.meta.url));
await mkdir(dirname(documentPath), { recursive: true });
let exists = true;
try { await stat(documentPath); } catch { exists = false; }

function ensureTable(sheet: string, table: string, headers: readonly string[], reuseDefault: boolean): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("/usr/bin/osascript", [
      scriptPath, documentPath, sheet, table, reuseDefault ? "true" : "false", ...headers
    ], { stdio: ["ignore", "inherit", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolvePromise() : reject(new Error(stderr.trim() || `osascript exited ${code}`)));
  });
}

for (const [index, schema] of tableSchemas.entries()) {
  await ensureTable(schema.sheet, schema.table, schema.headers, !exists && index === 0);
  console.log(`[INFO] Ensured ${schema.sheet} / ${schema.table}`);
}
console.log(`[INFO] Numbers document ready at ${documentPath}`);
