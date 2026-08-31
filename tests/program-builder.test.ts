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
    programs: ["Quadratic Formula", "Radical Simplifier"], delivery: "Before school", submittedAt: "2026-08-30T20:30:00.000Z",
    grade: "10", version: "7.0", python: "Yes", caseIncluded: "Yes", chargerIncluded: "No",
    cleanCase: "Yes", background: "Blue mountains"
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
  assert.equal(calculatorSafeText("Pokémon 😀 “Blue”"), "Pokemon 'Blue'");
  assert.equal(calculatorSafeText("SAFE! {NOT} \\ TEXT"), "SAFE NOT TEXT");
  assert.equal(shortStatus("Waiting for Calculator"), "Wait Calc");
  assert.equal(shortStatus("Ready for Delivery"), "Ready");
  assert.equal(validProgramName("42 logs"), "P42LOGS");
  assert.equal(validProgramName("really-long-name"), "REALLYLO");
  assert.ok(wrapCalculatorText("A VERY LONG GAME NAME", 8).every((line) => line.length <= 8));
});

test("filters calculator, status, date, ID range, order, and limit", () => {
  assert.deepEqual(filterTickets(tickets, { statuses: ["Ready for Delivery"] }).map((ticket) => ticket.ticketId), ["EVO-0042"]);
  assert.deepEqual(filterTickets(tickets, { calculator: "TI-84 Evo", sort: "oldest", limit: 1 }).map((ticket) => ticket.ticketId), ["EVO-0042"]);
  assert.deepEqual(filterTickets(tickets, { dateFrom: "2026-08-30", ticketIdFrom: "EVO-0042", ticketIdTo: "EVO-0043", sort: "ticket-id" }).map((ticket) => ticket.ticketId), ["EVO-0042", "EVO-0043"]);
});

test("generates five-item main menu, ticket submenus, search, stats, system, and privacy-safe TI-BASIC", () => {
  const result = buildProgram(request, tickets);
  assert.equal(result.programName, "TILOGS");
  assert.equal(result.ticketCount, 3);
  assert.match(result.source, /:Menu\("TI Ticket Logs","Tickets",A,"Search",S,"Stats",T,"System",B,"Quit",X\)/);
  assert.doesNotMatch(result.source, /"New",|"Working",|"Completed",/);
  assert.match(result.source, /:Menu\("Tickets 1\/1","EVO-0043 Sam",[A-Z]{2},"EVO-0042 Jose",[A-Z]{2},"CE-0042 Alex",[A-Z]{2},"Main menu",M\)/);
  assert.match(result.source, /:Menu\("EVO-0042","Overview",[A-Z]{2},"Games",[A-Z]{2},"Programs",[A-Z]{2},"Delivery",[A-Z]{2},"Details",[A-Z]{2},"Back",[A-Z]{2}\)/);
  assert.match(result.source, /:Disp "Games 1\/1"\n:Disp "Pokemon, Snake, Tetris"\n:Pause \n:Goto [A-Z]{2}/);
  assert.doesNotMatch(result.source, /:Menu\("Games/);
  assert.match(result.source, /:Disp "Programs 1\/1"\n:Disp "Quadratic Formula, Radical"\n:Disp "Simplifier"\n:Pause /);
  assert.doesNotMatch(result.source, /:Menu\("Programs/);
  assert.match(result.source, /:Disp "Clean case: Yes"/);
  assert.match(result.source, /:Disp "Background: Blue mountains"/);
  assert.match(result.source, /:Input "Ticket number:",N/);
  assert.match(result.source, /:If N=42\n:Goto [A-Z]{2}/);
  assert.match(result.source, /:Disp "Ticket not found"\n:Pause \n:Goto M\n:Lbl [A-Z]{2}\n:Menu\("TICKET 42"/);
  assert.match(result.source, /:Disp "Ticket stats"/);
  assert.doesNotMatch(result.source, /READY:|WORKING:|COMPLETED:/);
  assert.doesNotMatch(result.source, /About TILOGS|Purpose|Privacy|Refresh data|Controls|Preferences/);
  assert.match(result.source, /:Input "Admin PIN:",Z\n:If Z=2010/);
  assert.match(result.source, /:Disp "System"/);
  assert.match(result.source, /:Disp "https:\/\/"\n:Disp "ti-ticket-builder"\n:Disp "\.pages\.dev"\n:Disp "Password:"\n:Disp "C1@nI-0I-Ti_84"/);
  assert.doesNotMatch(result.source, /555-0100|jose@example\.com/i);
  assert.ok(result.estimatedBytes > 0);
});

test("games and programs use the full display as plain text before advancing pages", () => {
  const manyGames = Array.from({ length: 24 }, (_, index) => `Game title ${index + 1}`);
  const manyPrograms = Array.from({ length: 24 }, (_, index) => `Program title ${index + 1}`);
  const result = buildProgram(request, [{ ...tickets[0], games: manyGames, programs: manyPrograms }]);
  const gamesPage = result.source.match(/:Disp "Games 1\/\d+"\n([\s\S]*?):Pause /)?.[1] || "";
  const programsPage = result.source.match(/:Disp "Programs 1\/\d+"\n([\s\S]*?):Pause /)?.[1] || "";
  assert.equal((gamesPage.match(/:Disp /g) || []).length, 8);
  assert.equal((programsPage.match(/:Disp /g) || []).length, 8);
  assert.doesNotMatch(result.source, /:Menu\("Games|:Menu\("Programs/);
});

test("phone, email, and service details appear together when enabled", () => {
  const result = buildProgram({ ...request, fields: { ...request.fields, phone: true, email: true } }, [tickets[0]]);
  assert.match(result.source, /Phone: 555-0100/);
  assert.match(result.source, /Email:/);
  assert.match(result.source, /jose@example\.com/);
  assert.match(result.source, /Version: 7\.0/);
  assert.match(result.source, /Case: Yes/);
  assert.match(result.source, /Charger: No/);
});
