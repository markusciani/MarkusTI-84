import type { GenerateProgramRequest } from "./types.js";

const safeFields = {
  ticketId: true, firstName: true, calculator: true, status: true, games: true,
  programs: true, delivery: true, submittedDate: true, phone: false, email: false
};

export function builtInTemplates(today = new Date().toISOString().slice(0, 10)): Array<{ id: string; name: string; config: Partial<GenerateProgramRequest> }> {
  return [
    { id: "full", name: "Full Ticket Viewer", config: { filters: { limit: 20, sort: "newest" }, fields: safeFields } },
    { id: "ready", name: "Ready for Delivery", config: {
      filters: { statuses: ["Ready for Delivery"], limit: 20, sort: "oldest" },
      fields: { ticketId: true, firstName: true, calculator: true, status: true, delivery: true }
    } },
    { id: "today", name: "Today's Tickets", config: {
      filters: { dateFrom: today, dateTo: today, limit: 20, sort: "newest" }, fields: safeFields
    } },
    { id: "evo", name: "TI-84 Evo Only", config: {
      filters: { calculator: "TI-84 Evo", limit: 20, sort: "newest" }, fields: safeFields
    } },
    { id: "compact", name: "Compact Viewer", config: {
      filters: { limit: 30, sort: "newest" },
      fields: { ticketId: true, firstName: true, calculator: true, status: true, delivery: true }
    } }
  ];
}
