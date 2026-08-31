import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

const label = "org.ciani01.titickets.tunnel";
const uid = process.getuid?.();
if (uid === undefined) throw new Error("Unable to determine current macOS user ID");
const runtimeRoot = resolve(homedir(), "Library/Application Support/TITicketAutomation");
const logDir = resolve(runtimeRoot, "logs");
const tokenPath = resolve(runtimeRoot, "cloudflare-tunnel-token");
const agentPath = resolve(homedir(), "Library/LaunchAgents", `${label}.plist`);
const cloudflared = "/opt/homebrew/bin/cloudflared";
mkdirSync(logDir, { recursive: true });
mkdirSync(dirname(agentPath), { recursive: true });
const token = execFileSync(cloudflared, ["tunnel", "token", "tickets-mti84"], { encoding: "utf8" }).trim();
writeFileSync(tokenPath, `${token}\n`, { mode: 0o600 });
chmodSync(tokenPath, 0o600);
const xml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${label}</string>
  <key>ProgramArguments</key><array>
    <string>${cloudflared}</string><string>tunnel</string><string>--no-autoupdate</string>
    <string>--url</string><string>http://127.0.0.1:8787</string><string>run</string>
    <string>--token-file</string><string>${xml(tokenPath)}</string><string>tickets-mti84</string>
  </array>
  <key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>${xml(resolve(logDir, "tunnel.log"))}</string>
  <key>StandardErrorPath</key><string>${xml(resolve(logDir, "tunnel-error.log"))}</string>
</dict></plist>\n`;
writeFileSync(agentPath, plist, { mode: 0o600 });
try { execFileSync("/bin/launchctl", ["bootout", `gui/${uid}`, agentPath], { stdio: "ignore" }); } catch { /* not loaded */ }
execFileSync("/bin/launchctl", ["bootstrap", `gui/${uid}`, agentPath]);
execFileSync("/bin/launchctl", ["kickstart", `gui/${uid}/${label}`]);
process.stdout.write(`[INFO] Installed and started ${label}\n`);
