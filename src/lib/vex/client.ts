import type { VexEvent, VexMatch, VexPaginated, VexTeam } from "./types";

export class VexError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "VexError";
  }
}

type QueryValue = string | number | string[] | number[] | undefined;

function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => qs.append(`${key}[]`, String(item)));
    } else {
      qs.append(key, String(value));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function vexFetch<T>(path: string, params?: Record<string, QueryValue>): Promise<T> {
  const res = await fetch(`/api/vex/${path}${buildQuery(params)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new VexError(body?.error ?? `VEX request failed (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

async function vexFetchAll<T>(
  path: string,
  params?: Record<string, QueryValue>,
  maxPages = 8,
): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  for (;;) {
    const res = await vexFetch<VexPaginated<T>>(path, { ...params, page, per_page: 250 });
    if (Array.isArray(res.data)) out.push(...res.data);
    if (!res.meta || res.meta.current_page >= res.meta.last_page) break;
    page += 1;
    if (page > maxPages) break;
  }
  return out;
}

const SKU_PATTERN = /^RE-/i;

/**
 * Search events. VEX events API has no free-text name search, so:
 *  - A SKU-looking query is resolved directly via the `sku` filter.
 *  - Otherwise we pull events in a recent date window and filter by name locally.
 */
export async function searchEvents(query: string): Promise<VexEvent[]> {
  const trimmed = query.trim();

  if (SKU_PATTERN.test(trimmed)) {
    return vexFetchAll<VexEvent>("events", { sku: [trimmed] }, 1);
  }

  const since = new Date();
  since.setDate(since.getDate() - 21);
  const events = await vexFetchAll<VexEvent>(
    "events",
    { start: since.toISOString().slice(0, 10) },
    4,
  );

  if (!trimmed) return events;
  const q = trimmed.toLowerCase();
  return events.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.sku.toLowerCase().includes(q) ||
      (e.location?.city ?? "").toLowerCase().includes(q),
  );
}

export async function getEventBySku(sku: string): Promise<VexEvent | null> {
  const events = await vexFetchAll<VexEvent>("events", { sku: [sku] }, 1);
  return events[0] ?? null;
}

export function getEventTeams(eventId: number): Promise<VexTeam[]> {
  return vexFetchAll<VexTeam>(`events/${eventId}/teams`);
}

export function getDivisionMatches(eventId: number, divisionId: number): Promise<VexMatch[]> {
  return vexFetchAll<VexMatch>(`events/${eventId}/divisions/${divisionId}/matches`);
}
