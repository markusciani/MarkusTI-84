import "../src/env.js";
import { openDatabase } from "../src/database/db.js";
import { formConfigs } from "../src/config/forms.js";
import { mapGoogleSheetRows } from "../src/googleSheets/mapper.js";
import { googleSheetSources } from "../src/googleSheets/sources.js";
import { TicketService } from "../src/tickets/ticketService.js";
import { createInterface } from "node:readline";

const inputLine = await new Promise<string>((resolvePromise) => {
  const lines = createInterface({ input: process.stdin, terminal: false });
  lines.once("line", (line) => { lines.close(); resolvePromise(line); });
});
const input = JSON.parse(inputLine) as Array<{ values?: unknown[][]; result?: { values?: unknown[][] } }>;
const db = openDatabase();
const service = new TicketService(db, formConfigs);
let imported = 0;
let duplicates = 0;
for (const [index, source] of googleSheetSources.entries()) {
  const values = input[index]?.values || input[index]?.result?.values || [];
  for (const ticket of mapGoogleSheetRows(source, values)) {
    const result = service.importNormalized(ticket, source.ticketPrefix);
    result.duplicate ? duplicates++ : imported++;
  }
}
db.close();
process.stdout.write(JSON.stringify({ imported, duplicates }));
