"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Card, Input, Spinner } from "@/components/ui";
import { getDivisionMatches, getEventBySku, getEventTeams } from "@/lib/vex/client";
import { useLocalSession } from "@/lib/local-session";
import { useIdentity } from "@/components/identity-provider";
import { OUTCOME_LABELS, OUTCOME_TONE, type Incident, type IncidentOutcome } from "@/lib/session-types";
import { formatEventDates, roundName } from "@/lib/utils";
import type { VexMatch } from "@/lib/vex/types";

type Tab = "matches" | "teams" | "violations" | "notes";

function matchTeams(m: VexMatch): { number: string; color: "red" | "blue" }[] {
  return m.alliances.flatMap((a) => a.teams.map((t) => ({ number: t.team.name, color: a.color })));
}

export default function SessionPage() {
  const params = useParams<{ sku: string }>();
  const sku = params.sku;
  const { name } = useIdentity();
  const author = name || "Anonymous";

  const [tab, setTab] = useState<Tab>("matches");
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [openMatch, setOpenMatch] = useState<VexMatch | null>(null);
  const [teamQuery, setTeamQuery] = useState("");
  const [vQuery, setVQuery] = useState("");

  const session = useLocalSession(sku);

  const eventQ = useQuery({ queryKey: ["event", sku], queryFn: () => getEventBySku(sku), enabled: !!sku });
  const event = eventQ.data ?? null;
  const divisions = event?.divisions ?? [];
  const activeDivision = divisionId ?? divisions[0]?.id ?? null;
  const activeDivisionName = divisions.find((d) => d.id === activeDivision)?.name;

  const teamsQ = useQuery({
    queryKey: ["teams", event?.id],
    queryFn: () => getEventTeams(event!.id),
    enabled: !!event,
  });

  const matchesQ = useQuery({
    queryKey: ["matches", event?.id, activeDivision],
    queryFn: () => getDivisionMatches(event!.id, activeDivision!),
    enabled: !!event && activeDivision != null,
  });

  const incidentsByTeam = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of session.incidents) map.set(i.team, (map.get(i.team) ?? 0) + 1);
    return map;
  }, [session.incidents]);

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
    <div className="mx-auto max-w-md pb-24">
      <PageHeader
        title={event.name}
        subtitle={`${formatEventDates(event.start, event.end)}${event.location?.city ? " · " + event.location.city : ""}`}
        right={<GoOnlineButton sku={sku} />}
      />

      {/* Division switcher */}
      {divisions.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-2">
          {divisions.map((d) => (
            <button
              key={d.id}
              onClick={() => setDivisionId(d.id)}
              className={
                "shrink-0 rounded-full px-3 py-1 text-sm transition " +
                (d.id === activeDivision
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-muted text-muted-foreground hover:text-foreground")
              }
            >
              {d.name}
            </button>
          ))}
        </div>
      ) : null}

      {/* Tabs */}
      <nav className="grid grid-cols-4 border-b border-border text-sm">
        {(
          [
            ["matches", "Matches"],
            ["teams", "Teams"],
            ["violations", `Violations${session.incidents.length ? ` (${session.incidents.length})` : ""}`],
            ["notes", `Notes${session.notes.length ? ` (${session.notes.length})` : ""}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={
              "border-b-2 px-1 py-2.5 font-medium transition " +
              (tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="px-4 py-4">
        {tab === "matches" ? (
          <MatchesTab
            query={matchesQ}
            divisionName={activeDivisionName}
            onOpen={(m) => setOpenMatch(m)}
            incidentMatchNames={new Set(session.incidents.map((i) => i.matchName).filter(Boolean) as string[])}
          />
        ) : null}

        {tab === "teams" ? (
          <TeamsTab
            loading={teamsQ.isLoading}
            error={teamsQ.error as Error | null}
            teams={teamsQ.data ?? []}
            query={teamQuery}
            setQuery={setTeamQuery}
            counts={incidentsByTeam}
            onSelect={(num) => {
              setVQuery(num);
              setTab("violations");
            }}
          />
        ) : null}

        {tab === "violations" ? (
          <ViolationsTab
            incidents={session.incidents}
            query={vQuery}
            setQuery={setVQuery}
            onRemove={session.removeIncident}
          />
        ) : null}

        {tab === "notes" ? (
          <NotesTab
            notes={session.notes}
            onAdd={(body) => session.addNote({ body, author })}
          />
        ) : null}
      </main>

      {openMatch ? (
        <MatchDrawer
          match={openMatch}
          author={author}
          divisionName={activeDivisionName}
          incidents={session.incidents.filter((i) => i.matchName === openMatch.name)}
          onClose={() => setOpenMatch(null)}
          onAddIncident={(input) => session.addIncident(input)}
          onAddNote={(body) => session.addNote({ body, author, matchName: openMatch.name })}
        />
      ) : null}
    </div>
  );
}

/* ---------------------------------- Tabs ---------------------------------- */

function MatchesTab({
  query,
  divisionName,
  onOpen,
  incidentMatchNames,
}: {
  query: ReturnType<typeof useQuery<VexMatch[]>>;
  divisionName?: string;
  onOpen: (m: VexMatch) => void;
  incidentMatchNames: Set<string>;
}) {
  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner /> Loading matches…
      </div>
    );
  }
  if (query.isError) {
    return (
      <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
        {(query.error as Error)?.message ?? "Couldn't load matches."}
      </p>
    );
  }
  const matches = query.data ?? [];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {divisionName ? `${divisionName} · ` : ""}
          {matches.length} match{matches.length === 1 ? "" : "es"}
        </span>
        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => query.refetch()}>
          Refresh
        </Button>
      </div>
      {matches.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No matches posted yet. Pull to refresh once the schedule is released.
        </p>
      ) : (
        matches.map((m) => {
          const red = m.alliances.find((a) => a.color === "red");
          const blue = m.alliances.find((a) => a.color === "blue");
          return (
            <button
              key={m.id}
              onClick={() => onOpen(m)}
              className="rounded-xl border border-border bg-surface p-3 text-left transition hover:border-primary"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{m.name}</span>
                <span className="flex items-center gap-2">
                  {incidentMatchNames.has(m.name) ? <Badge tone="warning">flagged</Badge> : null}
                  <span className="text-xs text-muted-foreground">{m.field ?? roundName(m.round)}</span>
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <AllianceLine color="red" teams={red?.teams.map((t) => t.team.name) ?? []} score={red?.score} />
                <AllianceLine color="blue" teams={blue?.teams.map((t) => t.team.name) ?? []} score={blue?.score} />
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

function AllianceLine({ color, teams, score }: { color: "red" | "blue"; teams: string[]; score?: number | null }) {
  return (
    <div
      className={
        "rounded-lg px-2 py-1 " +
        (color === "red" ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary")
      }
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{teams.join("  ") || "—"}</span>
        {typeof score === "number" ? <span className="font-mono text-xs">{score}</span> : null}
      </div>
    </div>
  );
}

function TeamsTab({
  loading,
  error,
  teams,
  query,
  setQuery,
  counts,
  onSelect,
}: {
  loading: boolean;
  error: Error | null;
  teams: { id: number; number: string; team_name: string; organization?: string | null }[];
  query: string;
  setQuery: (s: string) => void;
  counts: Map<string, number>;
  onSelect: (num: string) => void;
}) {
  const filtered = teams.filter(
    (t) =>
      t.number.toLowerCase().includes(query.toLowerCase()) ||
      (t.team_name ?? "").toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="flex flex-col gap-2">
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search team number or name" />
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner /> Loading teams…
        </div>
      ) : error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error.message}</p>
      ) : (
        filtered.map((t) => {
          const n = counts.get(t.number) ?? 0;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.number)}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-left transition hover:border-primary"
            >
              <span>
                <span className="font-semibold">{t.number}</span>
                <span className="ml-2 text-sm text-muted-foreground">{t.team_name}</span>
              </span>
              {n > 0 ? <Badge tone="warning">{n}</Badge> : null}
            </button>
          );
        })
      )}
    </div>
  );
}

function ViolationsTab({
  incidents,
  query,
  setQuery,
  onRemove,
}: {
  incidents: Incident[];
  query: string;
  setQuery: (s: string) => void;
  onRemove: (id: string) => void;
}) {
  const q = query.toLowerCase();
  const filtered = incidents.filter(
    (i) =>
      i.team.toLowerCase().includes(q) ||
      i.rules.join(" ").toLowerCase().includes(q) ||
      OUTCOME_LABELS[i.outcome].toLowerCase().includes(q),
  );
  return (
    <div className="flex flex-col gap-2">
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by team, rule, or type" />
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {incidents.length === 0 ? "No violations logged yet." : "No matches for that filter."}
        </p>
      ) : (
        filtered.map((i) => (
          <Card key={i.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold">{i.team}</span>
              <Badge tone={OUTCOME_TONE[i.outcome]}>{OUTCOME_LABELS[i.outcome]}</Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {i.matchName ? i.matchName + " · " : ""}
              {i.rules.length ? i.rules.join(", ") + " · " : ""}
              by {i.author}
            </div>
            {i.notes ? <p className="mt-1 text-sm">{i.notes}</p> : null}
            <button onClick={() => onRemove(i.id)} className="mt-2 text-xs text-danger hover:underline">
              Remove
            </button>
          </Card>
        ))
      )}
    </div>
  );
}

function NotesTab({ notes, onAdd }: { notes: { id: string; body: string; author: string; matchName?: string; createdAt: string }[]; onAdd: (body: string) => void }) {
  const [body, setBody] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Add a shared note…"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <Button
          className="self-end"
          onClick={() => {
            if (body.trim()) {
              onAdd(body.trim());
              setBody("");
            }
          }}
        >
          Add note
        </Button>
      </div>
      {notes.map((n) => (
        <Card key={n.id} className="p-3">
          <p className="text-sm">{n.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {n.matchName ? n.matchName + " · " : ""}
            {n.author} · {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </Card>
      ))}
    </div>
  );
}

/* -------------------------------- Drawer ---------------------------------- */

function MatchDrawer({
  match,
  author,
  divisionName,
  incidents,
  onClose,
  onAddIncident,
  onAddNote,
}: {
  match: VexMatch;
  author: string;
  divisionName?: string;
  incidents: Incident[];
  onClose: () => void;
  onAddIncident: (input: Omit<Incident, "id" | "sku" | "createdAt" | "updatedAt">) => void;
  onAddNote: (body: string) => void;
}) {
  const teams = matchTeams(match);
  const [team, setTeam] = useState(teams[0]?.number ?? "");
  const [outcome, setOutcome] = useState<IncidentOutcome>("minor");
  const [rules, setRules] = useState("");
  const [notes, setNotes] = useState("");
  const [note, setNote] = useState("");

  function logIncident() {
    if (!team) return;
    onAddIncident({
      team,
      outcome,
      rules: rules.split(/[,\s]+/).map((r) => r.trim().toUpperCase()).filter(Boolean),
      notes: notes.trim(),
      author,
      matchName: match.name,
      division: divisionName,
    });
    setRules("");
    setNotes("");
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-background p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{match.name}</h2>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            Close
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {roundName(match.round)}
          {match.field ? " · " + match.field : ""}
        </p>

        {/* Quick-cite chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {teams.map((t) => (
            <button
              key={t.number + t.color}
              onClick={() => setTeam(t.number)}
              className={
                "rounded-full border px-3 py-1 text-sm transition " +
                (team === t.number
                  ? "border-primary bg-primary/10 text-primary"
                  : t.color === "red"
                    ? "border-danger/40 text-danger"
                    : "border-primary/40 text-primary")
              }
            >
              {t.number}
            </button>
          ))}
        </div>

        {/* Incident form */}
        <div className="mt-4 flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">Outcome</label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as IncidentOutcome)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {(Object.keys(OUTCOME_LABELS) as IncidentOutcome[]).map((o) => (
              <option key={o} value={o}>
                {OUTCOME_LABELS[o]}
              </option>
            ))}
          </select>
          <Input value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Rules cited (e.g. SG3, G12)" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Details (optional)"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
          <Button onClick={logIncident} disabled={!team}>
            Log against {team || "team"}
          </Button>
        </div>

        {/* Match note */}
        <div className="mt-4 flex gap-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Quick match note" />
          <Button
            variant="secondary"
            onClick={() => {
              if (note.trim()) {
                onAddNote(note.trim());
                setNote("");
              }
            }}
          >
            Add
          </Button>
        </div>

        {/* Existing incidents for this match */}
        {incidents.length > 0 ? (
          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This match</h3>
            <div className="mt-2 flex flex-col gap-2">
              {incidents.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm">
                  <span>
                    <span className="font-semibold">{i.team}</span>
                    {i.rules.length ? <span className="ml-2 text-muted-foreground">{i.rules.join(", ")}</span> : null}
                  </span>
                  <Badge tone={OUTCOME_TONE[i.outcome]}>{OUTCOME_LABELS[i.outcome]}</Badge>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------- Go online -------------------------------- */

function GoOnlineButton({ sku }: { sku: string }) {
  void sku;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => setOpen(true)}>
        Go online
      </Button>
      {open ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <Card className="max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-semibold">Share this session</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Going online publishes this session to Supabase and generates a 6-digit code other referees can join to
              share violations and notes live, with authorship. This activates once the database migration is applied
              and anonymous auth is enabled.
            </p>
            <Button className="mt-3 w-full" onClick={() => setOpen(false)}>
              Got it
            </Button>
          </Card>
        </div>
      ) : null}
    </>
  );
}
