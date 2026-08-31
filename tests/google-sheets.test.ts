import assert from "node:assert/strict";
import test from "node:test";
import { mapGoogleSheetRows } from "../server/src/googleSheets/mapper.js";
import { googleSheetSources } from "../server/src/googleSheets/sources.js";

test("maps private Sheet rows without retaining signature or upload URLs", () => {
  const source = googleSheetSources.find((item) => item.key === "evo")!;
  const rows = [[
    "Submission ID", "Submitted at", "First Name", "Phone Number", "Email Address", "Version Number",
    "Games for TI-84 Evo [Snake]", "Math Programs for TI-84 Evo [Quadratic Formula]",
    "How would you like us to return your calculator?", "Signature", "Upload"
  ], [
    "submission-1", "2026-08-30T12:00:00Z", "Student", "555-0100", "student@example.com", "1.2", "Yes", "Yes",
    "Pickup", "https://private/signature", "https://private/upload"
  ]];
  const [ticket] = mapGoogleSheetRows(source, rows);
  assert.equal(ticket.person.firstName, "Student");
  assert.deepEqual(ticket.games, ["Snake"]);
  assert.deepEqual(ticket.programs, ["Quadratic Formula"]);
  assert.deepEqual(ticket.files, []);
  assert.equal(JSON.stringify(ticket).includes("https://private"), false);
});

test("ignores a Sheet with headers and no submissions", () => {
  const source = googleSheetSources.find((item) => item.key === "plus")!;
  assert.deepEqual(mapGoogleSheetRows(source, [["Submission ID", "First Name"]]), []);
});
