export interface GoogleSheetSource {
  key: "evo" | "ce" | "plus";
  title: string;
  spreadsheetId: string;
  sheetName: string;
  formType: string;
  calculatorType: string;
  ticketPrefix: string;
  gameMarkers: string[];
  programMarkers: string[];
}

export const googleSheetSources: GoogleSheetSource[] = [
  {
    key: "evo", title: "TI-84 Evo Ticket",
    spreadsheetId: process.env.GOOGLE_SHEET_EVO_ID || "126nj6XLY5Hw1hV3C9tJxSCu2ed9VcQa1M6mbucpIm1w",
    sheetName: "Sheet1", formType: "evo", calculatorType: "TI-84 Evo", ticketPrefix: "EVO",
    gameMarkers: ["GAMES FOR TI-84 EVO"], programMarkers: ["MATH PROGRAMS FOR TI-84 EVO"]
  },
  {
    key: "ce", title: "TI-84 Plus CE Ticket",
    spreadsheetId: process.env.GOOGLE_SHEET_CE_ID || "12pyiETFQOQ6OvAF_Td1qL5JNzT9o-6_fMCQzLSO0OSw",
    sheetName: "Sheet1", formType: "ce", calculatorType: "TI-84 Plus CE", ticketPrefix: "CE",
    gameMarkers: ["GAMES FOR TI-84 PLUS CE & PYTHON", "PYTHON GAMES FOR TI-84 PLUS CE PYTHON ONLY"],
    programMarkers: ["ALGEBRA", "GEOMETRY", "TRIONOMETRY", "TRIGONOMETRY", "FINANCE", "APPLIED MATH", "CHEMISTRY", "SCIENCE", "MATH", "ALGORITHMS", "PROGRAMMING", "LEARNING", "OTHER"]
  },
  {
    key: "plus", title: "TI-84 Plus Ticket",
    spreadsheetId: process.env.GOOGLE_SHEET_PLUS_ID || "1btqLOMvKg49BDlz-iLDkKHl2_NvA-iCNJQyEOmtxQ_0",
    sheetName: "Sheet1", formType: "plus", calculatorType: "TI-84 Plus", ticketPrefix: "PLUS",
    gameMarkers: ["GAMES FOR TI-84 PLUS & TI-83 PLUS"],
    programMarkers: ["ALGEBRA", "MATHEMATICS", "SCIENCE", "OTHER"]
  }
];
