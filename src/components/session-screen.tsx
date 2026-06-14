"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Input, Modal, Sheet, Spinner } from "@/components/ui";
import { RuleSelect } from "@/components/rule-select";
import { getDivisionMatches, getEventTeams } from "@/lib/vex/client";
import { programFromEvent, type Program } from "@/lib/vex/rules";
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
type Accent = "primary" | "red" | "blue";
type TeamWithColor = { number: string; color: "red" | "blue" };

function matchTeamsWithColor(m: VexMatch): TeamWithColor[] {
  return m.alliances.flatMap((a) => a.teams.map((t) => ({ number: t.team.name, color: a.color })));
}

function isCompleted(m: VexMatch): boolean {
  if (m.scored === true) return true;
  const scores = m.alliances.map((a) => a.score).filter((s): s is number => typeof s === "number");
  return scores.length >= 2 && scores.some((s) => s > 0);
}

export function SessionScreen({
  event,
  store,
  headerRight,
  backHref,
}: {
  event: VexEvent;
  store: SessionStore;
  headerRight?: React.ReactNode;
  backHref?: string;
}) {
  const { name } = useIdentity();
  const author = name || "Anonymous";
  const program = useMemo<Program>(() => programFromEvent(event.program), [event.program]);

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
  const matches = matchesQ.data ?? [];

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

  const logMany = (list: NewIncident[]) => list.forEach((i) => void store.addIncident(i));
  const add = (input: NewIncident) => void store.addIncident(input);
  const remove = (id: string) => void store.removeIncident(id);

  return (
    <div className="mx-auto max-w-md pb-24">
      <PageHeader
        title={event.name}
        subtitle={`${formatEventDates(event.start, event.end)}${event.location?.city ? " · " + event.location.city : ""}`}
        right={headerRight}
        backHref={backHref}
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
            program={program}
            division={activeDivisionName}
            author={author}
            incidents={store.incidents.filter((i) => i.matchName === openMatch.name)}
            onLogMany={logMany}
            onRemove={remove}
          />
        ) : null}
      </Sheet>

      <Sheet open={!!openTeam} onClose={() => setOpenTeam(null)}>
        {openTeam ? (
          <TeamSheet
            team={openTeam}
            program={program}
            division={activeDivisionName}
            author={author}
            matches={matches}
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
  const upcoming = matches.filter((m) => !isCompleted(m));
  const completed = matches.filter((m) => isCompleted(m));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {divisionName ? `${divisionName} · ` : ""}
          {upcoming.length} upcoming · {completed.length} done
        </span>
        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => query.refetch()}>
          Refresh
        </Button>
      </div>

      {matches.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No matches posted yet. Refresh once the schedule is released.
        </p>
      ) : null}

      {upcoming.map((m, idx) => (
        <MatchRow key={m.id} match={m} flagged={flagged.has(m.name)} nextUp={idx === 0} onOpen={onOpen} />
      ))}

      {completed.length > 0 ? (
        <div className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Completed
        </div>
      ) : null}
      {completed.map((m) => (
        <MatchRow key={m.id} match={m} flagged={flagged.has(m.name)} onOpen={onOpen} dim />
      ))}
    </div>
  );
}

