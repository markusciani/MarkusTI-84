import "./env.js";
import { createApp } from "./app.js";
import { openDatabase } from "./database/db.js";
import { log } from "./log.js";

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "127.0.0.1";
if (!process.env.API_SECRET) throw new Error("API_SECRET is required");
if (!process.env.BUILDER_PASSWORD_HASH) throw new Error("BUILDER_PASSWORD_HASH is required");
if (!process.env.TALLY_WEBHOOK_SECRET && !process.env.WEBHOOK_PATH_TOKEN && process.env.ALLOW_INSECURE_WEBHOOKS !== "true") {
  throw new Error("Configure TALLY_WEBHOOK_SECRET or WEBHOOK_PATH_TOKEN");
}

const db = openDatabase();
const { app } = createApp(db);
const server = app.listen(port, host, () => log.info("TI ticket server listening", { host, port }));

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
}
