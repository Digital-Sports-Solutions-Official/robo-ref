"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  listTeamPhotos,
  uploadTeamPhoto,
  removeTeamPhoto,
  MAX_TEAM_PHOTOS,
  type TeamPhoto,
} from "@/lib/photos";

export function useTeamPhotos(
  sessionId: string | undefined,
  team: string | undefined,
  author: { id: string | null; name: string },
) {
  const [photos, setPhotos] = useState<TeamPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !sessionId || !team) {
      setPhotos([]);
      return;
    }
    try {
      setPhotos(await listTeamPhotos(supabase, sessionId, team));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [sessionId, team]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !sessionId || !team) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load flag
    setLoading(true);
    void refresh().finally(() => setLoading(false));
    const channel = supabase
      .channel(`team-photos-${sessionId}-${team}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_photos", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { team?: string } | null;
          if (!row || row.team === team) void refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, team, refresh]);

  const add = useCallback(
    async (file: File) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase || !sessionId || !team) return;
      setBusy(true);
      setError(null);
      try {
        await uploadTeamPhoto(supabase, { sessionId, team, file, authorId: author.id, authorName: author.name });
        await refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [sessionId, team, author.id, author.name, refresh],
  );

  const remove = useCallback(
    async (photo: TeamPhoto) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      setBusy(true);
      setError(null);
      try {
        await removeTeamPhoto(supabase, { id: photo.id, path: photo.path });
        await refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return { photos, loading, busy, error, add, remove, atLimit: photos.length >= MAX_TEAM_PHOTOS };
}
