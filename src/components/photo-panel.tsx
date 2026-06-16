"use client";

import { useRef, useState } from "react";
import { useIdentity } from "@/components/identity-provider";
import { Modal, Spinner } from "@/components/ui";
import { useTeamPhotos } from "@/lib/use-team-photos";
import type { TeamPhoto } from "@/lib/photos";

export function PhotoPanel({ sessionId, team }: { sessionId: string; team: string }) {
  const { userId, name } = useIdentity();
  const { photos, busy, error, add, remove, atLimit } = useTeamPhotos(sessionId, team, {
    id: userId ?? null,
    name: name || "Anonymous",
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState<TeamPhoto | null>(null);
  const isMine = (p: TeamPhoto) => !!userId && p.authorId === userId;

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Inspection photos</h4>
        <span className="text-[11px] text-muted-foreground">{photos.length}/4</span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setViewing(p)}
            className="aspect-square overflow-hidden rounded-lg border border-border bg-surface-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.url ? <img src={p.url} alt={`${team} inspection`} className="h-full w-full object-cover" /> : null}
          </button>
        ))}
        {!atLimit ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
            aria-label="Add inspection photo"
          >
            {busy ? (
              <Spinner />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            )}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-[11px] text-danger">{error}</p> : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void add(f);
          e.target.value = "";
        }}
      />

      <Modal open={!!viewing} onClose={() => setViewing(null)}>
        {viewing ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {viewing.url ? <img src={viewing.url} alt="inspection" className="w-full rounded-lg" /> : null}
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>by {viewing.authorName || "Anonymous"}</span>
              {isMine(viewing) ? (
                <button
                  onClick={() => {
                    void remove(viewing);
                    setViewing(null);
                  }}
                  className="text-danger hover:underline"
                >
                  Delete
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
