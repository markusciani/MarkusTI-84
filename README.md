# Tally → Apple Numbers TI Ticket Automation

## 1. What this project does

This system accepts Tally ticket-form webhooks on an always-available Node server, assigns durable calculator-specific ticket IDs, and queues submissions in SQLite. A separate agent on the Mac periodically drains that queue into one `TI Tickets.numbers` document.

The TI Family Form Search is not configured and therefore cannot create tickets. Unknown form IDs are authenticated, acknowledged with HTTP 200, logged without personal details, and ignored.

The included Tally IDs are deliberate `TODO_...` placeholders. Nothing claims to know the IDs of the live forms.

## 2. Architecture

```text
Ticket form ──signed webhook──> public Node server ──> persistent SQLite queue
                                                        │
                                                        │ authenticated polling
                                                        ▼
TI Family Form Search (no webhook)                  macOS sync agent
                                                        │
                                                        ▼
                                                Numbers AppleScript API
                                                        │
                           TI Tickets.numbers: All Tickets + calculator sheet
```

The webhook never waits for Numbers. If the Mac is asleep or offline, SQLite retains unsynchronized tickets. Every Tally submission ID is unique in the database. Every Numbers insert searches the `Ticket ID` header first, so a crash between writing Numbers and acknowledging the server is safe to retry.

## 3. Requirements

- Node.js 22.5 or newer (Node 24 is recommended)
- macOS with Apple Numbers for the sync agent
- A public HTTPS host with persistent storage for the server if submissions must work while the Mac is off
- macOS Automation permission allowing the installed Node executable/`osascript` to control Numbers

Install dependencies:

```bash
npm install
cp .env.example .env
```

## 4. Tally setup

For each actual ticket form only:

1. Open **Integrations → Webhooks** in Tally.
2. Add `https://YOUR-SERVER/webhooks/tally`.
3. Enable a signing secret. Use the same strong secret for these ticket webhooks and set it as `TALLY_WEBHOOK_SECRET` on the server.
4. Keep the TI Family Form Search independent; do not add its ID to the form registry.
5. Submit one test response and inspect the webhook event before replacing any placeholders.

