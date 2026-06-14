"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button, Input, Spinner } from "@/components/ui";
import { searchEvents, type EventSearchParams } from "@/lib/vex/client";
import { formatEventDates } from "@/lib/utils";

export default function EventsSearchPage() {
  const [term, setTerm] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [submitted, setSubmitted] = useState<EventSearchParams | null>(null);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["events", submitted],
    queryFn: () => searchEvents(submitted!),
    enabled: submitted !== null,
  });

  const canSearch = term.trim() !== "" || from !== "" || to !== "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSearch) return;
    setSubmitted({ query: term.trim() || undefined, start: from || undefined, end: to || undefined });
  }

  const dateInput =
    "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Search Events" />
      <main className="px-4 py-4">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Event name, city, or SKU (RE-VRC-…)" autoFocus />
          <div className="flex items-end gap-2">
            <label className="flex-1 text-xs text-muted-foreground">
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateInput} />
            </label>
            <label className="flex-1 text-xs text-muted-foreground">
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={dateInput} />
            </label>
            <Button type="submit" disabled={!canSearch}>
              Search
            </Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Search by name/SKU, a date range, or both. A SKU like{" "}
          <span className="font-mono">RE-VRC-24-1234</span> resolves directly.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {submitted === null ? null : isFetching ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner /> Searching events…
            </div>
          ) : isError ? (
            <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {(error as Error)?.message ?? "Search failed."}
            </p>
          ) : data && data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No events found for that search.</p>
          ) : (
            data?.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${encodeURIComponent(ev.sku)}`}
                className="rounded-xl border border-border bg-surface p-4 transition hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium leading-tight">{ev.name}</span>
                  <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {ev.program?.code ?? ev.program?.name ?? ""}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatEventDates(ev.start, ev.end)}
                  {ev.location?.city ? ` · ${ev.location.city}${ev.location.region ? ", " + ev.location.region : ""}` : ""}
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{ev.sku}</div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
