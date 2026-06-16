import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_TEAM_PHOTOS = 4;
const BUCKET = "team-photos";

export interface TeamPhoto {
  id: string;
  sessionId: string;
  team: string;
  path: string;
  authorId: string | null;
  authorName: string;
  createdAt: string;
  url: string | null;
}

interface RawRow {
  id: string;
  session_id: string;
  team: string;
  storage_path: string;
  author_id: string | null;
  author_name: string;
  created_at: string;
}

function mapRow(r: RawRow, url: string | null): TeamPhoto {
  return {
    id: r.id,
    sessionId: r.session_id,
    team: r.team,
    path: r.storage_path,
    authorId: r.author_id,
    authorName: r.author_name,
    createdAt: r.created_at,
    url,
  };
}

/** Downscale to <= maxEdge px and re-encode as JPEG to keep storage + egress small. */
export async function compressImage(
  file: File,
  maxEdge = 1280,
  quality = 0.7,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;
  if (Math.max(width, height) > maxEdge) {
    const scale = maxEdge / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing isn't supported on this device.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Could not process this image.");
  return { blob, width, height };
}

export async function listTeamPhotos(
  supabase: SupabaseClient,
  sessionId: string,
  team: string,
): Promise<TeamPhoto[]> {
  const { data, error } = await supabase
    .from("team_photos")
    .select("id, session_id, team, storage_path, author_id, author_name, created_at")
    .eq("session_id", sessionId)
    .eq("team", team)
    .order("created_at");
  if (error) throw error;
  const rows = (data ?? []) as RawRow[];
  return Promise.all(
    rows.map(async (r) => {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(r.storage_path, 3600);
      return mapRow(r, signed?.signedUrl ?? null);
    }),
  );
}

export async function uploadTeamPhoto(
  supabase: SupabaseClient,
  opts: { sessionId: string; team: string; file: File; authorId: string | null; authorName: string },
): Promise<void> {
  const { sessionId, team, file, authorId, authorName } = opts;
  const { blob, width, height } = await compressImage(file);
  const safeTeam = team.replace(/[^A-Za-z0-9_-]/g, "_") || "team";
  const path = `${sessionId}/${safeTeam}/${crypto.randomUUID()}.jpg`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (upErr) throw upErr;
  const { error: insErr } = await supabase.from("team_photos").insert({
    session_id: sessionId,
    team,
    storage_path: path,
    author_id: authorId,
    author_name: authorName,
    width,
    height,
    bytes: blob.size,
  });
  if (insErr) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw insErr;
  }
}

export async function removeTeamPhoto(
  supabase: SupabaseClient,
  photo: { id: string; path: string },
): Promise<void> {
  const { error } = await supabase.from("team_photos").delete().eq("id", photo.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([photo.path]);
}
