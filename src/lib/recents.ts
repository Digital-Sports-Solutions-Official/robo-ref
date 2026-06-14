"use client";

export interface RecentSession {
  sku: string;
  name: string;
  city?: string | null;
  lastOpenedAt: string;
  online?: { sessionId: string; code: string } | null;
}

const KEY = "roboref.recents";
const MAX_AGE_DAYS = 60;

function read(): RecentSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentSession[];
  } catch {
    return [];
  }
}

function write(list: RecentSession[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/** List recents, newest first, auto-pruning anything older than MAX_AGE_DAYS. */
export function listRecents(): RecentSession[] {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const all = read();
  const kept = all.filter((r) => new Date(r.lastOpenedAt).getTime() >= cutoff);
  if (kept.length !== all.length) write(kept);
  return [...kept].sort((a, b) => (a.lastOpenedAt < b.lastOpenedAt ? 1 : -1));
}

export function recordRecent(entry: { sku: string; name: string; city?: string | null }) {
  const list = read();
  const existing = list.find((r) => r.sku === entry.sku);
  const rest = list.filter((r) => r.sku !== entry.sku);
  rest.unshift({
    sku: entry.sku,
    name: entry.name,
    city: entry.city ?? null,
    lastOpenedAt: new Date().toISOString(),
    online: existing?.online ?? null,
  });
  write(rest);
}

export function setRecentOnline(sku: string, online: { sessionId: string; code: string }) {
  const list = read();
  const idx = list.findIndex((r) => r.sku === sku);
  if (idx >= 0) {
    list[idx] = { ...list[idx], online };
    write(list);
  }
}

/** Remove a recent entry and its cached local incidents. */
export function removeRecent(sku: string) {
  write(read().filter((r) => r.sku !== sku));
  try {
    localStorage.removeItem(`roboref.session.${sku}`);
  } catch {
    /* ignore */
  }
}
