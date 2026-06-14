"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Input, Sheet, Spinner } from "@/components/ui";
import { RuleSelect } from "@/components/rule-select";
import { getDivisionMatches, getEventTeams } from "@/lib/vex/client";
import { useIdentity } from "@/components/identity-provider";
import {
  INCIDENT_TYPES,
  INCIDENT_TYPE_LABELS,
  INCIDENT_TYPE_SHORT,
  INCIDENT_TYPE_TONE,
  requiresRule,
  type Incident,
  type IncidentType,
  type NewIncident,
} from "@/lib/session-types";
import type { SessionStore } from "@/lib/session-store";
import type { VexEvent, VexMatch, VexTeam } from "@/lib/vex/types";
import { cn, formatEventDates, roundName } from "@/lib/utils";

type Tab = "matches" | "teams" | "log";

function matchTeams(m: VexMatch): string[] {
  return m.alliances.flatMap((a) => a.teams.map((t) => t.team.name));
}

export function SessionScreen({
  event,
  store,
  headerRight,
}: {
  event: VexEvent;
  store: SessionStore;
  headerRight?: React.ReactNode;
}) {
  const { name } = useIdentity();
  const author = name || "Anonymous";

  const [tab, setTab] = useState<Tab>("matches");
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [openMatch, setOpenMatch] = useState<VexMatch | null>(null);
  const [openTeam, setOpenTeam] = useState<{ number: string; name: string } | null>(null);
  const [teamQuery, setTeamQuery] = useState("");

  const divisions = event.divisions ?? [];
  const activeDivision = divisionId ?? divisions[0]?.id ?? null;
  const activeDivisionName = divisions.find((d) => d.id === activeDivision)?.name ?? null;

  const teamsQ = useQuery({ queryKey: ["teams", event.id], queryFn: () => getEventTeams(event.id) });
  const matchesQ = useQuery({
    queryKey: ["matches", event.id, activeDivision],
    queryFn: () => getDivisionMatches(event.id, activeDivision!),
    enabled: activeDivision != null,
  });

  const incidentsByTeam = useMemo(() => {
    const m = new Map<string, Incident[]>();
    for (const i of store.incidents) {
      const list = m.get(i.team) ?? [];
      list.push(i);
      m.set(i.team, list);
    }
    return m;
  }, [store.incidents]);

  const flaggedMatchNames = useMemo(
    () => new Set(store.incidents.map((i) => i.matchName).filter(Boolean) as string[]),
    [store.incidents],
  );

  const add = (input: NewIncident) => void store.addIncident(input);
  const remove = (id: string) => void store.removeIncident(id);

  return (
    <div className="mx-auto max-w-md pb-24">
      <PageHeader
        title={event.name}
        subtitle={`${formatEventDates(event.start, event.end)}${event.location?.city ? " · " + event.location.city : ""}`}
        right={headerRight}
      />

      {store.error ? (
        <p className="mx-4 mt-3 rounded-lg border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
          {store.error}
        </p>
      ) : null}

      {divisions.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-2">
          {divisions.map((d) => (
            <button
              key={d.id}
              onClick={() => setDivisionId(d.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-sm transition",
                d.id === activeDivision
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {d.name}
            </button>
          ))}
        </div>
      ) : null}

      <nav className="grid grid-cols-3 border-b border-border text-sm">
        {(
          [
            ["matches", "Matches"],
            ["teams", "Teams"],
            ["log", `Log${store.incidents.length ? ` (${store.incidents.length})` : ""}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={cn(
              "border-b-2 px-1 py-2.5 font-medium transition",
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="px-4 py-4">
        {tab === "matches" ? (
          <MatchesTab query={matchesQ} divisionName={activeDivisionName} flagged={flaggedMatchNames} onOpen={setOpenMatch} />
        ) : null}
        {tab === "teams" ? (
          <TeamsTab
            loading={teamsQ.isLoading}
            error={teamsQ.error as Error | null}
            teams={teamsQ.data ?? []}
            query={teamQuery}
            setQuery={setTeamQuery}
            incidentsByTeam={incidentsByTeam}
            onOpen={(number, name) => setOpenTeam({ number, name })}
          />
        ) : null}
        {tab === "log" ? <LogTab incidents={store.incidents} onRemove={remove} /> : null}
      </main>

      <Sheet open={!!openMatch} onClose={() => setOpenMatch(null)}>
        {openMatch ? (
          <MatchSheet
            match={openMatch}
            division={activeDivisionName}
            author={author}
            incidents={store.incidents.filter((i) => i.matchName === openMatch.name)}
            onAdd={add}
            onRemove={remove}
          />
        ) : null}
      </Sheet>

      <Sheet open={!!openTeam} onClose={() => setOpenTeam(null)}>
        {openTeam ? (
          <TeamSheet
            team={openTeam}
            division={activeDivisionName}
            author={author}
            incidents={incidentsByTeam.get(openTeam.number) ?? []}
            onAdd={add}
            onRemove={remove}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

/* --------------------------------- Tabs ----------------------------------- */

function MatchesTab({
  query,
  divisionName,
  flagged,
  onOpen,
}: {
  query: ReturnType<typeof useQuery<VexMatch[]>>;
  divisionName: string | null;
  flagged: Set<string>;
  onOpen: (m: VexMatch) => void;
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
          No matches posted yet. Refresh once the schedule is released.
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
                  {flagged.has(m.name) ? <Badge tone="warning">flagged</Badge> : null}
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
    <div className={cn("rounded-lg px-2 py-1", color === "red" ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary")}>
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
  incidentsByTeam,
  onOpen,
}: {
  loading: boolean;
  error: Error | null;
  teams: VexTeam[];
  query: string;
  setQuery: (s: string) => void;
  incidentsByTeam: Map<string, Incident[]>;
  onOpen: (number: string, name: string) => void;
}) {
  const q = query.toLowerCase();
  const filtered = teams.filter(
    (t) => t.number.toLowerCase().includes(q) || (t.team_name ?? "").toLowerCase().includes(q),
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
          const list = incidentsByTeam.get(t.number) ?? [];
          const dq = list.filter((i) => i.type === "dq").length;
          return (
            <button
              key={t.id}
              onClick={() => onOpen(t.number, t.team_name ?? "")}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-left transition hover:border-primary"
            >
              <span>
                <span className="font-semibold">{t.number}</span>
                <span className="ml-2 text-sm text-muted-foreground">{t.team_name}</span>
              </span>
              <span className="flex items-center gap-1.5">
                {dq > 0 ? <Badge tone="danger">{dq} DQ</Badge> : null}
                {list.length > 0 ? <Badge tone="warning">{list.length}</Badge> : null}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}

function LogTab({ incidents, onRemove }: { incidents: Incident[]; onRemove: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<IncidentType | "all">("all");
  const ql = q.toLowerCase();
  const filtered = incidents.filter(
    (i) =>
      (type === "all" || i.type === type) &&
      (!ql ||
        i.team.toLowerCase().includes(ql) ||
        i.rules.join(" ").toLowerCase().includes(ql) ||
        i.note.toLowerCase().includes(ql)),
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 rounded-lg border border-border p-1 text-sm">
        {(["all", "dq", "violation", "note"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              "flex-1 rounded-md px-2 py-1 transition",
              type === t ? "bg-surface-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "all" ? "All" : INCIDENT_TYPE_SHORT[t]}
          </button>
        ))}
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team, rule, or note" />
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {incidents.length === 0 ? "Nothing logged yet." : "No matches for that filter."}
        </p>
      ) : (
        filtered.map((i) => <IncidentRow key={i.id} incident={i} onRemove={onRemove} showTeam />)
      )}
    </div>
  );
}

/* ------------------------------- Incidents -------------------------------- */

function IncidentRow({
  incident: i,
  onRemove,
  showTeam,
}: {
  incident: Incident;
  onRemove: (id: string) => void;
  showTeam?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold">
          {showTeam ? `${i.team} · ` : ""}
          {i.matchName ?? "No match"}
        </span>
        <Badge tone={INCIDENT_TYPE_TONE[i.type]}>{INCIDENT_TYPE_LABELS[i.type]}</Badge>
      </div>
      {i.rules.length ? <div className="mt-1 text-xs font-medium text-foreground">{i.rules.join(", ")}</div> : null}
      {i.note ? <p className="mt-0.5 text-sm text-muted-foreground">{i.note}</p> : null}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">by {i.author}</span>
        <button onClick={() => onRemove(i.id)} className="text-xs text-danger hover:underline">
          Remove
        </button>
      </div>
    </div>
  );
}

function IncidentList({
  title,
  incidents,
  onRemove,
  showTeam,
}: {
  title: string;
  incidents: Incident[];
  onRemove: (id: string) => void;
  showTeam?: boolean;
}) {
  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-2 flex flex-col gap-2">
        {incidents.map((i) => (
          <IncidentRow key={i.id} incident={i} onRemove={onRemove} showTeam={showTeam} />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- Form ----------------------------------- */

function TypeSelect({ value, onChange }: { value: IncidentType; onChange: (t: IncidentType) => void }) {
  const active: Record<IncidentType, string> = {
    dq: "bg-danger text-white",
    violation: "bg-warning text-white",
    note: "bg-primary text-primary-foreground",
  };
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-border p-1">
      {INCIDENT_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn(
            "rounded-md px-2 py-1.5 text-sm font-medium transition",
            value === t ? active[t] : "text-muted-foreground hover:text-foreground",
          )}
        >
          {INCIDENT_TYPE_SHORT[t]}
        </button>
      ))}
    </div>
  );
}

function IncidentForm({
  teamOptions,
  fixedTeam,
  division,
  matchName,
  matchId,
  author,
  onAdd,
}: {
  teamOptions: string[];
  fixedTeam?: string;
  division: string | null;
  matchName: string | null;
  matchId: number | null;
  author: string;
  onAdd: (i: NewIncident) => void;
}) {
  const [type, setType] = useState<IncidentType>("violation");
  const [team, setTeam] = useState(fixedTeam ?? teamOptions[0] ?? "");
  const [rules, setRules] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const needsRule = requiresRule(type);
  const canSubmit = team.trim() !== "" && (!needsRule || rules.length > 0);

  function submit() {
    if (!canSubmit) return;
    onAdd({
      type,
      team: team.trim(),
      matchName,
      matchId,
      division,
      rules: needsRule ? rules : [],
      note: note.trim(),
      author,
      authorId: null,
    });
    setRules([]);
    setNote("");
  }

  return (
    <div className="flex flex-col gap-3">
      <TypeSelect value={type} onChange={setType} />

      {!fixedTeam && teamOptions.length > 1 ? (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Team</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {teamOptions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTeam(t)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition",
                  team === t ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-surface-muted",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {needsRule ? (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Rule(s) cited (required)</label>
          <div className="mt-1">
            <RuleSelect value={rules} onChange={setRules} />
          </div>
        </div>
      ) : null}

      <div>
        <label className="text-xs font-medium text-muted-foreground">{needsRule ? "Note (optional)" : "Note"}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={needsRule ? "Extra detail (optional)" : "What happened?"}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <Button onClick={submit} disabled={!canSubmit}>
        Log {INCIDENT_TYPE_SHORT[type]}
        {team ? ` · ${team}` : ""}
      </Button>
    </div>
  );
}

/* -------------------------------- Sheets ---------------------------------- */

function MatchSheet({
  match,
  division,
  author,
  incidents,
  onAdd,
  onRemove,
}: {
  match: VexMatch;
  division: string | null;
  author: string;
  incidents: Incident[];
  onAdd: (i: NewIncident) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{match.name}</h2>
        <span className="text-xs text-muted-foreground">
          {roundName(match.round)}
          {match.field ? " · " + match.field : ""}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <AllianceLine color="red" teams={match.alliances.find((a) => a.color === "red")?.teams.map((t) => t.team.name) ?? []} />
        <AllianceLine color="blue" teams={match.alliances.find((a) => a.color === "blue")?.teams.map((t) => t.team.name) ?? []} />
      </div>
      <div className="mt-4">
        <IncidentForm
          teamOptions={matchTeams(match)}
          division={division}
          matchName={match.name}
          matchId={match.id}
          author={author}
          onAdd={onAdd}
        />
      </div>
      {incidents.length > 0 ? <IncidentList title="This match" incidents={incidents} onRemove={onRemove} showTeam /> : null}
    </div>
  );
}

function TeamSheet({
  team,
  division,
  author,
  incidents,
  onAdd,
  onRemove,
}: {
  team: { number: string; name: string };
  division: string | null;
  author: string;
  incidents: Incident[];
  onAdd: (i: NewIncident) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{team.number}</h2>
        <span className="text-xs text-muted-foreground">{team.name}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Logs an entry for this team that isn&apos;t tied to a match.</p>
      <div className="mt-3">
        <IncidentForm
          teamOptions={[team.number]}
          fixedTeam={team.number}
          division={division}
          matchName={null}
          matchId={null}
          author={author}
          onAdd={onAdd}
        />
      </div>
      {incidents.length > 0 ? <IncidentList title={`All entries for ${team.number}`} incidents={incidents} onRemove={onRemove} /> : null}
    </div>
  );
}
