"use client";

import { useCallback, useEffect, useState } from "react";
import type { Incident, IncidentType, NewIncident } from "./session-types";
import type { SessionStore } from "./session-store";

const keyFor = (sku: string) => `roboref.session.${sku}`;

type RawIncident = Partial<Incident> & { outcome?: string; notes?: string };

function normalize(raw: RawIncident): Incident {
  const type: IncidentType =
    raw.type ??
    (raw.outcome === "dq" || raw.outcome === "disabled"
      ? "dq"
      : raw.outcome === "major" || raw.outcome === "minor"
        ? "violation"
        : "note");
  return {
    id: raw.id ?? crypto.randomUUID(),
    type,
    team: raw.team ?? "",
    matchName: raw.matchName ?? null,
    matchId: raw.matchId ?? null,
    division: raw.division ?? null,
    rules: raw.rules ?? [],
    note: raw.note ?? raw.notes ?? "",
    author: raw.author ?? "Anonymous",
    authorId: raw.authorId ?? null,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

function load(sku: string): Incident[] {
  try {
    const raw = localStorage.getItem(keyFor(sku));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { incidents?: RawIncident[] } | RawIncident[];
    const list = Array.isArray(parsed) ? parsed : (parsed.incidents ?? []);
    return list.map(normalize);
  } catch {
    return [];
  }
}

export function useLocalSession(sku: string): SessionStore {
  const [state, setState] = useState<{ incidents: Incident[]; loadedSku: string | null }>({
    incidents: [],
    loadedSku: null,
  });
  const incidents = state.incidents;
  const loaded = state.loadedSku === sku;

  useEffect(() => {
    // Hydrate the local-first store from localStorage when the event changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ incidents: load(sku), loadedSku: sku });
  }, [sku]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(keyFor(sku), JSON.stringify({ incidents }));
    } catch {
      /* ignore quota errors */
    }
  }, [sku, incidents, loaded]);

  const addIncident = useCallback((input: NewIncident) => {
    const now = new Date().toISOString();
    const incident: Incident = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    setState((s) => ({ ...s, incidents: [incident, ...s.incidents] }));
  }, []);

  const removeIncident = useCallback((id: string) => {
    setState((s) => ({ ...s, incidents: s.incidents.filter((i) => i.id !== id) }));
  }, []);

  return { incidents, loaded, mode: "local", code: null, error: null, addIncident, removeIncident };
}

/** Read a local session's incidents once (used when uploading to an online session). */
export function readLocalIncidents(sku: string): Incident[] {
  return load(sku);
}
