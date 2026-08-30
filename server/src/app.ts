import express, { type NextFunction, type Request, type Response } from "express";
import type { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { buildProgram, parseGenerateRequest } from "./calculator/programBuilder.js";
import { calculatorModels } from "./calculator/models.js";
import { builtInTemplates } from "./calculator/templates.js";
import { TICKET_STATUSES } from "./calculator/types.js";
import { formConfigs, findFormConfig } from "./config/forms.js";
import { log } from "./log.js";
import { validateApiSecret, validateTallyRequest } from "./security.js";
import { TicketService } from "./tickets/ticketService.js";
import { isTallyWebhookPayload } from "./tally/types.js";

interface RawRequest extends Request { rawBody?: Buffer }

export interface AppOptions {
  apiSecret?: string;
  tallyWebhookSecret?: string;
  webhookPathToken?: string;
  allowInsecureWebhooks?: boolean;
}

export function createApp(db: DatabaseSync, options: AppOptions = {}) {
  const app = express();
  const service = new TicketService(db, formConfigs);
  const apiSecret = options.apiSecret ?? process.env.API_SECRET ?? "";
  const signingSecret = options.tallyWebhookSecret ?? process.env.TALLY_WEBHOOK_SECRET;
  const pathToken = options.webhookPathToken ?? process.env.WEBHOOK_PATH_TOKEN;
  const allowInsecure = options.allowInsecureWebhooks ?? process.env.ALLOW_INSECURE_WEBHOOKS === "true";

  app.use(express.json({
    limit: "2mb",
    verify: (req, _res, buffer) => { (req as RawRequest).rawBody = Buffer.from(buffer); }
  }));

  const publicDirectory = fileURLToPath(new URL("../public", import.meta.url));
  app.use("/program-builder", express.static(`${publicDirectory}/program-builder`));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.post("/webhooks/tally", (req: RawRequest, res) => {
    const signatureHeader = req.header("tally-signature") ?? undefined;
    const receivedToken = req.header("x-webhook-token") ?? (typeof req.query.token === "string" ? req.query.token : undefined);
    if (!validateTallyRequest({
      body: req.body, rawBody: req.rawBody, receivedSignature: signatureHeader,
      signingSecret, receivedToken, pathToken, allowInsecure
    })) {
      log.warn("Rejected Tally webhook with invalid authentication");
      return res.status(401).json({ ok: false, error: "Invalid webhook authentication" });
    }
    if (!isTallyWebhookPayload(req.body)) {
      log.warn("Rejected malformed Tally webhook");
      return res.status(400).json({ ok: false, error: "Malformed Tally webhook payload" });
    }

    const payload = req.body;
    log.info("Received Tally submission", { submissionId: payload.data.submissionId, formId: payload.data.formId });
    const config = findFormConfig(payload.data.formId);
    if (!config) {
      log.info("Ignored submission from unconfigured form", { formId: payload.data.formId });
      return res.status(200).json({ ok: true, ignored: true });
    }
    try {
      const result = service.create(payload, config);
      if (result.duplicate) {
        log.info("Ignored duplicate Tally submission", { submissionId: payload.data.submissionId, ticketId: result.ticketId });
      } else {
        log.info("Created ticket awaiting Numbers sync", { ticketId: result.ticketId, formType: config.formType });
      }
      return res.status(200).json({ ok: true, duplicate: result.duplicate, ticketId: result.ticketId });
    } catch (error) {
      log.error("Failed to persist Tally submission", { submissionId: payload.data.submissionId, error: String(error) });
      return res.status(500).json({ ok: false, error: "Unable to persist submission" });
    }
  });

  const requireApiAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!validateApiSecret(req.header("authorization") ?? undefined, apiSecret)) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    next();
  };
  app.use("/api", requireApiAuth);

  app.get("/api/tickets/pending-sync", (req, res) => {
    const ticketId = typeof req.query.ticketId === "string" ? req.query.ticketId : undefined;
    const force = req.query.force === "true";
    res.json({ tickets: service.listPending(new Date(), ticketId, force) });
  });

  app.get("/api/tickets/:id", (req, res) => {
    const value = /^\d+$/.test(req.params.id) ? service.getById(Number(req.params.id)) : service.getByTicketId(req.params.id);
    return value ? res.json(value) : res.status(404).json({ ok: false, error: "Ticket not found" });
  });

  app.patch("/api/tickets/:id/status", (req, res) => {
    const status = typeof req.body?.status === "string" ? req.body.status : "";
    if (!(TICKET_STATUSES as readonly string[]).includes(status)) {
      return res.status(400).json({ ok: false, error: "Unsupported ticket status" });
    }
    const identifier = /^\d+$/.test(req.params.id) ? Number(req.params.id) : req.params.id.toUpperCase();
    const changed = service.updateStatus(identifier, status);
    return changed ? res.json({ ok: true, status }) : res.status(404).json({ ok: false, error: "Ticket not found" });
  });

  app.get("/api/program-builder/config", (_req, res) => {
    res.json({
      models: calculatorModels.map((model) => ({
        id: model.id, label: model.label, formats: model.tiBasic ? ["ti-basic"] : [],
        pythonHardware: model.pythonHardware, availableBytes: model.availableBytes,
        recommendedProgramBytes: model.recommendedProgramBytes
      })),
      formats: [{ id: "ti-basic", label: "TI-BASIC source" }],
      statuses: TICKET_STATUSES,
      templates: builtInTemplates()
    });
  });

  app.get("/api/program-builder/tickets", (_req, res) => {
    res.json({ tickets: service.listForProgramBuilder() });
  });

  const runBuilder = (req: Request, res: Response, download: boolean) => {
    try {
      const request = parseGenerateRequest(req.body);
      const result = buildProgram(request, service.listForProgramBuilder());
      if (download) {
        res.setHeader("content-type", result.mimeType);
        res.setHeader("content-disposition", `attachment; filename="${result.fileName}"`);
        return res.send(result.source);
      }
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };

  app.post("/api/program-builder/preview", (req, res) => runBuilder(req, res, false));
  app.post("/api/program-builder/generate", (req, res) => runBuilder(req, res, req.query.download === "true"));

  app.post("/api/tickets/:id/synced", (req, res) => {
    const changed = service.markSynced(Number(req.params.id));
    if (!changed) return res.status(404).json({ ok: false, error: "Ticket not found" });
    log.info("Ticket synchronized", { databaseId: Number(req.params.id) });
    return res.json({ ok: true });
  });

  app.post("/api/tickets/:id/sync-failed", (req, res) => {
    const message = typeof req.body?.error === "string" ? req.body.error : "Unknown Numbers synchronization error";
    const retry = service.markFailed(Number(req.params.id), message);
    if (!retry) return res.status(404).json({ ok: false, error: "Pending ticket not found" });
    log.warn("Ticket sync failed", { databaseId: Number(req.params.id), retryCount: retry.retryCount, nextSyncAt: retry.nextSyncAt });
    return res.json({ ok: true, ...retry });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    log.warn("Request parsing failed", { error: String(error) });
    res.status(400).json({ ok: false, error: "Invalid request" });
  });

  return { app, service };
}
