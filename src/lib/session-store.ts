import type { Incident, NewIncident } from "./session-types";

export interface SessionStore {
  incidents: Incident[];
  loaded: boolean;
  mode: "local" | "online";
  /** 6-char share code when online, otherwise null. */
  code: string | null;
  error: string | null;
  addIncident: (input: NewIncident) => void | Promise<void>;
  updateIncident: (id: string, patch: Partial<Incident>) => void | Promise<void>;
  removeIncident: (id: string) => void | Promise<void>;
}
