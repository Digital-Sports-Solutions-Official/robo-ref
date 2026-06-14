"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Input } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Allowed code characters: digits 2-9 and A-Z without the ambiguous I and O.
const DISALLOWED = /[^2-9A-HJ-NP-Z]/g;

export default function JoinGroupPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [state, setState] = useState<{ status: "idle" | "joining" | "error"; message?: string }>({
    status: "idle",
  });

  async function join() {
    const clean = code.toUpperCase().replace(DISALLOWED, "").slice(0, 6);
    if (clean.length !== 6) {
      setState({ status: "error", message: "Enter the 6-character group code." });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setState({ status: "error", message: "Online collaboration isn't configured (Supabase env not set)." });
      return;
    }
    setState({ status: "joining" });
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) await supabase.auth.signInAnonymously();
    const { data, error } = await supabase.rpc("join_session", { p_code: clean });
    if (error || !data) {
      setState({ status: "error", message: error?.message ?? "No group found for that code." });
      return;
    }
    router.push(`/session/${data}`);
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Join a Group" />
      <main className="flex flex-col gap-5 px-4 py-6">
        <Card>
          <h2 className="text-sm font-semibold">Enter a group code</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ask the head referee for their 6-character code to share violations and notes live.
          </p>
          <div className="mt-4 flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(DISALLOWED, "").slice(0, 6))}
              placeholder="K7P2QX"
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="text-center font-mono text-2xl tracking-[0.4em]"
            />
            <Button onClick={join} disabled={state.status === "joining"}>
              {state.status === "joining" ? "Joining…" : "Join"}
            </Button>
          </div>
          {state.status === "error" && state.message ? (
            <p className="mt-3 text-xs text-danger">{state.message}</p>
          ) : null}
        </Card>

        <Card className="bg-surface-muted">
          <h2 className="text-sm font-semibold">Want to host a group?</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Start a session from an event, then choose <span className="font-medium">Go online</span> to generate a
            code others can join with.
          </p>
          <Button className="mt-3" variant="outline" onClick={() => router.push("/events")}>
            Search events
          </Button>
        </Card>
      </main>
    </div>
  );
}
