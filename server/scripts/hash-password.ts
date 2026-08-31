import { hashBuilderPassword } from "../src/security.js";

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
const password = Buffer.concat(chunks).toString("utf8").trimEnd();
if (!password) throw new Error("Provide the builder password on standard input");
process.stdout.write(`${hashBuilderPassword(password)}\n`);
