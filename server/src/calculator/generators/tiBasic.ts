import type { CalculatorModel } from "../models.js";
import { calculatorSafeText, shortStatus, ticketNumber, validProgramName, wrapCalculatorText } from "../formatter.js";
import type { BuilderFields, CalculatorTicket, ProgramBuildResult, ProgramOptions } from "../types.js";

const DEFAULT_MENU = {
  all: "ALL TICKETS", new: "NEW", working: "WORKING", ready: "READY",
  completed: "COMPLETED", search: "SEARCH", stats: "STATS", about: "ABOUT", exit: "EXIT"
};

function enabled(fields: BuilderFields, key: keyof BuilderFields, fallback = true): boolean {
  return fields[key] ?? fallback;
}

function ticketLines(ticket: CalculatorTicket, fields: BuilderFields, width: number): string[] {
  const lines: string[] = [];
  const add = (label: string, value: unknown) => {
    const wrapped = wrapCalculatorText(value, Math.max(1, width - label.length), 4);
    if (!wrapped.length) return;
    lines.push(`${label}${wrapped[0]}`.slice(0, width), ...wrapped.slice(1));
  };
  if (enabled(fields, "firstName")) add("NAME: ", ticket.firstName);
  if (enabled(fields, "calculator")) add("MODEL: ", ticket.calculator);
  if (enabled(fields, "status")) add("STATUS: ", shortStatus(ticket.status));
  if (enabled(fields, "games")) {
    lines.push("GAMES:");
    lines.push(...(ticket.games.length ? ticket.games.flatMap((game) => wrapCalculatorText(game, width, 3)) : ["NONE"]));
  }
  if (enabled(fields, "programs")) {
    lines.push("PROGRAMS:");
    lines.push(...(ticket.programs.length ? ticket.programs.flatMap((program) => wrapCalculatorText(program, width, 3)) : ["NONE"]));
  }
  if (enabled(fields, "delivery")) add("DELIVERY: ", ticket.delivery);
  if (enabled(fields, "submittedDate")) add("DATE: ", ticket.submittedAt.slice(0, 10));
  if (enabled(fields, "phone", false)) add("PHONE: ", ticket.phone);
  if (enabled(fields, "email", false)) add("EMAIL: ", ticket.email);
  return lines.length ? lines : ["NO FIELDS SELECTED"];
}

