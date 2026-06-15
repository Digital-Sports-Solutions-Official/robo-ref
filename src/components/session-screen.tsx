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
  INCIDENT_TYPE_LABELS,
  INCIDENT_TYPE_SHORT,
  INCIDENT_TYPE_TONE,
  type Alliance,
  type Incident,
  type IncidentType,
  type MatchMeta,
  type NewIncident,
} from "@/lib/session-types";
import type { SessionStore } from "@/lib/session-store";
import type { VexDivision, VexEvent, VexMatch, VexTeam } from "@/lib/vex/types";
import { cn, formatEventDates, formatRules, roundName } from "@/lib/utils";

type Tab = "matches" | "teams" | "log";
type TeamWithColor = { number: string; color: "red" | "blue" };
type TeamCfg = { state: "none" | "violation" | "note"; rules: Record<string, number>; note: string; dq: boolean };
type MatchDraft = { name: string; config: Record<string, TeamCfg>; baseline: Record<string, TeamCfg> };

const EMPTY_CFG: TeamCfg = { state: "none", rules: {}, note: "", dq: false };

function matchTeamsWithColor(m: VexMatch): TeamWithColor[] {
  return m.alliances.flatMap((a) => a.teams.map((t) => ({ number: t.team.name, color: a.color })));
}
function isCompleted(m: VexMatch): boolean {
  if (m.scored === true) return true;
  const scores = m.alliances.map((a) => a.score).filter((s): s is number => typeof s === "number");
  return scores.length >= 2 && scores.some((s) => s > 0);
}
function countsToRules(counts: Record<string, number>): string[] {
  const out: string[] = [];
  for (const [id, n] of Object.entries(counts)) for (let i = 0; i < n; i++) out.push(id);
  return out;
}
function rulesToCounts(rules: string[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const r of rules) c[r] = (c[r] ?? 0) + 1;
  return c;
}
function cfgEqual(a: TeamCfg, b: TeamCfg): boolean {
  if (a.state !== b.state || a.dq !== b.dq || a.note !== b.note) return false;
  const ak = Object.keys(a.rules);
  const bk = Object.keys(b.rules);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => a.rules[k] === b.rules[k]);
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
  const { name, userId } = useIdentity();
  const author = name || "Anonymous";
  const program = useMemo<Program>(() => programFromEvent(event.program), [event.program]);
  const isMine = (i: Incident) => store.mode === "local" || (!!userId && i.authorId === userId);

  const [tab, setTab] = useState<Tab>("matches");
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [openMatch, setOpenMatch] = useState<VexMatch | null>(null);
  const [openTeam, setOpenTeam] = useState<{ number: string; name: string } | null>(null);
  const [teamQuery, setTeamQuery] = useState("");
  const [draft, setDraft] = useState<MatchDraft | null>(null);

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

  const violationMatches = useMemo(
    () =>
      new Set(
        store.incidents
          .filter((i) => i.type === "dq" || i.type === "violation")
          .map((i) => i.matchName)
          .filter(Boolean) as string[],
      ),
    [store.incidents],
  );

  const remove = (id: string) => void store.removeIncident(id);

  function submitEntries(entries: { id: string | null; data: NewIncident | null }[]) {
    for (const e of entries) {
      if (!e.data && e.id) void store.removeIncident(e.id);
      else if (e.data && e.id) void store.updateIncident(e.id, { type: e.data.type, rules: e.data.rules, note: e.data.note });
      else if (e.data) void store.addIncident(e.data);
    }
  }

  function openMatchForIncident(inc: Incident) {
    const m = matches.find((mm) => (inc.matchId != null && mm.id === inc.matchId) || mm.name === inc.matchName);
    if (m) {
      setOpenTeam(null);
      setOpenMatch(m);
    }
  }

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
          <MatchesTab
            query={matchesQ}
            divisions={divisions}
            activeDivision={activeDivision}
            onDivision={setDivisionId}
            flagged={violationMatches}
            matchMeta={store.matchMeta}
            onOpen={setOpenMatch}
          />
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
        {tab === "log" ? (
          <LogTab incidents={store.incidents} onRemove={remove} onOpenMatch={openMatchForIncident} isMine={isMine} />
        ) : null}
      </main>

      <Sheet open={!!openMatch} onClose={() => setOpenMatch(null)}>
        {openMatch ? (
          <MatchSheet
            match={openMatch}
            program={program}
            division={activeDivisionName}
            author={author}
            incidentsByTeam={incidentsByTeam}
            isMine={isMine}
            matchMeta={store.matchMeta[openMatch.name]}
            onSetMeta={(meta) => void store.setMatchMeta(openMatch.name, openMatch.id, { ...meta, author })}
            draft={draft}
            onDraft={(name2, config, baseline) => setDraft({ name: name2, config, baseline })}
            onSubmit={submitEntries}
          />
        ) : null}
      </Sheet>

      <Sheet open={!!openTeam} onClose={() => setOpenTeam(null)}>
        {openTeam ? (
          <TeamSheet
            team={openTeam}
            incidents={incidentsByTeam.get(openTeam.number) ?? []}
            onOpenMatch={openMatchForIncident}
            onRemove={remove}
            isMine={isMine}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

/* --------------------------------- Matches -------------------------------- */

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={cn("transition", open ? "rotate-180" : "")} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function MatchesTab({
  query,
  divisions,
  activeDivision,
  onDivision,
  flagged,
  matchMeta,
  onOpen,
}: {
  query: ReturnType<typeof useQuery<VexMatch[]>>;
  divisions: VexDivision[];
  activeDivision: number | null;
  onDivision: (id: number) => void;
  flagged: Set<string>;
  matchMeta: Record<string, MatchMeta>;
  onOpen: (m: VexMatch) => void;
}) {
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  const matches = query.data ?? [];
  const upcoming = matches.filter((m) => !isCompleted(m));
  const completed = matches.filter((m) => isCompleted(m));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        {divisions.length > 1 ? (
          <select
            value={activeDivision ?? ""}
            onChange={(e) => onDivision(Number(e.target.value))}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium outline-none focus:border-primary"
          >
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground">{divisions[0]?.name ?? "Matches"}</span>
        )}
        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => query.refetch()}>
          Refresh
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner /> Loading matches…
        </div>
      ) : query.isError ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {(query.error as Error)?.message ?? "Couldn't load matches."}
        </p>
      ) : matches.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No matches posted yet. Refresh once the schedule is released.
        </p>
      ) : (
        <>
          <button
            onClick={() => setShowUpcoming((v) => !v)}
            className="flex items-center justify-between py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <span>Upcoming ({upcoming.length})</span>
            <Chevron open={showUpcoming} />
          </button>
          {showUpcoming
            ? upcoming.map((m, idx) => (
                <MatchRow key={m.id} match={m} flagged={flagged.has(m.name)} meta={matchMeta[m.name]} nextUp={idx === 0} onOpen={onOpen} />
              ))
            : null}

          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="mt-2 flex items-center justify-between py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <span>Completed ({completed.length})</span>
            <Chevron open={showCompleted} />
          </button>
          {showCompleted
            ? completed.map((m) => (
                <MatchRow key={m.id} match={m} flagged={flagged.has(m.name)} meta={matchMeta[m.name]} onOpen={onOpen} dim />
              ))
            : null}
        </>
      )}
    </div>
  );
}

