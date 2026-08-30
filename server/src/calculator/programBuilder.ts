import { filterTickets } from "./filters.js";
import { generateTiBasic } from "./generators/tiBasic.js";
import { getCalculatorModel } from "./models.js";
import { BUILDER_FIELD_KEYS, PROGRAM_FORMATS, type BuilderFields, type CalculatorTicket, type GenerateProgramRequest, type ProgramBuildResult } from "./types.js";

export function parseGenerateRequest(value: unknown): GenerateProgramRequest {
  if (!value || typeof value !== "object") throw new Error("Request body must be an object");
  const body = value as Record<string, unknown>;
  if (typeof body.calculator !== "string" || !getCalculatorModel(body.calculator)) throw new Error("Unsupported calculator model");
  if (typeof body.format !== "string" || !PROGRAM_FORMATS.includes(body.format as "ti-basic")) throw new Error("Unsupported output format");
  if (typeof body.programName !== "string" || !body.programName.trim()) throw new Error("Program name is required");
  const filters = body.filters && typeof body.filters === "object" ? body.filters as GenerateProgramRequest["filters"] : {};
  const fields = body.fields && typeof body.fields === "object" ? body.fields as BuilderFields : {};
  for (const key of Object.keys(fields)) {
    if (!(BUILDER_FIELD_KEYS as readonly string[]).includes(key) || typeof fields[key as keyof BuilderFields] !== "boolean") {
      throw new Error(`Invalid field selection: ${key}`);
    }
  }
  const limit = Number(filters.limit ?? 20);
  if (!Number.isFinite(limit) || limit < 1 || limit > 50) throw new Error("Ticket limit must be between 1 and 50");
  return {
    calculator: body.calculator,
    format: body.format as "ti-basic",
    programName: body.programName,
    filters: { ...filters, limit: Math.trunc(limit) },
    fields,
    options: body.options && typeof body.options === "object" ? body.options as GenerateProgramRequest["options"] : undefined
  };
}

export function buildProgram(request: GenerateProgramRequest, tickets: CalculatorTicket[]): ProgramBuildResult {
  const model = getCalculatorModel(request.calculator);
  if (!model?.tiBasic) throw new Error(`${request.calculator} does not support TI-BASIC output`);
  const selected = filterTickets(tickets, request.filters);
  return generateTiBasic({ model, programName: request.programName, tickets: selected, fields: request.fields, options: request.options });
}
