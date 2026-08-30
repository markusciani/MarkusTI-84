import { createHmac, timingSafeEqual } from "node:crypto";

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
