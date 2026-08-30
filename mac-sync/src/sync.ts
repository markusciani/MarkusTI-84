import { TicketApi } from "./api.js";
import { log } from "./log.js";
import { syncToNumbers } from "./numbers.js";

export interface SyncOptions {
  api: TicketApi;
  documentPath: string;
  dryRun: boolean;
  ticketId?: string;
  force?: boolean;
}

export async function syncPending(options: SyncOptions): Promise<{ processed: number; failed: number }> {
  const tickets = await options.api.pending(options.ticketId, options.force);
  let processed = 0;
  let failed = 0;
  for (const ticket of tickets) {
    try {
      await syncToNumbers(ticket, options.documentPath, options.dryRun);
      if (!options.dryRun) {
        await options.api.synced(ticket.id);
        log.info("Synchronization completed", `ticketId=${ticket.ticketId}`);
      } else {
        log.info("Dry run completed; server state unchanged", `ticketId=${ticket.ticketId}`);
      }
      processed += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      log.error("Synchronization failed", `ticketId=${ticket.ticketId} error=${JSON.stringify(message)}`);
      try { await options.api.failed(ticket.id, message); }
      catch (reportError) { log.error("Could not report sync failure", `ticketId=${ticket.ticketId} error=${JSON.stringify(String(reportError))}`); }
    }
  }
  return { processed, failed };
}
