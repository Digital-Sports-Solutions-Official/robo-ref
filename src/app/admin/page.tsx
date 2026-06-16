"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { bundledRulesDoc, type Program, type RulesDoc } from "@/lib/vex/rules";
import { cn } from "@/lib/utils";

type AuthStatus = "loading" | "anon" | "not-admin" | "admin";

export default function AdminPage() {
  const [state, setState] = useState<{ status: AuthStatus; email?: string }>({ status: "loading" });

  async function check() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setState({ status: "anon" });
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const email = session?.user?.email ?? undefined;
    if (!session || !email) {
      setState({ status: "anon" });
      return;
    }
    const { data: isAdmin } = await supabase.rpc("is_admin");
    setState({ status: isAdmin ? "admin" : "not-admin", email });
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    setState({ status: "anon" });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- checks admin auth on mount
    void check();
    const supabase = getSupabaseBrowserClient();
    const sub = supabase?.auth.onAuthStateChange(() => void check());
    return () => sub?.data.subscription.unsubscribe();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">RoboRef admin</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← App
        </Link>
      </div>

      <div className="mt-6">
        {state.status === "loading" ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Spinner /> Checking access…
          </div>
        ) : state.status === "anon" ? (
          <LoginForm onDone={check} />
        ) : state.status === "not-admin" ? (
          <Card>
            <h2 className="text-sm font-semibold">Not authorized</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {state.email} isn&apos;t an admin. Ask an existing admin to add your email.
            </p>
            <Button className="mt-3" variant="outline" onClick={signOut}>
              Sign out
            </Button>
          </Card>
        ) : (
          <Dashboard email={state.email ?? ""} onSignOut={signOut} />
        )}
      </div>
    </div>
  );
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMsg("Supabase isn't configured.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const creds = { email: email.trim().toLowerCase(), password };
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword(creds);
        if (error) throw error;
        onDone();
      } else {
        const { error } = await supabase.auth.signUp(creds);
        if (error) throw error;
        setMsg("Account created. If email confirmation is on, confirm via email, then sign in.");
        setMode("signin");
      }
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-sm">
      <h2 className="text-sm font-semibold">Admin {mode === "signin" ? "sign in" : "sign up"}</h2>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
        <Button type="submit" disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
      {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}
      <button
        onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
        className="mt-3 text-xs text-primary hover:underline"
      >
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </Card>
  );
}

