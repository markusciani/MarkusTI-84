import { MASTER_COLUMNS } from "@ti-tickets/shared";

export interface TableSchema { sheet: string; table: string; headers: readonly string[] }

export const tableSchemas: TableSchema[] = [
  { sheet: "All Tickets", table: "Tickets", headers: MASTER_COLUMNS },
  {
    sheet: "TI-84 Evo", table: "Tickets", headers: [
      "Ticket ID", "Submitted", "First Name", "Phone", "Email", "Grade", "Calculator Model",
      "Version", "Python", "Case Included", "Charger Included", "Clean Case", "Background",
      "Games Requested", "Math Programs Requested", "Delivery", "Print Name", "Signature Received",
      "Signature URL", "Status", "Tally Submission ID"
    ]
  },
  {
    sheet: "TI-84 Plus CE", table: "Tickets", headers: [
      "Ticket ID", "Submitted", "First Name", "Phone", "Email", "Grade", "Calculator Model",
      "Version", "Python Status", "Case Included", "Charger Included", "Date Time Current",
      "Clean Case", "Background", "Game Launcher Method", "Existing Launcher Name",
      "Launcher Screenshot URL", "Apps To Remove", "Programs To Remove", "Games Requested",
      "Programs Requested", "Delivery", "Print Name", "Signature Received", "Signature URL",
      "Status", "Tally Submission ID"
    ]
  }
];