function MatchRow({
  match: m,
  flagged,
  nextUp,
  dim,
  onOpen,
}: {
  match: VexMatch;
  flagged: boolean;
  nextUp?: boolean;
  dim?: boolean;
  onOpen: (m: VexMatch) => void;
}) {
  const red = m.alliances.find((a) => a.color === "red");
  const blue = m.alliances.find((a) => a.color === "blue");
  return (
    <button
      onClick={() => onOpen(m)}
      className={cn(
        "rounded-xl border bg-surface p-3 text-left transition hover:border-primary",
        nextUp ? "border-primary" : "border-border",
        dim ? "opacity-70" : "",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {m.name}
          {nextUp ? <Badge tone="success">Next up</Badge> : null}
        </span>
        <span className="flex items-center gap-2">
          {flagged ? <Badge tone="warning">flagged</Badge> : null}
          <span className="text-xs text-muted-foreground">{m.field ?? roundName(m.round)}</span>
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <AllianceLine color="red" teams={red?.teams.map((t) => t.team.name) ?? []} score={red?.score} />
        <AllianceLine color="blue" teams={blue?.teams.map((t) => t.team.name) ?? []} score={blue?.score} />
      </div>
    </button>
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

/* ------------------------------ Type pickers ------------------------------ */

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

function TeamTypeSelect({
  value,
  accent,
  onChange,
}: {
  value: IncidentType | null;
  accent: Accent;
  onChange: (t: IncidentType | null) => void;
}) {
  const opts: { key: IncidentType | null; label: string }[] = [
    { key: null, label: "—" },
    { key: "dq", label: "DQ" },
    { key: "violation", label: "Viol" },
    { key: "note", label: "Note" },
  ];
  const activeCls = accent === "red" ? "bg-danger text-white" : "bg-primary text-primary-foreground";
  return (
    <div className="flex gap-0.5 rounded-lg border border-border p-0.5">
      {opts.map((o) => (
        <button
          key={String(o.key)}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition",
            value === o.key ? activeCls : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------- Sheets ---------------------------------- */

type TeamConfig = { type: IncidentType | null; rules: string[]; note: string };

function MatchFaultForm({
  match,
  program,
  division,
  author,
  onLogMany,
}: {
  match: VexMatch;
  program: Program;
  division: string | null;
  author: string;
  onLogMany: (list: NewIncident[]) => void;
}) {
  const teams = matchTeamsWithColor(match);
  const [config, setConfig] = useState<Record<string, TeamConfig>>({});
  const [reviewing, setReviewing] = useState(false);

  const get = (t: string): TeamConfig => config[t] ?? { type: null, rules: [], note: "" };
  const set = (t: string, patch: Partial<TeamConfig>) =>
    setConfig((c) => ({ ...c, [t]: { ...get(t), ...patch } }));

  const pending: NewIncident[] = teams
    .filter((t) => get(t.number).type !== null)
    .map((t) => {
      const cfg = get(t.number);
      const type = cfg.type as IncidentType;
      return {
        type,
        team: t.number,
        matchName: match.name,
        matchId: match.id,
        division,
        rules: requiresRule(type) ? cfg.rules : [],
        note: cfg.note.trim(),
        author,
        authorId: null,
      };
    });
  const invalid = pending.some((p) => requiresRule(p.type) && p.rules.length === 0);

  function confirm() {
    onLogMany(pending);
    setConfig({});
    setReviewing(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">Mark faults for any teams in this match, then review and log together.</p>
      {teams.map((t) => {
        const cfg = get(t.number);
        const accent: Accent = t.color === "red" ? "red" : "blue";
        const needsRule = cfg.type ? requiresRule(cfg.type) : false;
        return (
          <div
            key={t.number}
            className={cn("rounded-lg border p-3", t.color === "red" ? "border-danger/30" : "border-primary/30")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn("font-semibold", t.color === "red" ? "text-danger" : "text-primary")}>{t.number}</span>
              <TeamTypeSelect value={cfg.type} accent={accent} onChange={(type) => set(t.number, { type })} />
            </div>
            {cfg.type && needsRule ? (
              <div className="mt-2">
                <RuleSelect program={program} value={cfg.rules} onChange={(rules) => set(t.number, { rules })} accent={accent} />
              </div>
            ) : null}
            {cfg.type ? (
              <textarea
                value={cfg.note}
                onChange={(e) => set(t.number, { note: e.target.value })}
                rows={2}
                placeholder="Note (optional)"
                className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            ) : null}
          </div>
        );
      })}

      <Button onClick={() => setReviewing(true)} disabled={pending.length === 0 || invalid}>
        Review &amp; log{pending.length > 0 ? ` (${pending.length})` : ""}
      </Button>
      {invalid ? <p className="text-xs text-danger">DQ / Violation entries need at least one rule cited.</p> : null}

      <Modal open={reviewing} onClose={() => setReviewing(false)}>
        <h2 className="text-sm font-semibold">
          Confirm {pending.length} entr{pending.length === 1 ? "y" : "ies"} for {match.name}
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {pending.map((p, idx) => (
            <div key={idx} className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{p.team}</span>
                <Badge tone={INCIDENT_TYPE_TONE[p.type]}>{INCIDENT_TYPE_LABELS[p.type]}</Badge>
              </div>
              {p.rules.length ? <div className="text-xs text-muted-foreground">{p.rules.join(", ")}</div> : null}
              {p.note ? <div className="text-xs text-muted-foreground">{p.note}</div> : null}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setReviewing(false)}>
            Back
          </Button>
          <Button className="flex-1" onClick={confirm}>
            Log all
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function MatchSheet({
  match,
  program,
  division,
  author,
  incidents,
  onLogMany,
  onRemove,
}: {
  match: VexMatch;
  program: Program;
  division: string | null;
  author: string;
  incidents: Incident[];
  onLogMany: (list: NewIncident[]) => void;
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
        <MatchFaultForm match={match} program={program} division={division} author={author} onLogMany={onLogMany} />
      </div>
      {incidents.length > 0 ? <IncidentList title="This match" incidents={incidents} onRemove={onRemove} showTeam /> : null}
    </div>
  );
}

function IncidentForm({
  program,
  teamOptions,
  fixedTeam,
  division,
  matchOptions,
  author,
  onAdd,
}: {
  program: Program;
  teamOptions: string[];
  fixedTeam?: string;
  division: string | null;
  matchOptions?: VexMatch[];
  author: string;
  onAdd: (i: NewIncident) => void;
}) {
  const [type, setType] = useState<IncidentType>("violation");
  const [team, setTeam] = useState(fixedTeam ?? teamOptions[0] ?? "");
  const [rules, setRules] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [matchKey, setMatchKey] = useState("");

  const selectedMatch = matchOptions?.find((m) => String(m.id) === matchKey) ?? null;
  const needsRule = requiresRule(type);
  const dqNeedsMatch = type === "dq" && !selectedMatch;
  const canSubmit = team.trim() !== "" && (!needsRule || rules.length > 0) && !dqNeedsMatch;

  function submit() {
    if (!canSubmit) return;
    onAdd({
      type,
      team: team.trim(),
      matchName: selectedMatch?.name ?? null,
      matchId: selectedMatch?.id ?? null,
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

      {matchOptions ? (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Match</label>
          <select
            value={matchKey}
            onChange={(e) => setMatchKey(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">General (no match)</option>
            {matchOptions.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name}
              </option>
            ))}
          </select>
          {dqNeedsMatch ? <p className="mt-1 text-xs text-danger">A DQ must be tied to a match.</p> : null}
        </div>
      ) : null}

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
            <RuleSelect program={program} value={rules} onChange={setRules} />
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
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      </div>

      <Button onClick={submit} disabled={!canSubmit}>
        Log {INCIDENT_TYPE_SHORT[type]}
        {team ? ` · ${team}` : ""}
      </Button>
    </div>
  );
}

function TeamSheet({
  team,
  program,
  division,
  author,
  matches,
  incidents,
  onAdd,
  onRemove,
}: {
  team: { number: string; name: string };
  program: Program;
  division: string | null;
  author: string;
  matches: VexMatch[];
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
      <p className="mt-1 text-xs text-muted-foreground">Tie this entry to a match, or log it as general. A DQ requires a match.</p>
      <div className="mt-3">
        <IncidentForm
          program={program}
          teamOptions={[team.number]}
          fixedTeam={team.number}
          division={division}
          matchOptions={matches}
          author={author}
          onAdd={onAdd}
        />
      </div>
      {incidents.length > 0 ? <IncidentList title={`All entries for ${team.number}`} incidents={incidents} onRemove={onRemove} /> : null}
    </div>
  );
}