function Dashboard({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [tab, setTab] = useState<"usage" | "sessions" | "admins" | "rules">("usage");
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{email}</span>
        </p>
        <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
      <nav className="mt-4 grid grid-cols-4 gap-1 rounded-lg border border-border p-1 text-sm">
        {(["usage", "sessions", "admins", "rules"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-2 py-1.5 font-medium capitalize transition",
              tab === t ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="mt-4">
        {tab === "usage" ? (
          <UsagePanel />
        ) : tab === "sessions" ? (
          <SessionsPanel />
        ) : tab === "admins" ? (
          <AdminsPanel currentEmail={email} />
        ) : (
          <RulesPanel />
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Usage ---------------------------------- */

interface UsageStats {
  sessions: number;
  incidents: number;
  photos: number;
  members: number;
  admins: number;
  db_bytes: number;
  storage_bytes: number;
  photo_bytes: number;
}

const FREE_STORAGE = 1024 ** 3; // 1 GB
const FREE_DB = 500 * 1024 ** 2; // 500 MB
const PROJECT_REF = "lvcqgsbgyikhdqgtiboz";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone = pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-primary";
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {fmtBytes(used)} / {fmtBytes(limit)} · {pct}%
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function UsagePanel() {
  const q = useQuery({
    queryKey: ["admin-usage"],
    queryFn: async (): Promise<UsageStats | null> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return null;
      const { data, error } = await supabase.rpc("admin_usage_stats");
      if (error) throw error;
      return data as UsageStats;
    },
  });

  if (q.isLoading)
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Spinner /> Loading usage…
      </div>
    );
  if (q.isError)
    return (
      <Card>
        <p className="text-sm text-danger">{(q.error as Error).message}</p>
      </Card>
    );
  const u = q.data;
  if (!u)
    return (
      <Card>
        <p className="text-sm text-muted-foreground">Supabase isn&apos;t configured.</p>
      </Card>
    );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Free-tier usage</h3>
          <button onClick={() => q.refetch()} className="text-xs text-primary hover:underline">
            Refresh
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          <Meter label="File storage" used={u.storage_bytes} limit={FREE_STORAGE} />
          <Meter label="Database" used={u.db_bytes} limit={FREE_DB} />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Free plan: 1 GB file storage, 500 MB database. Projects pause after ~1 week of inactivity.
        </p>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold">Activity</h3>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="Sessions" value={u.sessions} />
          <Stat label="Entries" value={u.incidents} />
          <Stat label="Photos" value={u.photos} />
          <Stat label="Members" value={u.members} />
          <Stat label="Admins" value={u.admins} />
          <Stat label="Photo data" value={fmtBytes(u.photo_bytes)} />
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold">Bandwidth / egress</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Egress isn&apos;t available from the API, so it isn&apos;t shown here. The free plan includes 5 GB cached + 5 GB
          uncached per month, shared across database, auth, realtime, and storage.
        </p>
        <a
          href={`https://supabase.com/dashboard/project/${PROJECT_REF}/usage`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-primary hover:underline"
        >
          Open the Supabase usage dashboard →
        </a>
      </Card>
    </div>
  );
}

/* -------------------------------- Sessions -------------------------------- */

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface AdminSession {
  id: string;
  code: string;
  event_sku: string;
  event_name: string | null;
  created_at: string;
  member_count: number;
  incident_count: number;
}

function SessionsPanel() {
  const q = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: async (): Promise<AdminSession[]> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return [];
      const { data, error } = await supabase.rpc("admin_list_sessions");
      if (error) throw error;
      return (data ?? []) as AdminSession[];
    },
  });

  async function del(id: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.from("sessions").delete().eq("id", id);
    q.refetch();
  }

  if (q.isLoading)
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Spinner /> Loading…
      </div>
    );
  const sessions = q.data ?? [];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{sessions.length} active session(s).</p>
      {sessions.map((s) => (
        <Card key={s.id} className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{s.event_name ?? s.event_sku}</div>
            <div className="text-xs text-muted-foreground">
              <span className="font-mono">{s.code}</span> · {formatAge(s.created_at)} old · {s.member_count} members ·{" "}
              {s.incident_count} entries
            </div>
          </div>
          <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => del(s.id)}>
            Delete
          </Button>
        </Card>
      ))}
      {sessions.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No active sessions.</p> : null}
    </div>
  );
}

/* --------------------------------- Admins --------------------------------- */

interface AdminRow {
  email: string;
  added_by: string | null;
  created_at: string;
}

