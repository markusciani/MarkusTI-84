import { createHash } from "node:crypto";
import type { NormalizedTicket, Scalar } from "@ti-tickets/shared";
import type { GoogleSheetSource } from "./sources.js";

export type ImportedTicket = Omit<NormalizedTicket, "ticketId">;

function cleanHeader(value: unknown): string {
  return String(value ?? "").replaceAll("&amp;", "&").replaceAll("’", "'").replace(/\s+/g, " ").trim();
}

function hasValue(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return !["", "no", "false", "n/a", "not selected", "0"].includes(normalized);
}

function bracketLabel(header: string): string | undefined {
  const match = header.match(/\[([^\]]+)\]\s*$/);
  return match?.[1]?.trim();
}

export function mapGoogleSheetRows(source: GoogleSheetSource, values: unknown[][]): ImportedTicket[] {
  if (values.length < 2) return [];
  const headers = values[0].map(cleanHeader);
  const normalizedHeaders = headers.map((header) => header.toUpperCase());
  const indexOf = (...names: string[]) => normalizedHeaders.findIndex((header) => names.some((name) => header === name.toUpperCase()));
  const valueAt = (row: unknown[], ...names: string[]) => {
    const index = indexOf(...names);
    return index < 0 ? "" : String(row[index] ?? "").trim();
  };
  const prefixed = (row: unknown[], markers: string[]) => headers.flatMap((header, index) => {
    const upper = header.toUpperCase();
    const label = bracketLabel(header);
    return label && markers.some((marker) => upper.includes(marker)) && hasValue(row[index]) ? [label] : [];
  });

  return values.slice(1).flatMap((row, rowIndex) => {
    if (!row.some(hasValue)) return [];
    const submissionId = valueAt(row, "Submission ID", "Response ID") || createHash("sha256")
      .update(`${source.spreadsheetId}:${rowIndex + 2}:${valueAt(row, "Submitted at", "Submitted At")}:${valueAt(row, "Email Address")}`)
      .digest("hex").slice(0, 24);
    const submittedAtRaw = valueAt(row, "Submitted at", "Submitted At", "Created At");
    const parsedDate = new Date(submittedAtRaw);
    const submittedAt = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
    const calculatorModel = valueAt(row, "Texas Instrument Model", "Calculator Model") || source.calculatorType;
    const delivery = valueAt(row, "How would you like us to return your calculator?", "Delivery");
    const optionValue = (name: string): Scalar => valueAt(row, name) || null;
    return [{
      tallySubmissionId: `sheet:${source.key}:${submissionId}`,
      formId: source.spreadsheetId,
      formType: source.formType,
      calculatorType: source.calculatorType,
      submittedAt,
      person: {
        firstName: valueAt(row, "First Name"), phone: valueAt(row, "Phone Number", "Phone"),
        email: valueAt(row, "Email Address", "Email"), grade: valueAt(row, "Grade Level", "Grade")
      },
      calculator: {
        model: calculatorModel, version: valueAt(row, "Version Number", "Version"),
        python: valueAt(row, "Does your calculator have Python?", "Python Status"),
        caseIncluded: valueAt(row, "Does your calculator come with its case?", "Case Included"),
        chargerIncluded: valueAt(row, "Did your calculator come with its charger?", "Charger Included")
      },
      options: {
        cleanCase: optionValue("Would you like us to clean your calculator's case?"),
        background: optionValue("Would you like to have a custom background for your calculator?"),
        signatureReceived: Boolean(valueAt(row, "Signature Verification", "Signature"))
      },
      games: [...new Set(prefixed(row, source.gameMarkers))],
      programs: [...new Set(prefixed(row, source.programMarkers))],
      delivery: { option: delivery || null },
      files: [],
      raw: { source: "google-sheets", spreadsheetId: source.spreadsheetId, row: rowIndex + 2 }
    }];
  });
}
