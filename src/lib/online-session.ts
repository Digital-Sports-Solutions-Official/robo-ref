"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Incident, IncidentType, MatchMeta, NewIncident } from "./session-types";
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

interface DbMatchMeta {
  match_name: string;
  auto_winner: string | null;
  awp_winners: string[] | null;
  author_name: string | null;
}

function metaFromRows(rows: DbMatchMeta[] | null): Record<string, MatchMeta> {
  const out: Record<string, MatchMeta> = {};
  for (const r of rows ?? []) {
    out[r.match_name] = {
      autoWinner: (r.auto_winner as MatchMeta["autoWinner"]) ?? null,
      awpWinners: (r.awp_winners as MatchMeta["awpWinners"]) ?? [],
      author: r.author_name ?? "Referee",
    };
  }
  return out;
}

export function useOnlineSession(sessionId: string, code: string | null, enabled = true): SessionStore {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [matchMeta, setMatchMetaState] = useState<Record<string, MatchMeta>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const supabase = getSupabaseBrowserClient();
    let active = true;
    let channel: RealtimeChannel | null = null;

    async function reloadMeta() {
      const sb = getSupabaseBrowserClient();
      if (!sb) return;
      const { data } = await sb.from("match_meta").select("match_name, auto_winner, awp_winners, author_name").eq("session_id", sessionId);
      if (active) setMatchMetaState(metaFromRows(data as DbMatchMeta[] | null));
    }

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
      await reloadMeta();
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
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "match_meta", filter: `session_id=eq.${sessionId}` },
          () => void reloadMeta(),
        )
        .subscribe();
    }

    return () => {
      active = false;
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [sessionId, enabled]);

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
    },
    [sessionId],
  );

  const updateIncident = useCallback(async (id: string, patch: Partial<Incident>) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const db: Record<string, unknown> = {};
    if (patch.type !== undefined) db.type = patch.type;
    if (patch.rules !== undefined) db.rules = patch.rules;
    if (patch.note !== undefined) db.notes = patch.note;
    const { error: updateError } = await supabase.from("incidents").update(db).eq("id", id);
    if (updateError) setError(updateError.message);
  }, []);

  const removeIncident = useCallback(async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("incidents").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
  }, []);

  const setMatchMeta = useCallback(
    async (
      matchName: string,
      matchId: number | null,
      meta: { autoWinner: MatchMeta["autoWinner"]; awpWinners: MatchMeta["awpWinners"]; author: string },
    ) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      // Optimistic local update so the editor sees it immediately.
      setMatchMetaState((prev) => ({ ...prev, [matchName]: { autoWinner: meta.autoWinner, awpWinners: meta.awpWinners, author: meta.author } }));
      const { error: upsertError } = await supabase.from("match_meta").upsert(
        {
          session_id: sessionId,
          match_name: matchName,
          match_id: matchId,
          auto_winner: meta.autoWinner,
          awp_winners: meta.awpWinners,
          author_id: session?.user?.id ?? null,
          author_name: meta.author,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id,match_name" },
      );
      if (upsertError) setError(upsertError.message);
    },
    [sessionId],
  );

  return {
    incidents,
    matchMeta,
    loaded,
    mode: "online",
    code,
    error,
    addIncident,
    updateIncident,
    removeIncident,
    setMatchMeta,
  };
}

/* -------------------------------- Members --------------------------------- */

export interface Member {
  userId: string;
  role: string;
  status: string;
  name: string | null;
  joinedAt: string;
}

interface DbMember {
  user_id: string;
  role: string;
  status: string;
  member_name: string | null;
  joined_at: string;
}

function fromMember(r: DbMember): Member {
  return { userId: r.user_id, role: r.role, status: r.status, name: r.member_name, joinedAt: r.joined_at };
}

export function useMembers(sessionId: string, userId: string | null) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !userId) return;
    let active = true;

    async function load() {
      const sb = getSupabaseBrowserClient();
      if (!sb) return;
      const { data } = await sb
        .from("session_members")
        .select("user_id, role, status, member_name, joined_at")
        .eq("session_id", sessionId);
      if (!active) return;
      setMembers(((data ?? []) as DbMember[]).map(fromMember));
      setLoaded(true);
    }
    load();

    const channel = supabase
      .channel(`members-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_members", filter: `session_id=eq.${sessionId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [sessionId, userId]);

  const my = members.find((m) => m.userId === userId) ?? null;

  const approve = useCallback(
    async (uid: string) => {
      const sb = getSupabaseBrowserClient();
      if (!sb) return;
      await sb.from("session_members").update({ status: "approved" }).eq("session_id", sessionId).eq("user_id", uid);
    },
    [sessionId],
  );

  const removeMember = useCallback(
    async (uid: string) => {
      const sb = getSupabaseBrowserClient();
      if (!sb) return;
      await sb.from("session_members").delete().eq("session_id", sessionId).eq("user_id", uid);
    },
    [sessionId],
  );

  return { members, loaded, myStatus: my?.status ?? null, myRole: my?.role ?? null, approve, removeMember };
}
