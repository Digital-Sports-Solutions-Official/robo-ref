"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useTheme } from "@/components/theme-provider";
import { useIdentity } from "@/components/identity-provider";
import { Button, Card, Input } from "@/components/ui";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { name, setName } = useIdentity();

  const [draftName, setDraftName] = useState(name);
  const [nameSaved, setNameSaved] = useState(false);

  const [issueTitle, setIssueTitle] = useState("");
  const [issueBody, setIssueBody] = useState("");
  const [issueState, setIssueState] = useState<{ status: "idle" | "sending" | "ok" | "error"; message?: string }>({
    status: "idle",
  });

  const [cacheCleared, setCacheCleared] = useState(false);

  function saveName() {
    setName(draftName.trim());
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 1500);
  }

  async function submitIssue() {
    if (!issueTitle.trim()) return;
    setIssueState({ status: "sending" });
    try {
      const res = await fetch("/api/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: issueTitle.trim(),
          body: `${issueBody}\n\n---\nReported by: ${name || "anonymous"}`,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        setIssueState({ status: "error", message: data.error ?? "Could not submit issue." });
        return;
      }
      setIssueState({ status: "ok", message: data.url ? `Created: ${data.url}` : "Issue submitted. Thank you!" });
      setIssueTitle("");
      setIssueBody("");
    } catch {
      setIssueState({ status: "error", message: "Network error submitting issue." });
    }
  }

  async function deleteCache() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("roboref.session") || k === "roboref.recents")
        .forEach((k) => localStorage.removeItem(k));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (window.indexedDB?.databases) {
        const dbs = await window.indexedDB.databases();
        await Promise.all(dbs.map((d) => (d.name ? window.indexedDB.deleteDatabase(d.name) : undefined)));
      }
    } catch {
      /* ignore */
    }
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  }

  return (
    <div className="mx-auto max-w-md pb-16">
      <PageHeader title="Settings" />
      <main className="flex flex-col gap-5 px-4 py-5">
        {/* Appearance */}
        <Card>
          <h2 className="text-sm font-semibold">Appearance</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Choose your theme.</p>
          <div className="mt-3 inline-flex rounded-lg border border-border p-1">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={
                  "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition " +
                  (theme === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {t}
              </button>
            ))}
          </div>
        </Card>

        {/* Name */}
        <Card>
          <h2 className="text-sm font-semibold">Display name</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Shown next to violations and notes you author.</p>
          <div className="mt-3 flex gap-2">
            <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="e.g. Head Ref Sam" />
            <Button onClick={saveName} variant="secondary">
              {nameSaved ? "Saved" : "Save"}
            </Button>
          </div>
        </Card>

        {/* Report issue */}
        <Card>
          <h2 className="text-sm font-semibold">Report an issue</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Opens a ticket on the project&apos;s GitHub.</p>
          <div className="mt-3 flex flex-col gap-2">
            <Input value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} placeholder="Short summary" />
            <textarea
              value={issueBody}
              onChange={(e) => setIssueBody(e.target.value)}
              placeholder="What happened? Steps to reproduce?"
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex items-center gap-3">
              <Button onClick={submitIssue} disabled={issueState.status === "sending" || !issueTitle.trim()}>
                {issueState.status === "sending" ? "Sending…" : "Submit"}
              </Button>
              {issueState.message ? (
                <span className={"text-xs " + (issueState.status === "error" ? "text-danger" : "text-success")}>
                  {issueState.message}
                </span>
              ) : null}
            </div>
          </div>
        </Card>

        {/* Delete cache */}
        <Card>
          <h2 className="text-sm font-semibold">Delete cache</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Clears locally stored session data and cached event data on this device. Your name and theme are kept.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={deleteCache} variant="danger">
              Delete cache
            </Button>
            {cacheCleared ? <span className="text-xs text-success">Cache cleared.</span> : null}
          </div>
        </Card>
      </main>
    </div>
  );
}
