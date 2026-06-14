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
    if (Array.isArray(value)) value.forEach((item) => qs.append(`${key}[]`, String(item)));
    else qs.append(key, String(value));
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

export interface EventSearchParams {
  /** Free text: matched against event name, SKU, and city. A SKU resolves directly. */
  query?: string;
  /** Inclusive ISO date (YYYY-MM-DD) lower bound on event start. */
  start?: string;
  /** Inclusive ISO date (YYYY-MM-DD) upper bound on event start. */
  end?: string;
}

/**
 * Search events by term and/or date range. The VEX API has no free-text name
 * search, so we fetch a date-bounded window server-side and filter by term
 * locally; a SKU-looking term resolves directly.
 */
export async function searchEvents({ query = "", start, end }: EventSearchParams): Promise<VexEvent[]> {
  const trimmed = query.trim();

  if (SKU_PATTERN.test(trimmed)) {
    return vexFetchAll<VexEvent>("events", { sku: [trimmed] }, 1);
  }

  const params: Record<string, QueryValue> = {};
  if (start) params.start = start;
  if (end) params.end = end;
  if (!start && !end) {
    const since = new Date();
    since.setDate(since.getDate() - 21);
    params.start = since.toISOString().slice(0, 10);
  }

  const events = await vexFetchAll<VexEvent>("events", params, 5);
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
