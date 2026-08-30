export const log = {
  info(message: string, details = "") { console.log(`[INFO] ${message}${details ? ` ${details}` : ""}`); },
  warn(message: string, details = "") { console.warn(`[WARN] ${message}${details ? ` ${details}` : ""}`); },
  error(message: string, details = "") { console.error(`[ERROR] ${message}${details ? ` ${details}` : ""}`); }
};
