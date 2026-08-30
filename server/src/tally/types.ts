export interface TallyField {
  key: string;
  label?: string;
  type?: string;
  value?: unknown;
  options?: Array<{ id?: string; text?: string }>;
  rows?: Array<{ id?: string; text?: string }>;
  columns?: Array<{ id?: string; text?: string }>;
}

export interface TallyWebhookPayload {
  eventId?: string;
  eventType?: string;
  createdAt?: string;
  data: {
    responseId?: string;
    submissionId: string;
    formId: string;
    formName?: string;
    createdAt?: string;
    fields: TallyField[];
    [key: string]: unknown;
  };
}

export function isTallyWebhookPayload(value: unknown): value is TallyWebhookPayload {
  if (!value || typeof value !== "object") return false;
  const data = (value as { data?: unknown }).data;
  if (!data || typeof data !== "object") return false;
  const candidate = data as Record<string, unknown>;
  return typeof candidate.formId === "string" &&
    typeof candidate.submissionId === "string" && Array.isArray(candidate.fields);
}
