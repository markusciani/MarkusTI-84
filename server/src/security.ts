import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function validateTallyRequest(input: {
  body: unknown;
  rawBody?: Buffer;
  receivedSignature?: string;
  signingSecret?: string;
  receivedToken?: string;
  pathToken?: string;
  allowInsecure?: boolean;
}): boolean {
  if (input.signingSecret) {
    if (!input.receivedSignature) return false;
    const candidates = [JSON.stringify(input.body)];
    if (input.rawBody) candidates.unshift(input.rawBody.toString("utf8"));
    return candidates.some((payload) => safeEqual(
      createHmac("sha256", input.signingSecret!).update(payload).digest("base64"),
      input.receivedSignature!
    ));
  }
  if (input.pathToken) return Boolean(input.receivedToken && safeEqual(input.pathToken, input.receivedToken));
  return input.allowInsecure === true;
}

export function validateApiSecret(header: string | undefined, secret: string): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  return safeEqual(header.slice(7), secret);
}

const SESSION_LIFETIME_SECONDS = 8 * 60 * 60;

export function hashBuilderPassword(password: string, salt = randomBytes(16).toString("hex")): string {
  const digest = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

export function validateBuilderPassword(password: string, encodedHash: string): boolean {
  const [algorithm, salt, expected] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  try {
    return safeEqual(scryptSync(password, salt, 32).toString("hex"), expected);
  } catch {
    return false;
  }
}

export function createBuilderSession(secret: string, now = new Date()): string {
  const payload = Buffer.from(JSON.stringify({
    scope: "program-builder",
    exp: Math.floor(now.getTime() / 1000) + SESSION_LIFETIME_SECONDS
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function validateBuilderSession(token: string, secret: string, now = new Date()): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { scope?: string; exp?: number };
    return decoded.scope === "program-builder" && typeof decoded.exp === "number" && decoded.exp > Math.floor(now.getTime() / 1000);
  } catch {
    return false;
  }
}
