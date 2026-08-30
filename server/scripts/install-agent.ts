import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const label = "org.ciani01.titickets.server";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const runtimeRoot = resolve(homedir(), "Library/Application Support/TITicketAutomation");
const agentPath = resolve(homedir(), "Library/LaunchAgents", `${label}.plist`);
const logDir = resolve(runtimeRoot, "logs");
const executable = resolve(runtimeRoot, "server/dist/index.js");
const uid = process.getuid?.();
if (uid === undefined) throw new Error("Unable to determine current macOS user ID");

const xml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
mkdirSync(dirname(agentPath), { recursive: true });
mkdirSync(logDir, { recursive: true });
for (const directory of ["server", "shared", "node_modules"]) {
  const target = resolve(runtimeRoot, directory);
  if (existsSync(target)) rmSync(target, { recursive: true });
}
mkdirSync(resolve(runtimeRoot, "server"), { recursive: true });
mkdirSync(resolve(runtimeRoot, "shared"), { recursive: true });
cpSync(resolve(projectRoot, "server/dist"), resolve(runtimeRoot, "server/dist"), { recursive: true });
cpSync(resolve(projectRoot, "server/public"), resolve(runtimeRoot, "server/public"), { recursive: true });
cpSync(resolve(projectRoot, "server/package.json"), resolve(runtimeRoot, "server/package.json"));
cpSync(resolve(projectRoot, "shared/dist"), resolve(runtimeRoot, "shared/dist"), { recursive: true });
cpSync(resolve(projectRoot, "shared/package.json"), resolve(runtimeRoot, "shared/package.json"));
cpSync(resolve(projectRoot, "node_modules"), resolve(runtimeRoot, "node_modules"), { recursive: true, dereference: true });
cpSync(resolve(projectRoot, ".env"), resolve(runtimeRoot, ".env"));
if (!existsSync(resolve(runtimeRoot, "data")) && existsSync(resolve(projectRoot, "data"))) {
  cpSync(resolve(projectRoot, "data"), resolve(runtimeRoot, "data"), { recursive: true });
}
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key><array>
    <string>${xml(process.execPath)}</string><string>${xml(executable)}</string>
  </array>
  <key>WorkingDirectory</key><string>${xml(runtimeRoot)}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>${xml(resolve(logDir, "server.log"))}</string>
  <key>StandardErrorPath</key><string>${xml(resolve(logDir, "server-error.log"))}</string>
</dict></plist>\n`;
writeFileSync(agentPath, plist, { mode: 0o600 });
try { execFileSync("/bin/launchctl", ["bootout", `gui/${uid}`, agentPath], { stdio: "ignore" }); } catch { /* not loaded */ }
execFileSync("/bin/launchctl", ["bootstrap", `gui/${uid}`, agentPath]);
execFileSync("/bin/launchctl", ["kickstart", `gui/${uid}/${label}`]);
console.log(`[INFO] Installed and started ${label}`);
console.log(`[INFO] LaunchAgent: ${agentPath}`);
console.log(`[INFO] Runtime: ${runtimeRoot}`);
