import type { TallyField, TallyWebhookPayload } from "./types.js";

export interface FieldMap {
  byKey: Map<string, TallyField>;
  fields: TallyField[];
}

export function mapFields(payload: TallyWebhookPayload): FieldMap {
  return { byKey: new Map(payload.data.fields.map((field) => [field.key, field])), fields: payload.data.fields };
}

function normalizedLabel(value: string): string {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim().toLowerCase();
}

export function findField(fields: FieldMap, id: string, labels: string[] = []): TallyField | undefined {
  const exact = fields.byKey.get(id);
  if (exact) return exact;
  const wanted = new Set(labels.map(normalizedLabel));
  return fields.fields.find((field) => field.label && wanted.has(normalizedLabel(field.label)));
}

export function fieldValue(fields: FieldMap, id: string, labels: string[] = []): unknown {
  return findField(fields, id, labels)?.value;
}

export function displayValue(field: TallyField | undefined): unknown {
  if (!field) return undefined;
  if (!field.options?.length) return field.value;
  const labels = new Map(field.options.map((option) => [option.id, option.text]));
  const translate = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(translate);
    if (typeof value === "string" && labels.has(value)) return labels.get(value) ?? value;
    return value;
  };
  return translate(field.value);
}

export function fieldDisplayValue(fields: FieldMap, id: string, labels: string[] = []): unknown {
  return displayValue(findField(fields, id, labels));
}

export function textValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    for (const key of ["text", "label", "name", "value"]) {
      if (item[key] !== undefined) return textValue(item[key]);
    }
  }
  return "";
}

export function listValue(value: unknown): string[] {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) return value.flatMap(listValue).filter(Boolean);
  if (typeof value === "string") return value.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
  const text = textValue(value).trim();
  return text ? [text] : [];
}

export function isSelected(value: unknown): boolean {
  if (value === true || value === 1) return true;
  const normalized = textValue(value).trim().toLowerCase();
  return ["yes", "true", "selected", "checked", "1"].includes(normalized);
}

export function collectSelectedItems(
  fields: FieldMap,
  individual: Array<{ fieldId: string; label: string }>,
  multiSelectFieldIds: string[] = [],
  matrixLabels: string[] = []
): string[] {
  const selected = individual.filter((item) => isSelected(fieldDisplayValue(fields, item.fieldId))).map((item) => item.label);
  for (const id of multiSelectFieldIds) selected.push(...listValue(fieldDisplayValue(fields, id)));
  const wantedMatrices = new Set(matrixLabels.map(normalizedLabel));
  for (const field of fields.fields) {
    if (field.type !== "MATRIX" || !field.label || !wantedMatrices.has(normalizedLabel(field.label))) continue;
    if (!field.value || typeof field.value !== "object" || Array.isArray(field.value)) continue;
    const rows = new Map((field.rows ?? []).map((row) => [row.id, row.text]));
    const columns = new Map((field.columns ?? []).map((column) => [column.id, column.text]));
    for (const [rowId, rawColumnIds] of Object.entries(field.value as Record<string, unknown>)) {
      const columnIds = Array.isArray(rawColumnIds) ? rawColumnIds : [rawColumnIds];
      const chosenYes = columnIds.some((columnId) => {
        const text = typeof columnId === "string" ? columns.get(columnId) : undefined;
        return typeof text === "string" && isSelected(text);
      });
      const rowLabel = rows.get(rowId);
      if (chosenYes && rowLabel) selected.push(rowLabel);
    }
  }
  return [...new Set(selected)];
}

export interface ExtractedFile { url: string; name?: string; mimeType?: string }

export function extractFiles(value: unknown): ExtractedFile[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(extractFiles);
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return [{ url: value }];
  if (typeof value !== "object") return [];
  const item = value as Record<string, unknown>;
  const url = [item.url, item.src, item.downloadUrl].find((candidate) => typeof candidate === "string");
  if (typeof url === "string") {
    return [{
      url,
      name: typeof item.name === "string" ? item.name : typeof item.filename === "string" ? item.filename : undefined,
      mimeType: typeof item.mimeType === "string" ? item.mimeType : typeof item.type === "string" ? item.type : undefined
    }];
  }
  return Object.values(item).flatMap(extractFiles);
}
