import assert from "node:assert/strict";
import test from "node:test";
import { filterTickets } from "../server/src/calculator/filters.js";
import { calculatorSafeText, shortStatus, validProgramName, wrapCalculatorText } from "../server/src/calculator/formatter.js";
import { buildProgram } from "../server/src/calculator/programBuilder.js";
import type { CalculatorTicket, GenerateProgramRequest } from "../server/src/calculator/types.js";

const tickets: CalculatorTicket[] = [
  {
    id: 1, ticketId: "EVO-0042", firstName: "José 😀", phone: "555-0100", email: "jose@example.com",
    calculator: "TI-84 Evo", status: "Ready for Delivery", games: ["Pokémon", "Snake", "Tetris"],
    programs: ["Quadratic Formula", "Radical Simplifier"], delivery: "Before school", submittedAt: "2026-08-30T20:30:00.000Z"
  },
  {
    id: 2, ticketId: "CE-0042", firstName: "Alex", phone: "555-0101", email: "alex@example.com",
    calculator: "TI-84 Plus CE Python", status: "Working", games: ["Wordle"], programs: [],
    delivery: "Lunch", submittedAt: "2026-08-29T18:00:00.000Z"
  },
  {
    id: 3, ticketId: "EVO-0043", firstName: "Sam", phone: "", email: "",
    calculator: "TI-84 Evo", status: "New", games: [], programs: [],
    delivery: "After school", submittedAt: "2026-08-31T18:00:00.000Z"
  }
];

const request: GenerateProgramRequest = {
  calculator: "TI-84 Evo",
  format: "ti-basic",
  programName: "TILOGS",
  filters: { limit: 20, sort: "newest" },
  fields: {
    ticketId: true, firstName: true, calculator: true, status: true, games: true,
    programs: true, delivery: true, submittedDate: true, phone: false, email: false
  }
};

test("calculator-safe formatter removes unsupported text and enforces program names", () => {
  assert.equal(calculatorSafeText("Pokémon 😀 “Blue”"), "POKEMON 'BLUE'");
  assert.equal(calculatorSafeText("SAFE! {NOT} \\ TEXT"), "SAFE NOT TEXT");
  assert.equal(shortStatus("Waiting for Calculator"), "WAIT CALC");
  assert.equal(shortStatus("Ready for Delivery"), "READY");
  assert.equal(validProgramName("42 logs"), "P42LOGS");
  assert.equal(validProgramName("really-long-name"), "REALLYLO");
  assert.ok(wrapCalculatorText("A VERY LONG GAME NAME", 8).every((line) => line.length <= 8));
});

test("filters calculator, status, date, ID range, order, and limit", () => {
  assert.deepEqual(filterTickets(tickets, { statuses: ["Ready for Delivery"] }).map((ticket) => ticket.ticketId), ["EVO-0042"]);
  assert.deepEqual(filterTickets(tickets, { calculator: "TI-84 Evo", sort: "oldest", limit: 1 }).map((ticket) => ticket.ticketId), ["EVO-0042"]);
  assert.deepEqual(filterTickets(tickets, { dateFrom: "2026-08-30", ticketIdFrom: "EVO-0042", ticketIdTo: "EVO-0043", sort: "ticket-id" }).map((ticket) => ticket.ticketId), ["EVO-0042", "EVO-0043"]);
});

test("generates menu, ticket navigation, numeric search, stats, and privacy-safe TI-BASIC", () => {
  const result = buildProgram(request, tickets);
  assert.equal(result.programName, "TILOGS");
  assert.equal(result.ticketCount, 3);
  assert.match(result.source, /:Menu\("TI TICKET LOGS"/);
  assert.match(result.source, /:Repeat K=24 or K=26 or K=45/);
  assert.match(result.source, /:Lbl Z\n:Goto M/);
  assert.match(result.source, /:Input "TICKET NUMBER:",N/);
  assert.match(result.source, /:If N=42\n:Then\n:\{2,3\}→L₁|:If N=42\n:Then\n:\{1,2\}→L₁/);
  assert.match(result.source, /:Disp "READY: 1"/);
  assert.match(result.source, /POKEMON/);
  assert.doesNotMatch(result.source, /555-0100|JOSE@EXAMPLE\.COM/);
  assert.ok(result.estimatedBytes > 0);
});

test("advanced phone and email fields are included only when explicitly enabled", () => {
  const result = buildProgram({ ...request, fields: { ...request.fields, phone: true, email: true } }, [tickets[0]]);
  assert.match(result.source, /PHONE: 555-0100/);
  assert.match(result.source, /EMAIL:/);
  assert.match(result.source, /JOSE@EXAMPLE\.COM/);
});
