import type { CalculatorModel } from "../models.js";
import { calculatorSafeText, shortStatus, ticketNumber, validProgramName, wrapCalculatorText } from "../formatter.js";
import type { BuilderFields, CalculatorTicket, ProgramBuildResult, ProgramOptions } from "../types.js";

const DEFAULT_MENU = { tickets: "Tickets", search: "Search", stats: "Stats", system: "System", quit: "Quit" };
const BUILDER_PASSWORD = "C1@nI-0I-Ti_84";

function enabled(fields: BuilderFields, key: keyof BuilderFields, fallback = true): boolean {
  return fields[key] ?? fallback;
}

function sourceString(value: unknown, width = 26): string {
  return calculatorSafeText(value, width).replace(/"/g, "'");
}

function displayScreen(title: string, lines: string[], backLabel: string, rows: number): string[] {
  const available = Math.max(1, rows - 2);
  return [
    ":ClrHome", `:Disp "${sourceString(title)}"`,
    ...lines.slice(0, available).map((line) => `:Disp "${sourceString(line)}"`),
    ":Pause ", `:Goto ${backLabel}`
  ];
}

function createLabelAllocator() {
  let value = 0;
  return () => {
    if (value >= 26 * 26) throw new Error("Program contains too many generated menu sections");
    const label = String.fromCharCode(65 + Math.floor(value / 26)) + String.fromCharCode(65 + (value % 26));
    value += 1;
    return label;
  };
}

function menuLine(title: string, items: Array<[string, string]>): string {
  return `:Menu("${sourceString(title)}",${items.map(([name, label]) => `"${sourceString(name, 20)}",${label}`).join(",")})`;
}

function ticketListName(ticket: CalculatorTicket, showFirstName: boolean): string {
  return showFirstName && ticket.firstName ? `${ticket.ticketId} ${ticket.firstName}` : ticket.ticketId;
}

function textPages(values: string[], width: number, linesPerPage: number): string[][] {
  const lines = values.length ? wrapCalculatorText(values.join(", "), width, 1000) : ["None requested"];
  return Array.from({ length: Math.ceil(lines.length / linesPerPage) }, (_, page) =>
    lines.slice(page * linesPerPage, page * linesPerPage + linesPerPage));
}

function detailPages(ticket: CalculatorTicket, fields: BuilderFields, width: number, linesPerPage: number): string[][] {
  const details: string[] = [];
  if (enabled(fields, "phone", true)) details.push(`Phone: ${ticket.phone || "None"}`);
  if (enabled(fields, "email", true)) details.push(`Email: ${ticket.email || "None"}`);
  if (enabled(fields, "details")) {
    const add = (label: string, value: string | undefined) => { if (value?.trim()) details.push(`${label}: ${value}`); };
    add("Grade", ticket.grade);
    add("Version", ticket.version);
    add("Python", ticket.python);
    add("Case", ticket.caseIncluded);
    add("Charger", ticket.chargerIncluded);
    add("Clean case", ticket.cleanCase);
    add("Background", ticket.background);
    add("Date/time", ticket.dateTimeCurrent);
    add("Launcher", ticket.gameLauncherMethod);
    add("Launcher app", ticket.existingLauncherName);
    add("Remove apps", ticket.appsToRemove);
    add("Remove programs", ticket.programsToRemove);
  }
  const lines = (details.length ? details : ["No extra details"]).flatMap((line) => wrapCalculatorText(line, width, 100));
  return Array.from({ length: Math.ceil(lines.length / linesPerPage) }, (_, page) =>
    lines.slice(page * linesPerPage, page * linesPerPage + linesPerPage));
}

function pagedText(input: { title: string; pages: string[][]; pageLabels: string[]; returnLabel: string }): string[] {
  return input.pages.flatMap((lines, page) => [
    `:Lbl ${input.pageLabels[page]}`,
    ":ClrHome",
    `:Disp "${sourceString(`${input.title} ${page + 1}/${input.pages.length}`)}"`,
    ...lines.map((line) => `:Disp "${sourceString(line)}"`),
    ":Pause ",
    `:Goto ${page + 1 < input.pages.length ? input.pageLabels[page + 1] : input.returnLabel}`
  ]);
}

export function generateTiBasic(input: {
  model: CalculatorModel;
  programName: string;
  tickets: CalculatorTicket[];
  fields: BuilderFields;
  options?: ProgramOptions;
}): ProgramBuildResult {
  const { model, tickets, fields } = input;
  const programName = validProgramName(input.programName, model.programNameMaxLength);
  const title = sourceString(input.options?.title || "TI Ticket Logs");
  const configuredMenu = input.options?.menuLabels || {};
  const menu = {
    tickets: sourceString(configuredMenu.all || DEFAULT_MENU.tickets),
    search: sourceString(configuredMenu.search || DEFAULT_MENU.search),
    stats: sourceString(configuredMenu.stats || DEFAULT_MENU.stats),
    system: sourceString(configuredMenu.about || DEFAULT_MENU.system),
    quit: sourceString(configuredMenu.exit || DEFAULT_MENU.quit)
  };
  const allocate = createLabelAllocator();
  const ticketMenuLabels = tickets.map(() => allocate());
  const overviewLabels = tickets.map(() => allocate());
  const deliveryLabels = tickets.map(() => allocate());
  const listPages = Array.from({ length: Math.max(1, Math.ceil(tickets.length / 4)) }, () => allocate());
  const linesPerPage = Math.max(1, model.displayRows - 2);
  const gameTextPages = tickets.map((ticket) => textPages(ticket.games, model.displayColumns, linesPerPage));
  const gamePages = gameTextPages.map((pages) => Array.from({ length: pages.length }, () => allocate()));
  const programTextPages = tickets.map((ticket) => textPages(ticket.programs, model.displayColumns, linesPerPage));
  const programPages = programTextPages.map((pages) => Array.from({ length: pages.length }, () => allocate()));
  const ticketDetailPages = tickets.map((ticket) => detailPages(ticket, fields, model.displayColumns, linesPerPage));
  const detailsPages = ticketDetailPages.map((pages) => Array.from({ length: pages.length }, () => allocate()));
  const systemPage = allocate();

  const source: string[] = [
    ":Lbl M",
    menuLine(title, [[menu.tickets, "A"], [menu.search, "S"], [menu.stats, "T"], [menu.system, "B"], [menu.quit, "X"]]),
    ":Lbl A",
    tickets.length ? `:Goto ${listPages[0]}` : ":ClrHome",
    ...(!tickets.length ? [':Disp "No tickets"', ":Pause ", ":Goto M"] : [])
  ];

  for (let page = 0; page < listPages.length && tickets.length; page += 1) {
    const start = page * 4;
    const pageTickets = tickets.slice(start, start + 4);
    const items: Array<[string, string]> = pageTickets.map((ticket, index) => [ticketListName(ticket, enabled(fields, "firstName")), ticketMenuLabels[start + index]]);
    if (listPages.length > 1) {
      items.push(["Next", page + 1 < listPages.length ? listPages[page + 1] : "M"]);
      items.push(["Previous", page > 0 ? listPages[page - 1] : "M"]);
    }
    items.push(["Main menu", "M"]);
    source.push(`:Lbl ${listPages[page]}`, menuLine(`Tickets ${page + 1}/${listPages.length}`, items));
  }

  tickets.forEach((ticket, index) => {
    const ticketMenu = ticketMenuLabels[index];
    const sections: Array<[string, string]> = [["Overview", overviewLabels[index]]];
    if (enabled(fields, "games")) sections.push(["Games", gamePages[index][0]]);
    if (enabled(fields, "programs")) sections.push(["Programs", programPages[index][0]]);
    if (enabled(fields, "delivery")) sections.push(["Delivery", deliveryLabels[index]]);
    if (enabled(fields, "phone", true) || enabled(fields, "email", true) || enabled(fields, "details")) sections.push(["Details", detailsPages[index][0]]);
    sections.push(["Back", listPages[Math.floor(index / 4)]]);
    source.push(`:Lbl ${ticketMenu}`, menuLine(ticket.ticketId, sections));

    const overview: string[] = [];
    if (enabled(fields, "firstName")) overview.push(`Name: ${ticket.firstName || "None"}`);
    if (enabled(fields, "calculator")) overview.push(`Model: ${ticket.calculator || "Unknown"}`);
    if (enabled(fields, "status")) overview.push(`Status: ${shortStatus(ticket.status)}`);
    if (enabled(fields, "submittedDate")) overview.push(`Date: ${ticket.submittedAt.slice(0, 10)}`);
    source.push(`:Lbl ${overviewLabels[index]}`, ...displayScreen(ticket.ticketId, overview, ticketMenu, model.displayRows));
    source.push(...pagedText({ title: "Games", pages: gameTextPages[index], pageLabels: gamePages[index], returnLabel: ticketMenu }));
    source.push(...pagedText({ title: "Programs", pages: programTextPages[index], pageLabels: programPages[index], returnLabel: ticketMenu }));

    const delivery = wrapCalculatorText(ticket.delivery || "No delivery option", model.displayColumns, model.displayRows - 2);
    source.push(`:Lbl ${deliveryLabels[index]}`, ...displayScreen("Delivery", delivery, ticketMenu, model.displayRows));
    source.push(...pagedText({ title: "Details", pages: ticketDetailPages[index], pageLabels: detailsPages[index], returnLabel: ticketMenu }));
  });

  source.push(":Lbl S", ":ClrHome", ':Input "Ticket number:",N');
  const groupedNumbers = new Map<number, number[]>();
  const duplicateSearchMenus: string[] = [];
  tickets.forEach((ticket, index) => {
    const number = ticketNumber(ticket.ticketId);
    if (number !== undefined) groupedNumbers.set(number, [...(groupedNumbers.get(number) || []), index]);
  });
  for (const [number, indexes] of groupedNumbers) {
    if (indexes.length === 1) {
      source.push(`:If N=${number}`, `:Goto ${ticketMenuLabels[indexes[0]]}`);
    } else {
      const resultLabel = allocate();
      source.push(`:If N=${number}`, `:Goto ${resultLabel}`);
      duplicateSearchMenus.push(`:Lbl ${resultLabel}`,
        menuLine(`TICKET ${number}`, [
          ...indexes.map((index) => [ticketListName(tickets[index], enabled(fields, "firstName")), ticketMenuLabels[index]] as [string, string]),
          ["Back", "S"]
        ]));
    }
  }
  source.push(':Disp "Ticket not found"', ":Pause ", ":Goto M", ...duplicateSearchMenus);

  const totalGames = tickets.reduce((total, ticket) => total + ticket.games.length, 0);
  const totalPrograms = tickets.reduce((total, ticket) => total + ticket.programs.length, 0);
  const evo = tickets.filter((ticket) => ticket.ticketId.startsWith("EVO-")).length;
  const ce = tickets.filter((ticket) => ticket.ticketId.startsWith("CE-")).length;
  const plus = tickets.filter((ticket) => ticket.ticketId.startsWith("PLUS-")).length;
  source.push(
    ":Lbl T",
    ...displayScreen("Ticket stats", [
      `Total: ${tickets.length}`, `Evo: ${evo}`, `Plus CE: ${ce}`, `Plus/83: ${plus}`,
      `Games: ${totalGames}`, `Programs: ${totalPrograms}`
    ], "M", model.displayRows)
  );

  source.push(
    ":Lbl B", ":ClrHome", ':Input "Admin PIN:",Z', `:If Z=2010`, `:Goto ${systemPage}`,
    ':Disp "Incorrect PIN"', ":Pause ", ":Goto M",
    `:Lbl ${systemPage}`,
    ...displayScreen("System", ["https://", "ti-ticket-builder", ".pages.dev", "Password:", BUILDER_PASSWORD], "M", model.displayRows),
    ":Lbl X", ":ClrHome", ":Stop"
  );

  const sourceText = source.join("\n") + "\n";
  const estimatedBytes = Buffer.byteLength(sourceText, "utf8") + 16;
  const warning = estimatedBytes > model.recommendedProgramBytes
    ? `Estimated source exceeds the recommended ${Math.round(model.recommendedProgramBytes / 1024)} KB snapshot size for ${model.label}. Reduce tickets or fields.`
    : undefined;
  const first = tickets[0];
  return {
    programName,
    format: "ti-basic",
    fileName: `${programName}.txt`,
    mimeType: "text/plain; charset=utf-8",
    source: sourceText,
    estimatedBytes,
    estimatedKilobytes: Math.round((estimatedBytes / 1024) * 10) / 10,
    ticketCount: tickets.length,
    warning,
    preview: {
      title,
      menuItems: Object.values(menu),
      firstTicket: first ? {
        ticketId: first.ticketId,
        lines: [
          ...(enabled(fields, "firstName") ? [`Name: ${first.firstName}`] : []),
          ...(enabled(fields, "calculator") ? [`Model: ${first.calculator}`] : []),
          ...(enabled(fields, "status") ? [`Status: ${shortStatus(first.status)}`] : [])
        ]
      } : undefined
    }
  };
}
