// Subset of the VEX events API v2 data model.
// Docs: https://events.vex.com/api/v2

export interface IdInfo {
  id: number;
  name: string;
  code?: string | null;
}

export interface VexLocation {
  venue?: string | null;
  address_1?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
}

export interface VexDivision {
  id: number;
  name: string;
  order?: number;
}

export interface VexEvent {
  id: number;
  sku: string;
  name: string;
  start: string;
  end: string;
  season: IdInfo;
  program: IdInfo;
  location: VexLocation;
  divisions: VexDivision[];
  level?: string;
}

export interface VexTeam {
  id: number;
  number: string;
  team_name: string;
  organization?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  grade?: string | null;
  program?: IdInfo;
}

export interface VexAllianceTeam {
  team: { id: number; name: string };
  sitting?: boolean;
}

export interface VexAlliance {
  color: "red" | "blue";
  score?: number | null;
  teams: VexAllianceTeam[];
}

export interface VexMatch {
  id: number;
  event: { id: number; code?: string | null };
  division: { id: number; name: string };
  round: number;
  instance: number;
  matchnum: number;
  name: string;
  scheduled?: string | null;
  started?: string | null;
  field?: string | null;
  scored?: boolean;
  alliances: VexAlliance[];
}

export interface VexPageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  next_page_url?: string | null;
}

export interface VexPaginated<T> {
  meta: VexPageMeta;
  data: T[];
}
