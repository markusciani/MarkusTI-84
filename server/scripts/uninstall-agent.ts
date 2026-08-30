import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const label = "org.ciani01.titickets.server";
const agentPath = resolve(homedir(), "Library/LaunchAgents", `${label}.plist`);
const uid = process.getuid?.();
if (uid === undefined) throw new Error("Unable to determine current macOS user ID");
try { execFileSync("/bin/launchctl", ["bootout", `gui/${uid}`, agentPath], { stdio: "ignore" }); } catch { /* already stopped */ }
if (existsSync(agentPath)) unlinkSync(agentPath);
console.log(`[INFO] Uninstalled ${label}; database and logs were preserved`);
