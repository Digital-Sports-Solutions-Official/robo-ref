"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button, Modal, Spinner } from "@/components/ui";
import { SessionScreen } from "@/components/session-screen";
import { getEventBySku } from "@/lib/vex/client";
import { readLocalIncidents, useLocalSession } from "@/lib/local-session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function EventSessionPage() {
  const params = useParams<{ sku: string }>();
  const sku = params.sku;
  const router = useRouter();
  const store = useLocalSession(sku);

  const eventQ = useQuery({ queryKey: ["event", sku], queryFn: () => getEventBySku(sku), enabled: !!sku });
  const event = eventQ.data ?? null;

  const [online, setOnline] = useState<{ state: "idle" | "working" | "error"; message?: string }>({
    state: "idle",
  });

  async function goOnline() {
    if (!event) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setOnline({ state: "error", message: "Online sharing isn't configured (Supabase env not set)." });
      return;
    }
    setOnline({ state: "working" });
    try {
      const initial = await supabase.auth.getSession();
      let session = initial.data.session;
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        session = (await supabase.auth.getSession()).data.session;
      }
      const uid = session?.user?.id ?? null;

      const { data: created, error: createErr } = await supabase.rpc("create_session", {
        p_event_sku: sku,
        p_event_name: event.name,
        p_event_id: event.id,
      });
      if (createErr || !created) throw createErr ?? new Error("Could not create the session.");
      const row = Array.isArray(created) ? created[0] : created;
      const sessionId = row.id as string;

      const local = readLocalIncidents(sku);
      if (local.length > 0) {
        const rows = local.map((i) => ({
          session_id: sessionId,
          type: i.type,
          team: i.team,
          match_name: i.matchName,
          match_id: i.matchId,
          division: i.division,
          rules: i.rules,
          notes: i.note,
          author_id: uid,
          author_name: i.author,
        }));
        const { error: upErr } = await supabase.from("incidents").insert(rows);
        if (upErr) throw upErr;
      }

      router.push(`/session/${sessionId}`);
    } catch (e) {
      setOnline({ state: "error", message: (e as Error).message ?? "Failed to go online." });
    }
  }

  if (eventQ.isLoading) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title="Loading event…" />
        <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
          <Spinner /> Fetching event details…
        </div>
      </div>
    );
  }
  if (eventQ.isError || !event) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title="Event" />
        <div className="px-4 py-6">
          <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            {(eventQ.error as Error)?.message ?? `Couldn't load event ${sku}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SessionScreen
        event={event}
        store={store}
        headerRight={
          <Button
            variant="outline"
            className="px-3 py-1.5 text-xs"
            onClick={goOnline}
            disabled={online.state === "working"}
          >
            {online.state === "working" ? "Going online…" : "Go online"}
          </Button>
        }
      />
      <Modal open={online.state === "error"} onClose={() => setOnline({ state: "idle" })}>
        <h2 className="text-sm font-semibold">Couldn&apos;t go online</h2>
        <p className="mt-1 text-xs text-muted-foreground">{online.message}</p>
        <Button className="mt-3 w-full" onClick={() => setOnline({ state: "idle" })}>
          OK
        </Button>
      </Modal>
    </>
  );
}
