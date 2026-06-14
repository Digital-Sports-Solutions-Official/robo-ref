"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Incident, IncidentType, NewIncident } from "./session-types";
import type { SessionStore } from "./session-store";

interface DbIncident {
  id: string;
  session_id: string;
  type: IncidentType;
  team: string;
  match_name: string | null;
  match_id: number | null;
  division: string | null;
  rules: string[] | null;
  notes: string | null;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

function fromDb(r: DbIncident): Incident {
  return {
    id: r.id,
    type: r.type,
    team: r.team,
    matchName: r.match_name,
    matchId: r.match_id,
    division: r.division,
    rules: r.rules ?? [],
    note: r.notes ?? "",
    author: r.author_name ?? "Referee",
    authorId: r.author_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function useOnlineSession(sessionId: string, code: string | null): SessionStore {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;
    let channel: RealtimeChannel | null = null;

    (async () => {
      if (!supabase) {
        if (active) {
          setError("Online collaboration isn't configured (Supabase env not set).");
          setLoaded(true);
        }
        return;
      }
      const { data, error: loadError } = await supabase
        .from("incidents")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (loadError) setError(loadError.message);
      else setIncidents((data as DbIncident[]).map(fromDb));
      setLoaded(true);
    })();

    if (supabase) {
      channel = supabase
        .channel(`session-${sessionId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "incidents", filter: `session_id=eq.${sessionId}` },
          (payload) => {
            const inc = fromDb(payload.new as DbIncident);
            setIncidents((prev) => (prev.some((i) => i.id === inc.id) ? prev : [inc, ...prev]));
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "incidents", filter: `session_id=eq.${sessionId}` },
          (payload) => {
            const inc = fromDb(payload.new as DbIncident);
            setIncidents((prev) => prev.map((i) => (i.id === inc.id ? inc : i)));
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "incidents", filter: `session_id=eq.${sessionId}` },
          (payload) => {
            const id = (payload.old as { id?: string }).id;
            if (id) setIncidents((prev) => prev.filter((i) => i.id !== id));
          },
        )
        .subscribe();
    }

    return () => {
      active = false;
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const addIncident = useCallback(
    async (input: NewIncident) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { error: insertError } = await supabase.from("incidents").insert({
        session_id: sessionId,
        type: input.type,
        team: input.team,
        match_name: input.matchName,
        match_id: input.matchId,
        division: input.division,
        rules: input.rules,
        notes: input.note,
        author_id: session?.user?.id ?? null,
        author_name: input.author,
      });
      if (insertError) setError(insertError.message);
      // The realtime INSERT event appends it to local state.
    },
    [sessionId],
  );

  const removeIncident = useCallback(async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("incidents").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
  }, []);

  return { incidents, loaded, mode: "online", code, error, addIncident, removeIncident };
}
