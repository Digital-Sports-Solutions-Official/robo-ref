"use client";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";

export default function OnlineSessionPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Live Session" />
      <main className="px-4 py-6">
        <Card>
          <h2 className="text-sm font-semibold">Online sessions are coming next</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Joining by code resolves a shared session here. This needs the Supabase database migration applied and
            anonymous auth enabled — once that&apos;s done, this page mirrors the offline session view with live,
            attributed violations and notes.
          </p>
        </Card>
      </main>
    </div>
  );
}