function sourceString(value: string, width = 26): string {
  return calculatorSafeText(value, width).replace(/"/g, "'");
}

function outputLine(row: number, text: string): string {
  return `:Output(${row},1,"${sourceString(text)}")`;
}

function listLiteral(indexes: number[]): string {
  return `{${indexes.join(",")}}`;
}

function statusIndexes(tickets: CalculatorTicket[], status: string): number[] {
  return tickets.flatMap((ticket, index) => ticket.status === status ? [index + 1] : []);
}

function viewStart(label: string, indexes: number[], emptyMessage: string): string[] {
  const lines = [`:Lbl ${label}`];
  if (!indexes.length) {
    lines.push(":ClrHome", `:Disp "${sourceString(emptyMessage)}"`, ":Pause ", ":Goto M");
  } else {
    lines.push(`:${listLiteral(indexes)}→L₁`, ":1→P", ":1→Q", ":Goto V");
  }
  return lines;
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
  const title = sourceString(input.options?.title || "TI TICKET LOGS");
  const footer = sourceString(input.options?.footer || "<> MOVE CLEAR BACK");
  const about = input.options?.aboutText || "TICKET SNAPSHOT - NO NETWORK REQUIRED";
  const menu = { ...DEFAULT_MENU, ...input.options?.menuLabels };
  const bodyRows = model.displayRows - 2;
  const rendered = tickets.map((ticket) => {
    const lines = ticketLines(ticket, fields, model.displayColumns);
    const pages: string[][] = [];
    for (let index = 0; index < lines.length; index += bodyRows) pages.push(lines.slice(index, index + bodyRows));
    return { ticket, pages: pages.length ? pages : [["NO DETAILS"]] };
  });
  const allIndexes = tickets.map((_ticket, index) => index + 1);

  const source: string[] = [
    ":Lbl M",
    `:Menu("${title}","${sourceString(menu.all)}",A,"${sourceString(menu.new)}",N,"${sourceString(menu.working)}",W,"${sourceString(menu.ready)}",R,"${sourceString(menu.completed)}",C,"${sourceString(menu.search)}",S,"${sourceString(menu.stats)}",T,"${sourceString(menu.about)}",B,"${sourceString(menu.exit)}",X)`,
    ...viewStart("A", allIndexes, "NO TICKETS"),
    ...viewStart("N", statusIndexes(tickets, "New"), "NO NEW TICKETS"),
    ...viewStart("W", statusIndexes(tickets, "Working"), "NO WORKING TICKETS"),
    ...viewStart("R", statusIndexes(tickets, "Ready for Delivery"), "NO READY TICKETS"),
    ...viewStart("C", statusIndexes(tickets, "Completed"), "NO COMPLETED TICKETS"),
    ":Lbl V",
    ":L₁(P)→I",
    ":1→H"
  ];

  rendered.forEach(({ pages }, index) => {
    if (pages.length > 1) source.push(`:If I=${index + 1}`, `:${pages.length}→H`);
  });
  rendered.forEach(({ ticket, pages }, ticketIndex) => {
    pages.forEach((page, pageIndex) => {
      source.push(`:If I=${ticketIndex + 1} and Q=${pageIndex + 1}`, ":Then", ":ClrHome");
      const ticketTitle = enabled(fields, "ticketId") ? ticket.ticketId : "TICKET";
      const pageTitle = pages.length > 1 ? `${ticketTitle} ${pageIndex + 1}/${pages.length}` : ticketTitle;
      source.push(outputLine(1, pageTitle));
      page.forEach((line, lineIndex) => source.push(outputLine(lineIndex + 2, line)));
      source.push(outputLine(model.displayRows, footer), ":End");
    });
  });

  source.push(
    ":0→K",
    ":Repeat K=24 or K=26 or K=45",
    ":getKey→K",
    ":End",
    ":If K=45",
    ":Goto Z",
    ":If K=26",
    ":Then",
    ":If Q<H",
    ":Then",
    ":Q+1→Q",
    ":Else",
    ":If P<dim(L₁)",
    ":Then",
    ":P+1→P",
    ":1→Q",
    ":End",
    ":End",
    ":End",
    ":If K=24",
    ":Then",
    ":If Q>1",
    ":Then",
    ":Q-1→Q",
    ":Else",
    ":If P>1",
    ":Then",
    ":P-1→P",
    ":1→Q",
    ":End",
    ":End",
    ":End",
    ":Goto V",
    ":Lbl Z",
    ":Goto M",
    ":Lbl S",
    ":ClrHome",
    ':Input "TICKET NUMBER:",N'
  );

  const groupedNumbers = new Map<number, number[]>();
  tickets.forEach((ticket, index) => {
    const number = ticketNumber(ticket.ticketId);
    if (number === undefined) return;
    groupedNumbers.set(number, [...(groupedNumbers.get(number) ?? []), index + 1]);
  });
  for (const [number, indexes] of groupedNumbers) {
    source.push(
      `:If N=${number}`,
      ":Then",
      `:${listLiteral(indexes)}→L₁`,
      ":1→P",
      ":1→Q",
      ":Goto V",
      ":End"
    );
  }
  source.push(":Disp \"TICKET NOT FOUND\"", ":Pause ", ":Goto M", ":Lbl T", ":ClrHome", ":Disp \"TI TICKET STATS\"");
  const count = (status: string) => tickets.filter((ticket) => ticket.status === status).length;
  const evo = tickets.filter((ticket) => ticket.ticketId.startsWith("EVO-")).length;
  const ce = tickets.filter((ticket) => ticket.ticketId.startsWith("CE-")).length;
  source.push(
    `:Disp "TOTAL: ${tickets.length}"`,
    `:Disp "NEW: ${count("New")}"`,
    `:Disp "WORKING: ${count("Working")}"`,
    `:Disp "READY: ${count("Ready for Delivery")}"`,
    `:Disp "DONE: ${count("Completed")}"`,
    `:Disp "EVO: ${evo}"`,
    `:Disp "CE: ${ce}"`,
    `:Disp "OTHER: ${tickets.length - evo - ce}"`,
    ":Pause ",
    ":Goto M",
    ":Lbl B",
    ":ClrHome",
    `:Disp "${title}"`
  );
  wrapCalculatorText(about, model.displayColumns, 7).forEach((line) => source.push(`:Disp "${sourceString(line)}"`));
  source.push(":Pause ", ":Goto M", ":Lbl X", ":ClrHome", ":Stop");

  const sourceText = source.join("\n") + "\n";
  const estimatedBytes = Buffer.byteLength(sourceText, "utf8") + 16;
  const warning = estimatedBytes > model.recommendedProgramBytes
    ? `Estimated source exceeds the recommended ${Math.round(model.recommendedProgramBytes / 1024)} KB snapshot size for ${model.label}. Reduce tickets or fields.`
    : undefined;
  const first = rendered[0];
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
      menuItems: Object.values(menu).map((item) => sourceString(item)),
      firstTicket: first ? {
        ticketId: first.ticket.ticketId,
        lines: first.pages[0]
      } : undefined
    }
  };
}
