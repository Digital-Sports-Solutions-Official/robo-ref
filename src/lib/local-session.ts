"use client";

import { useCallback, useEffect, useState } from "react";
import type { Incident, IncidentType, MatchMeta, NewIncident } from "./session-types";
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

interface Stored {
  incidents: Incident[];
  matchMeta: Record<string, MatchMeta>;
}

function load(sku: string): Stored {
  try {
    const raw = localStorage.getItem(keyFor(sku));
    if (!raw) return { incidents: [], matchMeta: {} };
    const parsed = JSON.parse(raw) as { incidents?: RawIncident[]; matchMeta?: Record<string, MatchMeta> } | RawIncident[];
    const list = Array.isArray(parsed) ? parsed : (parsed.incidents ?? []);
    const matchMeta = (!Array.isArray(parsed) && parsed.matchMeta) || {};
    return { incidents: list.map(normalize), matchMeta };
  } catch {
    return { incidents: [], matchMeta: {} };
  }
}

export function useLocalSession(sku: string): SessionStore {
  const [state, setState] = useState<{ data: Stored; loadedSku: string | null }>({
    data: { incidents: [], matchMeta: {} },
    loadedSku: null,
  });
  const data = state.data;
  const loaded = state.loadedSku === sku;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ data: load(sku), loadedSku: sku });
  }, [sku]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(keyFor(sku), JSON.stringify(data));
    } catch {
      /* ignore quota errors */
    }
  }, [sku, data, loaded]);

  const addIncident = useCallback(
    (input: NewIncident) => {
      const now = new Date().toISOString();
      const incident: Incident = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
      setState((s) => ({ ...s, data: { ...s.data, incidents: [incident, ...s.data.incidents] } }));
    },
    [],
  );

  const updateIncident = useCallback((id: string, patch: Partial<Incident>) => {
    setState((s) => ({
      ...s,
      data: {
        ...s.data,
        incidents: s.data.incidents.map((i) =>
          i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i,
        ),
      },
    }));
  }, []);

  const removeIncident = useCallback((id: string) => {
    setState((s) => ({ ...s, data: { ...s.data, incidents: s.data.incidents.filter((i) => i.id !== id) } }));
  }, []);

  const setMatchMeta = useCallback(
    (matchName: string, _matchId: number | null, meta: { autoWinner: MatchMeta["autoWinner"]; awpWinners: MatchMeta["awpWinners"]; author: string }) => {
      setState((s) => ({
        ...s,
        data: { ...s.data, matchMeta: { ...s.data.matchMeta, [matchName]: { ...meta } } },
      }));
    },
    [],
  );

  return {
    incidents: data.incidents,
    matchMeta: data.matchMeta,
    loaded,
    mode: "local",
    code: null,
    error: null,
    addIncident,
    updateIncident,
    removeIncident,
    setMatchMeta,
  };
}

export function readLocalIncidents(sku: string): Incident[] {
  return load(sku).incidents;
}

export function writeLocalIncidents(sku: string, incidents: Incident[]) {
  const current = load(sku);
  try {
    localStorage.setItem(keyFor(sku), JSON.stringify({ incidents, matchMeta: current.matchMeta }));
  } catch {
    /* ignore */
  }
}
