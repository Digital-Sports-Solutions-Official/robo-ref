export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Human-readable name for a VEX events API match round code. */
export function roundName(round: number): string {
  const map: Record<number, string> = {
    1: "Practice",
    2: "Qualification",
    3: "Round of 16",
    4: "Quarterfinal",
    5: "Semifinal",
    6: "Final",
    9: "Round of 32",
    10: "Round of 64",
    11: "Round of 128",
    15: "Top N",
    16: "Round Robin",
  };
  return map[round] ?? "Match";
}

export function formatEventDates(start?: string | null, end?: string | null): string {
  if (!start) return "";
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  if (!end) return s.toLocaleDateString(undefined, opts);
  const e = new Date(end);
  if (s.toDateString() === e.toDateString()) return s.toLocaleDateString(undefined, opts);
  return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${e.toLocaleDateString(undefined, opts)}`;
}

/** Render a rules array (which may contain duplicates for multiplicity). */
export function formatRules(rules: string[]): string {
  const counts: Record<string, number> = {};
  for (const r of rules) counts[r] = (counts[r] ?? 0) + 1;
  return Object.entries(counts)
    .map(([id, n]) => (n > 1 ? `${id} ×${n}` : id))
    .join(", ");
}
