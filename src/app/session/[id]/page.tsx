"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button, Modal, Spinner } from "@/components/ui";
import { SessionScreen } from "@/components/session-screen";
import { getEventBySku } from "@/lib/vex/client";
import { useOnlineSession } from "@/lib/online-session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface SessionRow {
  id: string;
  code: string;
  event_sku: string;
  event_name: string | null;
  event_id: number | null;
}

export default function OnlineSessionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

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
        .select("id, code, event_sku, event_name, event_id")
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

  if (sessionQ.isLoading || (session && eventQ.isLoading)) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title="Loading session…" />
        <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
          <Spinner /> Connecting…
        </div>
      </div>
    );
  }
  if (sessionQ.isError || !session) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title="Live Session" />
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
        <PageHeader title={session.event_name ?? "Live Session"} />
        <div className="px-4 py-6">
          <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {(eventQ.error as Error)?.message ?? "Couldn't load the event data for this session."}
          </p>
        </div>
      </div>
    );
  }

  return <SessionScreen event={event} store={store} headerRight={<ShareCode code={session.code} />} />;
}

function ShareCode({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
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
        <h2 className="text-sm font-semibold">Share this session</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Other referees join from the home screen → Join a Group → enter this code.
        </p>
        <div className="mt-4 rounded-xl border border-border bg-surface-muted py-5 text-center text-3xl font-bold tracking-[0.3em]">
          {code}
        </div>
        <Button className="mt-3 w-full" onClick={copy}>
          {copied ? "Copied!" : "Copy code"}
        </Button>
      </Modal>
    </>
  );
}