function AdminsPanel({ currentEmail }: { currentEmail: string }) {
  const q = useQuery({
    queryKey: ["admins-list"],
    queryFn: async (): Promise<AdminRow[]> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return [];
      const { data, error } = await supabase.from("admins").select("email, added_by, created_at").order("created_at");
      if (error) throw error;
      return (data ?? []) as AdminRow[];
    },
  });
  const [newEmail, setNewEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function add() {
    const e = newEmail.trim().toLowerCase();
    if (!e) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.from("admins").insert({ email: e, added_by: currentEmail });
    setMsg(error ? error.message : null);
    if (!error) {
      setNewEmail("");
      q.refetch();
    }
  }

  async function remove(e: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.from("admins").delete().eq("email", e);
    q.refetch();
  }

  const admins = q.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-3">
        <h3 className="text-sm font-semibold">Add an admin</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">They sign up at /admin with this email to gain access.</p>
        <div className="mt-2 flex gap-2">
          <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@example.com" />
          <Button onClick={add}>Add</Button>
        </div>
        {msg ? <p className="mt-2 text-xs text-danger">{msg}</p> : null}
      </Card>
      <div className="flex flex-col gap-1.5">
        {admins.map((a) => (
          <div key={a.email} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <span>
              {a.email}
              {a.email === currentEmail.toLowerCase() ? <span className="ml-2 text-xs text-muted-foreground">you</span> : null}
            </span>
            {a.email !== currentEmail.toLowerCase() ? (
              <button onClick={() => remove(a.email)} className="text-xs text-danger hover:underline">
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- Rules --------------------------------- */

function RulesPanel() {
  const [doc, setDoc] = useState<RulesDoc | null>(null);
  const [program, setProgram] = useState<Program>("V5RC");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  async function load() {
    const supabase = getSupabaseBrowserClient();
    let d: RulesDoc | null = null;
    if (supabase) {
      const { data } = await supabase.from("app_config").select("value").eq("key", "rules").maybeSingle();
      if (data?.value) d = data.value as RulesDoc;
    }
    if (!d) d = bundledRulesDoc();
    setDoc(JSON.parse(JSON.stringify(d)) as RulesDoc);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the rules document on mount
    void load();
  }, []);

  function mutate(fn: (d: RulesDoc) => void) {
    setDoc((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev)) as RulesDoc;
      fn(next);
      return next;
    });
  }

  async function save() {
    if (!doc) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("app_config").upsert({ key: "rules", value: doc, updated_at: new Date().toISOString() });
    setMsg(error ? error.message : "Saved. Referees pick up changes on their next load.");
    setSaving(false);
  }

  if (!doc)
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Spinner /> Loading…
      </div>
    );
  const cats = doc.programs[program]?.categories ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-2 bg-background/90 px-1 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 rounded-lg border border-border p-1 text-sm">
            {(["V5RC", "VEXU", "VIQRC"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProgram(p)}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium transition",
                  program === p ? "bg-surface-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <Button onClick={save} disabled={saving} className="px-4 py-1.5 text-sm">
            {saving ? "Saving…" : "Publish"}
          </Button>
        </div>
        {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      </div>

      {cats.map((cat, ci) => {
        const isOpen = open[cat.code] ?? false;
        return (
          <div key={cat.code} className="overflow-hidden rounded-xl border border-border bg-surface">
            <button
              onClick={() => setOpen((o) => ({ ...o, [cat.code]: !isOpen }))}
              className="flex w-full items-center justify-between px-3 py-3 text-left"
            >
              <span className="text-sm font-semibold">
                {cat.label}{" "}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({cat.code} · {cat.rules.length})
                </span>
              </span>
              <svg
                className={cn("shrink-0 transition-transform", isOpen ? "rotate-180" : "")}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {isOpen ? (
              <div className="flex flex-col gap-3 border-t border-border p-3">
                {cat.rules.map((r, ri) => (
                  <div key={ri} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-surface-muted px-2 py-0.5 font-mono text-xs font-semibold">{r.id}</span>
                      <button
                        onClick={() =>
                          mutate((d) => {
                            d.programs[program].categories[ci].rules.splice(ri, 1);
                          })
                        }
                        aria-label={`Delete ${r.id}`}
                        className="inline-flex size-8 items-center justify-center rounded-md text-danger transition hover:bg-danger/10"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        </svg>
                      </button>
                    </div>
                    <Input
                      className="mt-2 py-2 text-sm"
                      value={r.title}
                      onChange={(e) =>
                        mutate((d) => {
                          d.programs[program].categories[ci].rules[ri].title = e.target.value;
                        })
                      }
                      placeholder="Title"
                    />
                    <textarea
                      value={r.description}
                      onChange={(e) =>
                        mutate((d) => {
                          d.programs[program].categories[ci].rules[ri].description = e.target.value;
                        })
                      }
                      rows={3}
                      placeholder="Description (shown on long-press)"
                      className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                ))}
                <button
                  onClick={() => {
                    const id = window.prompt(`New ${cat.code} rule id (e.g. ${cat.code}99)`)?.trim();
                    if (!id) return;
                    mutate((d) => {
                      d.programs[program].categories[ci].rules.push({ id, title: "", description: "" });
                    });
                    setOpen((o) => ({ ...o, [cat.code]: true }));
                  }}
                  className="rounded-lg border border-dashed border-border py-2 text-sm font-medium text-primary transition hover:bg-surface-muted"
                >
                  + Add rule
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
