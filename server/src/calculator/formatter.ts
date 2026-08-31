const STATUS_NAMES: Record<string, string> = {
  "WAITING FOR CALCULATOR": "Wait Calc",
  "WAITING FOR USER": "Wait User",
  "READY FOR DELIVERY": "Ready",
  "COMPLETED": "Done"
};

export function calculatorSafeText(value: unknown, maxLength = 26): string {
  const ascii = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”„‟]/g, "\"")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/"/g, "'")
    .replace(/[^A-Z0-9 .,:;?'@#+\-/%&()<>_=]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return ascii.slice(0, Math.max(0, maxLength));
}

export function shortStatus(status: string): string {
  const safe = calculatorSafeText(status, 26);
  return STATUS_NAMES[safe.toUpperCase()] ?? safe;
}

export function wrapCalculatorText(value: unknown, width = 26, maxLines = 12): string[] {
  const safe = calculatorSafeText(value, Math.max(width * maxLines, width));
  if (!safe) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of safe.split(" ")) {
    if (word.length > width) {
      if (current) { lines.push(current); current = ""; }
      for (let index = 0; index < word.length; index += width) lines.push(word.slice(index, index + width));
    } else if (!current) current = word;
    else if (`${current} ${word}`.length <= width) current += ` ${word}`;
    else { lines.push(current); current = word; }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

export function validProgramName(value: string, maxLength = 8): string {
  const safe = calculatorSafeText(value, 128).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const withLetter = /^[A-Z]/.test(safe) ? safe : `P${safe}`;
  return (withLetter || "TILOGS").slice(0, maxLength);
}

export function ticketNumber(ticketId: string): number | undefined {
  const match = ticketId.match(/(\d+)$/);
  return match ? Number(match[1]) : undefined;
}
