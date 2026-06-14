export type IncidentOutcome = "general" | "minor" | "major" | "disabled" | "dq";

export const OUTCOME_LABELS: Record<IncidentOutcome, string> = {
  general: "General note",
  minor: "Minor violation",
  major: "Major violation",
  disabled: "Disablement",
  dq: "Disqualification",
};

export const OUTCOME_TONE: Record<IncidentOutcome, "default" | "warning" | "danger"> = {
  general: "default",
  minor: "warning",
  major: "warning",
  disabled: "danger",
  dq: "danger",
};

export interface Incident {
  id: string;
  sku: string;
  division?: string;
  matchName?: string;
  team: string;
  outcome: IncidentOutcome;
  rules: string[];
  notes: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  sku: string;
  matchName?: string;
  body: string;
  author: string;
  createdAt: string;
}
