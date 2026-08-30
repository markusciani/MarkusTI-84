type Details = Record<string, string | number | boolean | null | undefined>;

function write(level: "INFO" | "WARN" | "ERROR", message: string, details: Details = {}): void {
  const suffix = Object.entries(details).filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(" ");
  console[level === "ERROR" ? "error" : level === "WARN" ? "warn" : "log"](
    `[${level}] ${message}${suffix ? ` ${suffix}` : ""}`
  );
}

export const log = {
  info: (message: string, details?: Details) => write("INFO", message, details),
  warn: (message: string, details?: Details) => write("WARN", message, details),
  error: (message: string, details?: Details) => write("ERROR", message, details)
};
