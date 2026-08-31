export const PROGRAM_FORMATS = ["ti-basic"] as const;
export type ProgramFormat = typeof PROGRAM_FORMATS[number];

export const BUILDER_FIELD_KEYS = [
  "ticketId", "firstName", "calculator", "status", "games", "programs",
  "delivery", "submittedDate", "phone", "email", "details"
] as const;
export type BuilderFieldKey = typeof BUILDER_FIELD_KEYS[number];

export const TICKET_STATUSES = [
  "New", "Accepted", "Rejected", "Waiting for Calculator", "Working",
  "Waiting for User", "Ready for Delivery", "Completed", "Cancelled"
] as const;

export interface CalculatorTicket {
  id: number;
  ticketId: string;
  firstName: string;
  phone: string;
  email: string;
  calculator: string;
  status: string;
  games: string[];
  programs: string[];
  delivery: string;
  submittedAt: string;
  grade?: string;
  version?: string;
  python?: string;
  caseIncluded?: string;
  chargerIncluded?: string;
  cleanCase?: string;
  background?: string;
  dateTimeCurrent?: string;
  gameLauncherMethod?: string;
  existingLauncherName?: string;
  appsToRemove?: string;
  programsToRemove?: string;
}

export interface BuilderFilters {
  calculator?: string;
  statuses?: string[];
  dateFrom?: string;
  dateTo?: string;
  ticketId?: string;
  ticketIdFrom?: string;
  ticketIdTo?: string;
  limit?: number;
  sort?: "newest" | "oldest" | "ticket-id";
}

export interface BuilderFields extends Partial<Record<BuilderFieldKey, boolean>> {}

export interface ProgramOptions {
  title?: string;
  aboutText?: string;
  footer?: string;
  menuLabels?: Partial<Record<"all" | "new" | "working" | "ready" | "completed" | "search" | "stats" | "about" | "exit", string>>;
}

export interface GenerateProgramRequest {
  calculator: string;
  format: ProgramFormat;
  programName: string;
  filters: BuilderFilters;
  fields: BuilderFields;
  options?: ProgramOptions;
}

export interface ProgramPreview {
  title: string;
  menuItems: string[];
  firstTicket?: { ticketId: string; lines: string[] };
}

export interface ProgramBuildResult {
  programName: string;
  format: ProgramFormat;
  fileName: string;
  mimeType: string;
  source: string;
  estimatedBytes: number;
  estimatedKilobytes: number;
  ticketCount: number;
  warning?: string;
  preview: ProgramPreview;
}
