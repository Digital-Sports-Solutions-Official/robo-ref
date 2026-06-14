"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIdentity } from "@/components/identity-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { listRecents, removeRecent, type RecentSession } from "@/lib/recents";

interface OnlineSession {
  id: string;
  code: string;
  event_sku: string;
  event_name: string | null;
  owner_id: string;
  created_at: string;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function RecentSessions() {
  const { userId } = useIdentity();
  const [locals, setLocals] = useState<RecentSession[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocals(listRecents());
  }, [refreshTick]);

  const onlineQ = useQuery({
    queryKey: ["my-sessions", userId],
    enabled: !!userId,
    queryFn: async (): Promise<OnlineSession[]> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("sessions")
        .select("id, code, event_sku, event_name, owner_id, created_at")
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as OnlineSession[];
    },
  });

  const online = onlineQ.data ?? [];
  const onlineIds = new Set(online.map((o) => o.id));
  const localsToShow = locals.filter((r) => !(r.online && onlineIds.has(r.online.sessionId)));

  if (online.length === 0 && localsToShow.length === 0) return null;

  async function removeOnline(s: OnlineSession) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !userId) return;
    if (s.owner_id === userId) {
      await supabase.from("sessions").delete().eq("id", s.id);
    } else {
      await supabase.from("session_members").delete().eq("session_id", s.id).eq("user_id", userId);
    }
    onlineQ.refetch();
  }

  function removeLocal(sku: string) {
    removeRecent(sku);
    setRefreshTick((t) => t + 1);
  }

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Recent sessions</h2>
      <div className="flex flex-col gap-2">
        {online.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3">
            <Link href={`/session/${s.id}`} className="min-w-0 flex-1">
              <span className="block truncate font-medium">{s.event_name ?? s.event_sku}</span>
              <span className="block text-xs text-muted-foreground">
                <span className="text-success">● Live</span> · code {s.code}
                {s.owner_id === userId ? " · you host" : ""}
              </span>
            </Link>
            <button
              onClick={() => removeOnline(s)}
              aria-label={s.owner_id === userId ? "Delete session" : "Leave session"}
              className="rounded-md p-1 text-muted-foreground transition hover:bg-surface-muted hover:text-danger"
            >
              <CloseIcon />
            </button>
          </div>
        ))}
        {localsToShow.map((r) => (
          <div key={r.sku} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3">
            <Link href={`/events/${encodeURIComponent(r.sku)}`} className="min-w-0 flex-1">
              <span className="block truncate font-medium">{r.name}</span>
              <span className="block text-xs text-muted-foreground">
                On this device{r.city ? ` · ${r.city}` : ""}
              </span>
            </Link>
            <button
              onClick={() => removeLocal(r.sku)}
              aria-label="Remove cached session"
              className="rounded-md p-1 text-muted-foreground transition hover:bg-surface-muted hover:text-danger"
            >
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
