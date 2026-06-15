export type IncidentType = "dq" | "violation" | "note";

export const INCIDENT_TYPES: IncidentType[] = ["dq", "violation", "note"];

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  dq: "Disqualification",
  violation: "Violation",
  note: "Note",
};

export const INCIDENT_TYPE_SHORT: Record<IncidentType, string> = {
  dq: "DQ",
  violation: "Violation",
  note: "Note",
};

export const INCIDENT_TYPE_TONE: Record<IncidentType, "danger" | "warning" | "default"> = {
  dq: "danger",
  violation: "warning",
  note: "default",
};

/** dq and violation must cite at least one rule; a note needs none. */
export function requiresRule(type: IncidentType): boolean {
  return type === "dq" || type === "violation";
}

export interface Incident {
  id: string;
  type: IncidentType;
  team: string;
  matchName: string | null;
  matchId: number | null;
  division: string | null;
  rules: string[];
  note: string;
  author: string;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewIncident = Omit<Incident, "id" | "createdAt" | "updatedAt">;

export type Alliance = "red" | "blue";

export interface MatchMeta {
  autoWinner: Alliance | "tie" | null;
  awpWinners: Alliance[];
  author: string;
}