function MatchRow({
  match: m,
  flagged,
  meta,
  nextUp,
  dim,
  onOpen,
}: {
  match: VexMatch;
  flagged: boolean;
  meta: MatchMeta | undefined;
  nextUp?: boolean;
  dim?: boolean;
  onOpen: (m: VexMatch) => void;
}) {
  const red = m.alliances.find((a) => a.color === "red");
  const blue = m.alliances.find((a) => a.color === "blue");
  const outcomeSet = !!meta && (meta.autoWinner != null || meta.awpWinners.length > 0);
  return (
    <button
      onClick={() => onOpen(m)}
      className={cn(
        "rounded-xl border p-3 text-left transition hover:border-primary",
        flagged ? "border-warning bg-warning/10" : nextUp ? "border-primary bg-surface" : "border-border bg-surface",
        dim ? "opacity-70" : "",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {m.name}
          {nextUp ? <Badge tone="success">Next up</Badge> : null}
        </span>
        <span className="flex items-center gap-2">
          {outcomeSet ? <Badge tone="success">auto ✓</Badge> : null}
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

/* ---------------------------------- Teams --------------------------------- */

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
          const dq = new Set(list.filter((i) => i.type === "dq").map((i) => i.matchName ?? "—")).size;
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

function LogTab({
  incidents,
  onRemove,
  onOpenMatch,
  isMine,
}: {
  incidents: Incident[];
  onRemove: (id: string) => void;
  onOpenMatch: (i: Incident) => void;
  isMine: (i: Incident) => boolean;
}) {
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
        filtered.map((i) => (
          <IncidentRow key={i.id} incident={i} onRemove={onRemove} onOpenMatch={onOpenMatch} showTeam canRemove={isMine(i)} />
        ))
      )}
    </div>
  );
}

function IncidentRow({
  incident: i,
  onRemove,
  onOpenMatch,
  showTeam,
  canRemove,
}: {
  incident: Incident;
  onRemove?: (id: string) => void;
  onOpenMatch?: (i: Incident) => void;
  showTeam?: boolean;
  canRemove?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <button className="block w-full text-left" onClick={() => onOpenMatch?.(i)}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold">
            {showTeam ? `${i.team} · ` : ""}
            {i.matchName ?? "No match"}
          </span>
          <Badge tone={INCIDENT_TYPE_TONE[i.type]}>{INCIDENT_TYPE_LABELS[i.type]}</Badge>
        </div>
        {i.rules.length ? <div className="mt-1 text-xs font-medium text-foreground">{formatRules(i.rules)}</div> : null}
        {i.note ? <p className="mt-0.5 text-sm text-muted-foreground">{i.note}</p> : null}
      </button>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">by {i.author}</span>
        {canRemove && onRemove ? (
          <button onClick={() => onRemove(i.id)} className="text-xs text-danger hover:underline">
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------ Match sheet ------------------------------- */

function MatchOutcome({
  match,
  meta,
  onSet,
}: {
  match: VexMatch;
  meta: MatchMeta | undefined;
  onSet: (m: { autoWinner: MatchMeta["autoWinner"]; awpWinners: Alliance[] }) => void;
}) {
  const hasAlliances =
    match.alliances.some((a) => a.color === "red") && match.alliances.some((a) => a.color === "blue");
  if (!hasAlliances) return null;

  const auto = meta?.autoWinner ?? null;
  const awp = meta?.awpWinners ?? [];
  const setAuto = (w: MatchMeta["autoWinner"]) => onSet({ autoWinner: w, awpWinners: awp });
  const toggleAwp = (a: Alliance) =>
    onSet({ autoWinner: auto, awpWinners: awp.includes(a) ? awp.filter((x) => x !== a) : [...awp, a] });

  const autoCls = (v: MatchMeta["autoWinner"]) =>
    auto === v
      ? v === "red"
        ? "border-danger bg-danger text-white"
        : v === "blue"
          ? "border-primary bg-primary text-primary-foreground"
          : "border-foreground/40 bg-foreground/10 text-foreground"
      : "border-border text-muted-foreground hover:text-foreground";

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Match outcome</h3>
        {meta ? <span className="text-[11px] text-muted-foreground">set by {meta.author}</span> : null}
      </div>
      <label className="mt-2 block text-xs text-muted-foreground">Autonomous winner</label>
      <div className="mt-1 grid grid-cols-4 gap-1">
        {([["red", "Red"], ["blue", "Blue"], ["tie", "Tie"], [null, "None"]] as const).map(([v, l]) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => setAuto(v)}
            className={cn("rounded-md border px-2 py-1.5 text-xs font-medium transition", autoCls(v))}
          >
            {l}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-xs text-muted-foreground">Autonomous Win Point</label>
      <div className="mt-1 grid grid-cols-2 gap-1">
        {(["red", "blue"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => toggleAwp(a)}
            className={cn(
              "rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition",
              awp.includes(a)
                ? a === "red"
                  ? "border-danger bg-danger/15 text-danger"
                  : "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {a} AWP
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchSheet({
  match,
  program,
  division,
  author,
  incidentsByTeam,
  isMine,
  matchMeta,
  onSetMeta,
  draft,
  onDraft,
  onSubmit,
}: {
  match: VexMatch;
  program: Program;
  division: string | null;
  author: string;
  incidentsByTeam: Map<string, Incident[]>;
  isMine: (i: Incident) => boolean;
  matchMeta: MatchMeta | undefined;
  onSetMeta: (m: { autoWinner: MatchMeta["autoWinner"]; awpWinners: Alliance[] }) => void;
  draft: MatchDraft | null;
  onDraft: (name: string, config: Record<string, TeamCfg>, baseline: Record<string, TeamCfg>) => void;
  onSubmit: (entries: { id: string | null; data: NewIncident | null }[]) => void;
}) {
  const teams = matchTeamsWithColor(match);
  const myEntry = (team: string): Incident | undefined =>
    (incidentsByTeam.get(team) ?? []).find((i) => i.matchName === match.name && isMine(i));

  function buildFromEntries(): Record<string, TeamCfg> {
    const init: Record<string, TeamCfg> = {};
    for (const t of teams) {
      const e = myEntry(t.number);
      if (e) init[t.number] = { state: e.type === "note" ? "note" : "violation", rules: rulesToCounts(e.rules), note: e.note, dq: e.type === "dq" };
    }
    return init;
  }

  const restore = draft && draft.name === match.name;
  const [config, setConfig] = useState<Record<string, TeamCfg>>(() => (restore ? draft!.config : buildFromEntries()));
  const [baseline, setBaseline] = useState<Record<string, TeamCfg>>(() => (restore ? draft!.baseline : buildFromEntries()));
  const [expanded, setExpanded] = useState<string | null>(teams[0]?.number ?? null);
  const [reviewing, setReviewing] = useState(false);

  const get = (map: Record<string, TeamCfg>, t: string): TeamCfg => map[t] ?? EMPTY_CFG;
  function set(t: string, patch: Partial<TeamCfg>) {
    const next = { ...config, [t]: { ...get(config, t), ...patch } };
    setConfig(next);
    onDraft(match.name, next, baseline);
  }

  function priorCountsFor(team: string): Record<string, number> {
    const mineId = myEntry(team)?.id;
    const c: Record<string, number> = {};
    for (const i of incidentsByTeam.get(team) ?? []) {
      if ((i.type === "violation" || i.type === "dq") && i.id !== mineId) for (const r of i.rules) c[r] = (c[r] ?? 0) + 1;
    }
    return c;
  }

  const changed = teams.filter((t) => {
    if (cfgEqual(get(config, t.number), get(baseline, t.number))) return false;
    // Actionable: a real entry (state != none), or clearing a previously saved one.
    return get(config, t.number).state !== "none" || !!myEntry(t.number);
  });
  const invalid =
    changed.some((t) => get(config, t.number).state === "violation" && Object.keys(get(config, t.number).rules).length === 0) ||
    changed.some((t) => get(config, t.number).state === "note" && !get(config, t.number).note.trim());

  function save() {
    const entries = changed.map((t) => {
      const cfg = get(config, t.number);
      const existing = myEntry(t.number);
      if (cfg.state === "none") return { id: existing?.id ?? null, data: null };
      const type: IncidentType = cfg.state === "violation" ? (cfg.dq ? "dq" : "violation") : "note";
      const data: NewIncident = {
        type,
        team: t.number,
        matchName: match.name,
        matchId: match.id,
        division,
        rules: cfg.state === "violation" ? countsToRules(cfg.rules) : [],
        note: cfg.note.trim(),
        author,
        authorId: null,
      };
      return { id: existing?.id ?? null, data };
    });
    onSubmit(entries);
    const nb = JSON.parse(JSON.stringify(config)) as Record<string, TeamCfg>;
    setBaseline(nb);
    onDraft(match.name, config, nb);
    setReviewing(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{match.name}</h2>
        <span className="text-xs text-muted-foreground">
          {roundName(match.round)}
          {match.field ? " · " + match.field : ""}
        </span>
      </div>

      <MatchOutcome match={match} meta={matchMeta} onSet={onSetMeta} />

      {teams.map((t) => {
        const cfg = get(config, t.number);
        const accent = t.color === "red" ? "red" : "blue";
        const isOpen = expanded === t.number;
        return (
          <div key={t.number} className={cn("overflow-hidden rounded-xl border", t.color === "red" ? "border-danger/30" : "border-primary/30")}>
            <button
              onClick={() => setExpanded(isOpen ? null : t.number)}
              className={cn("flex w-full items-center justify-between px-3 py-2.5", cfg.state === "violation" ? "bg-warning/15" : "")}
            >
              <span className={cn("font-semibold", t.color === "red" ? "text-danger" : "text-primary")}>{t.number}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {cfg.state === "violation" ? (
                  <Badge tone={cfg.dq ? "danger" : "warning"}>
                    {cfg.dq ? "DQ" : "Violation"}
                    {Object.keys(cfg.rules).length ? ` · ${countsToRules(cfg.rules).length}` : ""}
                  </Badge>
                ) : cfg.state === "note" ? (
                  <Badge>Note</Badge>
                ) : (
                  <span>—</span>
                )}
                <Chevron open={isOpen} />
              </span>
            </button>

            {isOpen ? (
              <div className="border-t border-border px-3 py-3">
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-border p-1">
                  {(["none", "violation", "note"] as const).map((s) => {
                    const activeCls = t.color === "red" ? "bg-danger text-white" : "bg-primary text-primary-foreground";
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set(t.number, { state: s, dq: s === "violation" ? cfg.dq : false })}
                        className={cn(
                          "rounded-md px-2 py-1.5 text-sm font-medium transition",
                          cfg.state === s ? activeCls : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {s === "none" ? "—" : s === "violation" ? "Violation" : "Note"}
                      </button>
                    );
                  })}
                </div>

                {cfg.state === "violation" ? (
                  <>
                    <div className="mt-3">
                      <RuleSelect program={program} value={cfg.rules} onChange={(rules) => set(t.number, { rules })} accent={accent} priorCounts={priorCountsFor(t.number)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => set(t.number, { dq: !cfg.dq })}
                      className={cn(
                        "mt-3 w-full rounded-lg border py-2.5 text-sm font-semibold transition",
                        cfg.dq ? "border-danger bg-danger text-white" : "border-danger/50 text-danger hover:bg-danger/10",
                      )}
                    >
                      {cfg.dq ? "Disqualified — tap to undo" : "Mark Disqualification"}
                    </button>
                  </>
                ) : null}

                {cfg.state !== "none" ? (
                  <div className="mt-3">
                    <textarea
                      value={cfg.note}
                      onChange={(e) => set(t.number, { note: e.target.value.slice(0, 200) })}
                      rows={2}
                      maxLength={200}
                      placeholder={cfg.state === "note" ? "What happened? (no rule)" : "Note (optional)"}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                    />
                    <div className="mt-0.5 text-right text-[11px] text-muted-foreground">{cfg.note.length}/200</div>
                  </div>
                ) : null}

                {(incidentsByTeam.get(t.number) ?? []).length > 0 ? (
                  <TeamRunningLog incidents={incidentsByTeam.get(t.number) ?? []} />
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

      <Button onClick={() => setReviewing(true)} disabled={changed.length === 0 || invalid}>
        Review &amp; log{changed.length > 0 ? ` (${changed.length})` : ""}
      </Button>
      {invalid ? <p className="text-xs text-danger">Violations/DQs need ≥1 rule; notes need text.</p> : null}

      <Modal open={reviewing} onClose={() => setReviewing(false)}>
        <h2 className="text-sm font-semibold">Save {changed.length} for {match.name}</h2>
        <div className="mt-3 flex flex-col gap-2">
          {changed.map((t) => {
            const cfg = get(config, t.number);
            if (cfg.state === "none") {
              return (
                <div key={t.number} className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t.number}</span>
                    <Badge tone="danger">Remove entry</Badge>
                  </div>
                </div>
              );
            }
            const type: IncidentType = cfg.state === "violation" ? (cfg.dq ? "dq" : "violation") : "note";
            return (
              <div key={t.number} className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{t.number}</span>
                  <Badge tone={INCIDENT_TYPE_TONE[type]}>{INCIDENT_TYPE_LABELS[type]}</Badge>
                </div>
                {cfg.state === "violation" && Object.keys(cfg.rules).length ? (
                  <div className="text-xs text-muted-foreground">{formatRules(countsToRules(cfg.rules))}</div>
                ) : null}
                {cfg.note ? <div className="text-xs text-muted-foreground">{cfg.note}</div> : null}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setReviewing(false)}>Back</Button>
          <Button className="flex-1" onClick={save}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}

function TeamRunningLog({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="mt-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">History</h4>
      <div className="mt-1 flex flex-col gap-1">
        {incidents.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate">
              <span className="font-medium">{i.matchName ?? "—"}</span>
              {" · "}
              {INCIDENT_TYPE_SHORT[i.type]}
              {i.rules.length ? ` ${formatRules(i.rules)}` : ""}
              {i.note ? ` · ${i.note.slice(0, 40)}${i.note.length > 40 ? "…" : ""}` : ""}
            </span>
            <span className="shrink-0 text-muted-foreground">{i.author}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamSheet({
  team,
  incidents,
  onOpenMatch,
  onRemove,
  isMine,
}: {
  team: { number: string; name: string };
  incidents: Incident[];
  onOpenMatch: (i: Incident) => void;
  onRemove: (id: string) => void;
  isMine: (i: Incident) => boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{team.number}</h2>
        <span className="text-xs text-muted-foreground">{team.name}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Log of DQs, violations, and notes. Tap an entry to open its match.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {incidents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No entries for this team yet.</p>
        ) : (
          incidents.map((i) => (
            <IncidentRow key={i.id} incident={i} onOpenMatch={onOpenMatch} onRemove={onRemove} canRemove={isMine(i)} />
          ))
        )}
      </div>
    </div>
  );
}
