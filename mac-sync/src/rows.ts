import type { NormalizedTicket, PendingTicketRecord } from "@ti-tickets/shared";

function getPath(value: unknown, path: string): unknown {
  if (path === "$status") return "New";
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(cell).filter(Boolean).join("\n");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function buildMasterRow(record: PendingTicketRecord, now = new Date()): Record<string, string> {
  const ticket = record.normalized;
  return {
    "Ticket ID": ticket.ticketId,
    "Submitted": ticket.submittedAt,
    "First Name": ticket.person.firstName,
    "Phone": ticket.person.phone,
    "Email": ticket.person.email,
    "Grade": ticket.person.grade,
    "Calculator": ticket.calculator.model || ticket.calculatorType,
    "Ticket Type": record.numbers.ticketType,
    "Status": "New",
    "Delivery": cell(ticket.delivery.option),
    "Last Updated": now.toISOString(),
    "Tally Submission ID": ticket.tallySubmissionId
  };
}

export function buildDetailRow(record: PendingTicketRecord): Record<string, string> {
  return Object.fromEntries(Object.entries(record.numbers.detailColumns).map(([header, path]) => [
    header, cell(getPath(record.normalized as NormalizedTicket, path))
  ]));
}
