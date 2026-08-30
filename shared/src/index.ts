export type Scalar = string | number | boolean | null;

export interface TallyFile {
  url: string;
  name?: string;
  mimeType?: string;
}

export interface NormalizedTicket {
  ticketId: string;
  tallySubmissionId: string;
  formId: string;
  formType: string;
  calculatorType: string;
  submittedAt: string;
  person: { firstName: string; phone: string; email: string; grade: string };
  calculator: {
    model: string;
    version: string;
    python: string;
    caseIncluded: string;
    chargerIncluded: string;
  };
  options: Record<string, Scalar | string[]>;
  games: string[];
  programs: string[];
  delivery: Record<string, Scalar>;
  files: TallyFile[];
  raw: unknown;
}

export interface PendingTicketRecord {
  id: number;
  ticketId: string;
  formType: string;
  calculatorType: string;
  submittedAt: string;
  retryCount: number;
  normalized: NormalizedTicket;
  numbers: {
    sheet: string;
    table: string;
    masterSheet: string;
    masterTable: string;
    ticketType: string;
    detailColumns: Record<string, string>;
  };
}

export const MASTER_COLUMNS = [
  "Ticket ID", "Submitted", "First Name", "Phone", "Email", "Grade",
  "Calculator", "Ticket Type", "Status", "Delivery", "Last Updated",
  "Tally Submission ID"
] as const;
