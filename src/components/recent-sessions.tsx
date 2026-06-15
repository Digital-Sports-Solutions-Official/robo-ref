"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIdentity } from "@/components/identity-provider";
import { Button, Modal } from "@/components/ui";
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

type Confirm =
  | { kind: "online"; session: OnlineSession }
  | { kind: "local"; sku: string; name: string }
  | null;

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
  const [confirm, setConfirm] = useState<Confirm>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocals(listRecents());
  }, [refreshTick]);

  const onlineQ = useQuery({
    queryKey: ["my-sessions", userId],
    enabled: !!userId,
    queryFn: async (): Promise<OnlineSession[]> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase || !userId) return [];
      // Scope to sessions you are a MEMBER of (not all sessions, even for admins).
      const { data, error } = await supabase
        .from("session_members")
        .select("sessions(id, code, event_sku, event_name, owner_id, created_at)")
        .eq("user_id", userId);
      if (error) return [];
      const rows = (data ?? []) as unknown as { sessions: OnlineSession | null }[];
      return rows.map((r) => r.sessions).filter((s): s is OnlineSession => !!s);
    },
  });

  const online = onlineQ.data ?? [];
  const onlineIds = new Set(online.map((o) => o.id));
  const localsToShow = locals.filter((r) => !(r.online && onlineIds.has(r.online.sessionId)));

  if (online.length === 0 && localsToShow.length === 0) return null;

  function dropLocalFor(sessionId: string) {
    const match = locals.find((r) => r.online?.sessionId === sessionId);
    if (match) removeRecent(match.sku);
  }

  async function doRemove() {
    if (!confirm) return;
    const supabase = getSupabaseBrowserClient();
    if (confirm.kind === "online" && supabase && userId) {
      const s = confirm.session;
      if (s.owner_id === userId) await supabase.from("sessions").delete().eq("id", s.id);
      else await supabase.from("session_members").delete().eq("session_id", s.id).eq("user_id", userId);
      dropLocalFor(s.id);
      onlineQ.refetch();
      setRefreshTick((t) => t + 1);
    } else if (confirm.kind === "local") {
      removeRecent(confirm.sku);
      setRefreshTick((t) => t + 1);
    }
    setConfirm(null);
  }

  const isHostConfirm = confirm?.kind === "online" && confirm.session.owner_id === userId;

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
              onClick={() => setConfirm({ kind: "online", session: s })}
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
              <span className="block text-xs text-muted-foreground">On this device{r.city ? ` · ${r.city}` : ""}</span>
            </Link>
            <button
              onClick={() => setConfirm({ kind: "local", sku: r.sku, name: r.name })}
              aria-label="Remove cached session"
              className="rounded-md p-1 text-muted-foreground transition hover:bg-surface-muted hover:text-danger"
            >
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>

      <Modal open={confirm !== null} onClose={() => setConfirm(null)}>
        {confirm ? (
          <>
            <h2 className="text-sm font-semibold">
              {confirm.kind === "online"
                ? isHostConfirm
                  ? "Delete this session?"
                  : "Leave this session?"
                : "Remove from this device?"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {confirm.kind === "online"
                ? isHostConfirm
                  ? "This permanently deletes the live session and all entries for every referee."
                  : "You'll stop seeing this shared session. The host and others keep it."
                : `"${confirm.name}" and its locally cached entries will be deleted from this device.`}
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={doRemove}>
                {confirm.kind === "online" ? (isHostConfirm ? "Delete" : "Leave") : "Delete"}
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </section>
  );
}
