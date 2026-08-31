import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import type { GoogleSheetSource } from "./sources.js";

interface ServiceAccount { client_email: string; private_key: string; token_uri?: string }
let cachedToken: { value: string; expiresAt: number } | undefined;

function serviceAccount(): ServiceAccount | undefined {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const file = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
  if (!inline && !file) return undefined;
  return JSON.parse(inline || readFileSync(file!, "utf8")) as ServiceAccount;
}

export function googleSheetsConfigured(): boolean {
  try { return Boolean(serviceAccount()?.client_email); } catch { return false; }
}

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const account = serviceAccount();
  if (!account) throw new Error("Private Google Sheets access is not configured on this server");
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: account.client_email, scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: account.token_uri || "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600
  })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(account.private_key, "base64url")}`;
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const body = await response.json() as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !body.access_token) throw new Error(body.error_description || "Google authentication failed");
  cachedToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in || 3600) * 1000 };
  return body.access_token;
}

export async function readGoogleSheet(source: GoogleSheetSource): Promise<unknown[][]> {
  const token = await accessToken();
  const range = encodeURIComponent(`${source.sheetName}!A:DM`);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${source.spreadsheetId}/values/${range}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  const body = await response.json() as { values?: unknown[][]; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message || `Unable to read ${source.title}`);
  return body.values || [];
}
