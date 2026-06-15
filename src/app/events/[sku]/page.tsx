"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button, Input, Modal, Spinner } from "@/components/ui";
import { SessionScreen } from "@/components/session-screen";
import { useIdentity } from "@/components/identity-provider";
import { getEventBySku } from "@/lib/vex/client";
import { readLocalIncidents, useLocalSession } from "@/lib/local-session";
import { recordRecent, setRecentOnline } from "@/lib/recents";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function EventSessionPage() {
  const params = useParams<{ sku: string }>();
  const sku = params.sku;
  const router = useRouter();
  const store = useLocalSession(sku);
  const { name, setName } = useIdentity();

  const eventQ = useQuery({ queryKey: ["event", sku], queryFn: () => getEventBySku(sku), enabled: !!sku });
  const event = eventQ.data ?? null;

  useEffect(() => {
    if (event) recordRecent({ sku, name: event.name, city: event.location?.city ?? null });
  }, [event, sku]);

  const [online, setOnline] = useState<{ state: "idle" | "working" | "error"; message?: string }>({ state: "idle" });
  const [namePrompt, setNamePrompt] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [confirmOnline, setConfirmOnline] = useState(false);

  function goOnline() {
    if (!name.trim()) {
      setDraftName(name);
      setNamePrompt(true);
      return;
    }
    setConfirmOnline(true);
  }

  function confirmName() {
    const n = draftName.trim();
    if (!n) return;
    setName(n);
    setNamePrompt(false);
    setConfirmOnline(true);
  }

  async function doGoOnline() {
    setConfirmOnline(false);
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
      const code = (row.code as string) ?? "";

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

      setRecentOnline(sku, { sessionId, code });
      router.replace(`/session/${sessionId}`);
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
          <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={goOnline} disabled={online.state === "working"}>
            {online.state === "working" ? "Going online…" : "Go online"}
          </Button>
        }
      />

      <Modal open={namePrompt} onClose={() => setNamePrompt(false)}>
        <h2 className="text-sm font-semibold">Set your name</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Hosting a shared session needs a name so others can see who logged what.
        </p>
        <Input className="mt-3" value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="e.g. Head Ref Sam" autoFocus />
        <Button className="mt-3 w-full" onClick={confirmName} disabled={!draftName.trim()}>
          Continue
        </Button>
      </Modal>

      <Modal open={confirmOnline} onClose={() => setConfirmOnline(false)}>
        <h2 className="text-sm font-semibold">Go online &amp; share this session?</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          This publishes the session to the cloud and generates a 6-character code. Other referees enter the code to
          request access; once you approve them, everyone&apos;s DQs, violations, and notes sync live and show who logged
          each one. Your current local entries are uploaded.
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmOnline(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={() => void doGoOnline()}>
            Go online
          </Button>
        </div>
      </Modal>

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
