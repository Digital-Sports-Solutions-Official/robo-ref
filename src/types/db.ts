// Supabase schema types for robo-ref (public schema).
// Regenerate the canonical version anytime via the Supabase MCP
// `generate_typescript_types` tool, or:
//   supabase gen types typescript --project-id lvcqgsbgyikhdqgtiboz --schema public

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type IncidentType = "dq" | "violation" | "note";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; name: string; created_at: string; updated_at: string };
        Insert: { id: string; name?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          code: string;
          event_sku: string;
          event_name: string | null;
          event_id: number | null;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          event_sku: string;
          event_name?: string | null;
          event_id?: number | null;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          event_sku?: string;
          event_name?: string | null;
          event_id?: number | null;
          owner_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      session_members: {
        Row: { session_id: string; user_id: string; role: string; joined_at: string };
        Insert: { session_id: string; user_id: string; role?: string; joined_at?: string };
        Update: { session_id?: string; user_id?: string; role?: string; joined_at?: string };
        Relationships: [
          {
            foreignKeyName: "session_members_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      incidents: {
        Row: {
          id: string;
          session_id: string;
          type: IncidentType;
          team: string;
          match_name: string | null;
          match_id: number | null;
          division: string | null;
          rules: string[];
          notes: string;
          author_id: string | null;
          author_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          type?: IncidentType;
          team: string;
          match_name?: string | null;
          match_id?: number | null;
          division?: string | null;
          rules?: string[];
          notes?: string;
          author_id?: string | null;
          author_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          type?: IncidentType;
          team?: string;
          match_name?: string | null;
          match_id?: number | null;
          division?: string | null;
          rules?: string[];
          notes?: string;
          author_id?: string | null;
          author_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_session: {
        Args: { p_event_sku: string; p_event_name?: string; p_event_id?: number };
        Returns: Database["public"]["Tables"]["sessions"]["Row"];
      };
      join_session: { Args: { p_code: string }; Returns: string };
      is_session_member: { Args: { p_session: string }; Returns: boolean };
    };
    Enums: { incident_type: IncidentType };
    CompositeTypes: { [_ in never]: never };
  };
};
