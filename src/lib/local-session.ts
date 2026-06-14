"use client";

import { useCallback, useEffect, useState } from "react";
import type { Incident, Note } from "./session-types";

interface SessionData {
  incidents: Incident[];
  notes: Note[];
}

const EMPTY: SessionData = { incidents: [], notes: [] };
const keyFor = (sku: string) => `roboref.session.${sku}`;

function load(sku: string): SessionData {
  try {
    const raw = localStorage.getItem(keyFor(sku));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<SessionData>;
    return { incidents: parsed.incidents ?? [], notes: parsed.notes ?? [] };
  } catch {
    return EMPTY;
  }
}

/**
 * Local-first session store. Persists incidents and notes for an event to
 * localStorage so the log works fully offline. (Online sync to Supabase layers
 * on top of this same shape.)
 */
export function useLocalSession(sku: string) {
  const [state, setState] = useState<{ data: SessionData; loadedSku: string | null }>({
    data: EMPTY,
    loadedSku: null,
  });
  const data = state.data;
  const loaded = state.loadedSku === sku;

  useEffect(() => {
    // Hydrate the local-first store from localStorage when the event changes.
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
    (input: Omit<Incident, "id" | "sku" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const incident: Incident = { ...input, id: crypto.randomUUID(), sku, createdAt: now, updatedAt: now };
      setState((s) => ({ ...s, data: { ...s.data, incidents: [incident, ...s.data.incidents] } }));
      return incident;
    },
    [sku],
  );

  const removeIncident = useCallback((id: string) => {
    setState((s) => ({ ...s, data: { ...s.data, incidents: s.data.incidents.filter((i) => i.id !== id) } }));
  }, []);

  const addNote = useCallback(
    (input: Omit<Note, "id" | "sku" | "createdAt">) => {
      const note: Note = { ...input, id: crypto.randomUUID(), sku, createdAt: new Date().toISOString() };
      setState((s) => ({ ...s, data: { ...s.data, notes: [note, ...s.data.notes] } }));
      return note;
    },
    [sku],
  );

  return { incidents: data.incidents, notes: data.notes, loaded, addIncident, removeIncident, addNote };
}
