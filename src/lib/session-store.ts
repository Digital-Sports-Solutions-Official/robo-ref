import type { Alliance, Incident, MatchMeta, NewIncident } from "./session-types";

export interface SessionStore {
  incidents: Incident[];
  /** Per-match autonomous/AWP info, keyed by match name (last editor wins). */
  matchMeta: Record<string, MatchMeta>;
  loaded: boolean;
  mode: "local" | "online";
  code: string | null;
  error: string | null;
  addIncident: (input: NewIncident) => void | Promise<void>;
  updateIncident: (id: string, patch: Partial<Incident>) => void | Promise<void>;
  removeIncident: (id: string) => void | Promise<void>;
  setMatchMeta: (
    matchName: string,
    matchId: number | null,
    meta: { autoWinner: MatchMeta["autoWinner"]; awpWinners: Alliance[]; author: string },
  ) => void | Promise<void>;
}
