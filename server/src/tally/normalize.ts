import type { NormalizedTicket } from "@ti-tickets/shared";
import type { FormConfig } from "../config/forms.js";
import { collectSelectedItems, extractFiles, fieldDisplayValue, fieldValue, mapFields, textValue } from "./parser.js";
import type { TallyWebhookPayload } from "./types.js";

export function normalizeSubmission(payload: TallyWebhookPayload, config: FormConfig, ticketId: string): NormalizedTicket {
  const fields = mapFields(payload);
  const labels = (name: string) => config.fieldLabels?.[name] ?? [];
  const get = (name: string) => textValue(fieldDisplayValue(fields, config.fields[name] ?? "", labels(name)));
  const signatureFiles = extractFiles(fieldValue(fields, config.fields.signature ?? "", labels("signature")));
  const launcherFiles = config.fields.launcherScreenshot ? extractFiles(fieldValue(fields, config.fields.launcherScreenshot, labels("launcherScreenshot"))) : [];
  const games = config.capabilities.games
    ? collectSelectedItems(fields, config.groups.games, config.groups.gameMultiSelectFields, config.groups.gameMatrixLabels) : [];
  const programs = config.capabilities.programs
    ? collectSelectedItems(fields, config.groups.programs, config.groups.programMultiSelectFields, config.groups.programMatrixLabels) : [];

  const options: NormalizedTicket["options"] = {
    cleanCase: get("cleanCase"),
    background: get("background"),
    printName: get("printName"),
    signatureReceived: signatureFiles.length > 0 ? "Yes" : "No",
    signatureUrl: signatureFiles[0]?.url ?? ""
  };
  if (config.formType === "ce") {
    Object.assign(options, {
      dateTimeCurrent: get("dateTimeCurrent"),
      gameLauncherMethod: get("gameLauncherMethod"),
      existingLauncherName: get("existingLauncherName"),
      launcherScreenshotUrl: launcherFiles[0]?.url ?? "",
      appsToRemove: get("appsToRemove"),
      programsToRemove: get("programsToRemove")
    });
  }

  return {
    ticketId,
    tallySubmissionId: payload.data.submissionId,
    formId: payload.data.formId,
    formType: config.formType,
    calculatorType: config.calculatorType,
    submittedAt: payload.data.createdAt ?? payload.createdAt ?? new Date().toISOString(),
    person: { firstName: get("firstName"), phone: get("phone"), email: get("email"), grade: get("grade") },
    calculator: {
      model: get("calculatorModel") || config.calculatorType,
      version: get("version"),
      python: config.capabilities.python ? get("python") : "",
      caseIncluded: get("caseIncluded"),
      chargerIncluded: get("chargerIncluded")
    },
    options,
    games,
    programs,
    delivery: { option: get("delivery") },
    files: [...signatureFiles, ...launcherFiles],
    raw: payload
  };
}
