"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button, Modal, Spinner } from "@/components/ui";
import { SessionScreen } from "@/components/session-screen";
import { useIdentity } from "@/components/identity-provider";
import { getEventBySku } from "@/lib/vex/client";
import { useOnlineSession } from "@/lib/online-session";
import { writeLocalIncidents } from "@/lib/local-session";
import { recordRecent } from "@/lib/recents";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface SessionRow {
  id: string;
  code: string;
  event_sku: string;
  event_name: string | null;
  event_id: number | null;
  owner_id: string;
}

export default function OnlineSessionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { userId } = useIdentity();

  const sessionQ = useQuery({
    queryKey: ["session-row", id],
    enabled: !!id,
    queryFn: async (): Promise<SessionRow> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Online collaboration isn't configured (Supabase env not set).");
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) await supabase.auth.signInAnonymously();
      const { data, error } = await supabase
        .from("sessions")
        .select("id, code, event_sku, event_name, event_id, owner_id")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as SessionRow;
    },
  });

  const session = sessionQ.data ?? null;
  const eventQ = useQuery({
    queryKey: ["event", session?.event_sku],
    queryFn: () => getEventBySku(session!.event_sku),
    enabled: !!session,
  });
  const event = eventQ.data ?? null;

  const store = useOnlineSession(id, session?.code ?? null);

  function duplicateLocal() {
    if (!session || !event) return;
    writeLocalIncidents(session.event_sku, store.incidents);
    recordRecent({ sku: session.event_sku, name: event.name, city: event.location?.city ?? null });
    router.push(`/events/${encodeURIComponent(session.event_sku)}`);
  }

  async function deleteOrLeave() {
    const supabase = getSupabaseBrowserClient();
    if (supabase && userId && session) {
      if (session.owner_id === userId) await supabase.from("sessions").delete().eq("id", id);
      else await supabase.from("session_members").delete().eq("session_id", id).eq("user_id", userId);
    }
    router.push("/");
  }

  if (sessionQ.isLoading || (session && eventQ.isLoading)) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title="Loading session…" backHref="/" />
        <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
          <Spinner /> Connecting…
        </div>
      </div>
    );
  }
  if (sessionQ.isError || !session) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title="Live Session" backHref="/" />
        <div className="px-4 py-6">
          <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {(sessionQ.error as Error)?.message ??
              "Couldn't load this session — you may not be a member, or the link is invalid."}
          </p>
        </div>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title={session.event_name ?? "Live Session"} backHref="/" />
        <div className="px-4 py-6">
          <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {(eventQ.error as Error)?.message ?? "Couldn't load the event data for this session."}
          </p>
        </div>
      </div>
    );
  }

  const isOwner = !!userId && session.owner_id === userId;

  return (
    <SessionScreen
      event={event}
      store={store}
      backHref="/"
      headerRight={
        <SessionMenu code={session.code} isOwner={isOwner} onDuplicate={duplicateLocal} onDelete={deleteOrLeave} />
      }
    />
  );
}

function SessionMenu({
  code,
  isOwner,
  onDuplicate,
  onDelete,
}: {
  code: string;
  isOwner: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <>
      <Button variant="outline" className="px-3 py-1.5 font-mono text-xs tracking-widest" onClick={() => setOpen(true)}>
        {code}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <h2 className="text-sm font-semibold">Session</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Others join from Home → Join a Group with this code.
        </p>
        <div className="mt-3 rounded-xl border border-border bg-surface-muted py-4 text-center text-3xl font-bold tracking-[0.3em]">
          {code}
        </div>
        <Button className="mt-2 w-full" onClick={copy}>
          {copied ? "Copied!" : "Copy code"}
        </Button>
        <div className="my-3 border-t border-border" />
        <Button variant="outline" className="w-full" onClick={() => { setOpen(false); onDuplicate(); }}>
          Duplicate as local copy
        </Button>
        <Button variant="danger" className="mt-2 w-full" onClick={() => setConfirmDelete(true)}>
          {isOwner ? "Delete session" : "Leave session"}
        </Button>
      </Modal>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <h2 className="text-sm font-semibold">{isOwner ? "Delete this session?" : "Leave this session?"}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {isOwner
            ? "This permanently deletes the session and all of its entries for every referee."
            : "You'll stop seeing this shared session. The host and other referees keep it."}
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => { setConfirmDelete(false); setOpen(false); onDelete(); }}>
            {isOwner ? "Delete" : "Leave"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