Tally currently sends `Tally-Signature`, an HMAC SHA-256/base64 signature. The receiver verifies the raw request and the canonical JSON representation using constant-time comparison. `WEBHOOK_PATH_TOKEN` is an alternative fallback, accepted as `?token=...` or `X-Webhook-Token`; do not use `ALLOW_INSECURE_WEBHOOKS=true` outside local development. See [Tally's webhook documentation](https://tally.so/help/webhooks).

## 5. How to find Tally Form IDs

In a delivered webhook payload, copy:

```json
{ "data": { "formId": "COPY_THIS_VALUE" } }
```

Set the two current IDs in `.env`:

```dotenv
TALLY_EVO_FORM_ID=real-evo-id
TALLY_CE_FORM_ID=real-ce-id
```

Restart the server after changing them.

## 6. How to find Tally Field IDs

Each webhook question is an entry in `data.fields`. Copy its `key`, not its visible `label`:

```json
{ "key": "question_actual-id", "label": "First name", "value": "John" }
```

Replace the matching placeholder in [`server/src/config/forms.ts`](server/src/config/forms.ts). The complete replacement list is in [`docs/FIELD_ID_CHECKLIST.md`](docs/FIELD_ID_CHECKLIST.md). Conditional questions may be absent; they safely become blank. Choice option IDs are translated to their visible option text when Tally includes the `options` metadata.

## 7. Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `PORT`, `HOST` | server | HTTP bind; use `HOST=0.0.0.0` in a container |
| `DATABASE_PATH` | server | Persistent SQLite file |
| `API_SECRET` | both | Long bearer secret shared by server and Mac |
| `BUILDER_PASSWORD_HASH` | server | Scrypt hash used by the Chrome Builder login |
| `BUILDER_SESSION_SECRET` | server | Signs eight-hour, Builder-only browser sessions |
| `TALLY_WEBHOOK_SECRET` | server | Preferred Tally signing secret |
| `WEBHOOK_PATH_TOKEN` | server | Secure fallback when signing cannot be enabled |
| `TALLY_EVO_FORM_ID`, `TALLY_CE_FORM_ID` | server | Real ticket form IDs |
| `GOOGLE_SERVICE_ACCOUNT_FILE` | server | Optional private Google service-account JSON for Sheet refresh |
| `SYNC_API_URL` | Mac | Public server base URL |
| `SYNC_INTERVAL_SECONDS` | Mac | Poll interval; minimum 30 seconds |
| `NUMBERS_DOCUMENT_PATH` | Mac | Absolute path to the single Numbers document |
| `DRY_RUN` | Mac | Defaults to `true`; set exactly `false` for live writes |
| `SYNC_NUMBERS_STATUSES` | Mac | Defaults to `true`; reconciles manual Numbers Status edits back to the server |

Never commit `.env`. `npm run configure-local -w @ti-tickets/server` creates local secrets and hashes a password supplied over standard input. The password itself is not written to source or browser JavaScript.

## 8. Database setup

There is no manual migration command. On startup, the server creates the SQLite schema, WAL journal, unique ticket/submission constraints, prefix counters, and pending-sync index. For a hosted container, mount persistent storage at `/data`; the included `Dockerfile` defaults to `/data/ti-tickets.sqlite`.

Build and run the server:

```bash
npm run build
npm run start:server
```

For an always-available local Builder that starts at login without keeping Terminal open:

```bash
npm run install-server-agent
```

Remove only the local server service with `npm run uninstall-server-agent`; its database and logs are preserved. The installed runtime, database, and logs live under `~/Library/Application Support/TITicketAutomation`, avoiding macOS background-access restrictions on Documents. This local service is convenient for the Builder, but it is not a substitute for public hosting when webhooks must arrive while the Mac is off.

`GET /health` and `POST /auth/login` are public. Operational `/api/*` endpoints require `Authorization: Bearer $API_SECRET`; a successful Builder login returns a short-lived token restricted to the Builder and Google Sheet routes.

## 9. Numbers setup

Choose one absolute path and place it in `.env`. To obtain an existing file's path, select it in Finder, hold Option, choose **Copy … as Pathname**, and paste that value. Do not assume that every Mac uses the same iCloud path.

Create or safely complete the required sheets, `Tickets` tables, and headers:

```bash
npm run numbers:init
```

The command adds missing sheets/tables/headers and does not remove existing columns. The document contains `All Tickets`, `TI-84 Evo`, `TI-84 Plus CE`, and `TI-84 Plus`. The live writer locates every column by its header text, not by column number. Newline-separated game/program names stay inside one cell. File uploads and signatures are stored as URL text plus `Signature Received`; no large file is embedded.

Before live use, open the document once and confirm the three table names. In System Settings → Privacy & Security → Automation, allow the process running the agent to control Numbers if macOS prompts.

## 10. Installing the Mac sync agent

First test without changing Numbers:

```dotenv
DRY_RUN=true
```

```bash
npm run sync:pending
npm run sync -- EVO-0001
```

Dry run prints both target rows and does not mark the ticket synchronized. When the output is correct, set `DRY_RUN=false`, run one manual sync, inspect both Numbers tables, then install the login agent:

```bash
npm run install-agent
```

It stages a background-safe runtime under `~/Library/Application Support/TITicketAutomation`, creates `~/Library/LaunchAgents/org.ciani01.titickets.sync.plist`, starts at login, stays alive, and writes logs under the runtime's `logs/` directory. Terminal does not need to remain open.

Remove it with:

```bash
npm run uninstall-agent
```

Uninstalling preserves log files and the Numbers/database data.

## 11. Testing

```bash
npm test
npm run typecheck
npm run build
npm run fixture:preview -- fixtures/tally-evo.json
npm run fixture:preview -- fixtures/tally-ce.json
```

Fixtures exercise placeholder IDs without contacting Tally. Tests cover Evo and CE normalization, option-label conversion, Yes/No selection, missing conditional fields, ticket sequencing, submission idempotency, unknown/search-form ignoring, API authentication, sync state, backoff, and Numbers row generation.

## 12. Adding another calculator

1. Create the new Tally ticket form and add the signed webhook.
2. Copy its real `formId` and field `key` values.
3. Add one object to `formConfigs` with a unique `formType`, prefix, target sheet/table, capabilities, mappings, groups, and `detailColumns`.
4. Create the corresponding Numbers sheet and `Tickets` table with exactly those headers.
5. Restart/deploy the server and run a fixture through dry run.

The central webhook handler and sync loop do not change. Set unsupported capabilities to `false` and omit irrelevant fields/columns. Prefix counters are stored independently, so IDs are never tied to row positions or reused after deletion.

## Calculator Program Builder

The authenticated Builder is served by the same server at:

```text
http://YOUR-SERVER/program-builder/
```

Open the Builder in Google Chrome and enter the dedicated Builder password. The password is verified by the server and exchanged for an eight-hour, Builder-only session; the API secret is never exposed to the page. The Builder provides:

- TI-BASIC source generation for TI-84 Evo, TI-84 Plus CE, TI-84 Plus CE Python, and TI-84 Plus / TI-83 Plus
- A compact five-item `TILOGS` main menu with Tickets, Search, Stats, System, and Quit
- Ticket lists show each Ticket ID beside the customer's first name
- Ticket sections include Overview, full-screen plain-text Games pages, Programs, Delivery, and optional Contact
- Numeric Ticket ID search, including a result menu when multiple calculator families share the same number
- Calculator, status, date, exact ID, ID range, recency-limit, and sort filters
- A calculator-style preview, source editor, reset/copy controls, text download, size estimate, and model warning
- Built-in templates plus browser-local saved templates
- Configurable title, menu labels, about text, footer, fields, and program name
- A PIN-gated System screen that shows the private Builder website and password together
- Mixed-case website and calculator labels for a friendlier, more readable design
- Phone/email controls in an explicitly marked advanced section; both remain off by default
- Three private Google Sheet source indicators and an authenticated refresh action when a service account is configured
- Calculator-ready `.8xp2` output for Evo and `.8xp` output for Plus/CE, with checksum and token round-trip verification before download
- A Download + Open TI Connect action that opens TI Connect Evo in Chrome after preparing the real program file

Signatures, signature URLs, uploads, screenshots, file URLs, and raw webhook payloads are never exposed to the Builder API. Imported Sheet rows keep the values needed by Numbers, but discard private signature/upload URLs. The browser uses the MIT-licensed `tivars_lib_cpp` engine to encode and verify real calculator containers locally; `.txt` remains available as a fallback. TI Connect Evo owns the USB connection and file transfer in its Chrome tab.

`Status` is now stored in SQLite. During each live Mac sync pass, the agent reads the `Ticket ID` and `Status` columns from `All Tickets / Tickets` and reconciles recognized manual changes back to the server before program generation. It accepts the canonical statuses plus common display aliases such as `READY`, `DONE`, `WAIT CALC`, and `WAIT USER`. Set `SYNC_NUMBERS_STATUSES=false` only if Numbers should not be authoritative.

Program Builder API endpoints are authenticated:

```text
GET   /api/program-builder/config
GET   /api/program-builder/tickets
POST  /api/program-builder/preview
POST  /api/program-builder/generate
GET   /api/google-sheets/status
POST  /api/google-sheets/import
PATCH /api/tickets/:databaseId-or-ticketId/status
```

## 13. Troubleshooting

- **401 from Tally:** make the Tally signing secret and `TALLY_WEBHOOK_SECRET` identical; do not paste the API secret there.
- **Unknown form ignored:** confirm `data.formId`, update the environment variable/config, and restart.
- **Missing Numbers sheet/table/column:** names are exact and case-sensitive. Run `npm run numbers:init`, then inspect the error log.
- **Automation permission error:** allow Node/Terminal to control Numbers in macOS Privacy & Security → Automation, then rerun manually.
- **Document moved:** update `NUMBERS_DOCUMENT_PATH` in `.env` and reinstall/restart the agent.
- **Server offline:** the agent logs the failure and tries on the next polling pass. It does not crash or discard local state.
- **One ticket repeatedly fails:** the server stores the error and retries after 1, 5, 15, 30, then 60 minutes (60 minutes for later retries). Other due tickets continue.
- **Partial Numbers write:** leave it queued. On retry, the agent detects the already-written Ticket ID and finishes the missing table before acknowledging the server.
- **Manual Status changed:** existing Ticket IDs are never rewritten, so sync will not reset a manually edited status.

## 14. Backup and recovery

Back up both the server SQLite file and `TI Tickets.numbers`. For SQLite, use a provider snapshot or SQLite's online backup tooling while the server is running; copying the database while stopped is also safe. Keep the database even if all rows appear in Numbers because it owns ticket IDs, submission idempotency, raw Tally payloads, and sync history.

If the Numbers document is restored from an older backup, mark affected database rows pending through a future admin tool or restore a matching database snapshot. The Ticket ID check makes replay safe, but version 1 intentionally does not expose a bulk state-reset endpoint.
