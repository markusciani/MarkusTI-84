import type { BuilderFilters, CalculatorTicket } from "./types.js";

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

export function filterTickets(tickets: CalculatorTicket[], filters: BuilderFilters): CalculatorTicket[] {
  let result = tickets.filter((ticket) => {
    if (filters.calculator && ticket.calculator !== filters.calculator) return false;
    if (filters.statuses?.length && !filters.statuses.includes(ticket.status)) return false;
    const submitted = dateOnly(ticket.submittedAt);
    if (filters.dateFrom && submitted < filters.dateFrom) return false;
    if (filters.dateTo && submitted > filters.dateTo) return false;
    if (filters.ticketId && ticket.ticketId.toUpperCase() !== filters.ticketId.toUpperCase()) return false;
    if (filters.ticketIdFrom && ticket.ticketId.localeCompare(filters.ticketIdFrom, undefined, { numeric: true }) < 0) return false;
    if (filters.ticketIdTo && ticket.ticketId.localeCompare(filters.ticketIdTo, undefined, { numeric: true }) > 0) return false;
    return true;
  });
  const sort = filters.sort ?? "newest";
  result.sort((left, right) => {
    if (sort === "ticket-id") return left.ticketId.localeCompare(right.ticketId, undefined, { numeric: true });
    const difference = Date.parse(left.submittedAt) - Date.parse(right.submittedAt);
    return sort === "oldest" ? difference : -difference;
  });
  const limit = Math.min(50, Math.max(1, Math.trunc(filters.limit ?? 20)));
  return result.slice(0, limit);
}
