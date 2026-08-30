import type { PendingTicketRecord } from "@ti-tickets/shared";

export class TicketApi {
  constructor(private readonly baseUrl: string, private readonly secret: string) {}

  async pending(ticketId?: string, force = false): Promise<PendingTicketRecord[]> {
    const url = new URL("/api/tickets/pending-sync", this.baseUrl);
    if (ticketId) url.searchParams.set("ticketId", ticketId);
    if (force) url.searchParams.set("force", "true");
    const response = await this.request(url, { method: "GET" });
    const body = await response.json() as { tickets: PendingTicketRecord[] };
    return body.tickets;
  }

  async synced(id: number): Promise<void> {
    await this.request(new URL(`/api/tickets/${id}/synced`, this.baseUrl), { method: "POST" });
  }

  async failed(id: number, error: string): Promise<void> {
    await this.request(new URL(`/api/tickets/${id}/sync-failed`, this.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error })
    });
  }

  async updateStatus(ticketId: string, status: string): Promise<void> {
    await this.request(new URL(`/api/tickets/${encodeURIComponent(ticketId)}/status`, this.baseUrl), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status })
    });
  }

  private async request(url: URL, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: { authorization: `Bearer ${this.secret}`, ...init.headers }
      });
      if (!response.ok) throw new Error(`${init.method} ${url.pathname} failed with HTTP ${response.status}: ${await response.text()}`);
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}
