"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Input, Spinner } from "@/components/ui";
import { searchEvents } from "@/lib/vex/client";
import { formatEventDates } from "@/lib/utils";

export default function EventsSearchPage() {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["events", query],
    queryFn: () => searchEvents(query),
    enabled: query.length > 0,
  });

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Search Events" />
      <main className="px-4 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(text.trim());
          }}
          className="flex gap-2"
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Event name, city, or SKU (RE-VRC-…)"
            autoFocus
          />
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Press Enter to search. Tip: a SKU like <span className="font-mono">RE-VRC-24-1234</span> resolves directly.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {isFetching ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner /> Searching events…
            </div>
          ) : isError ? (
            <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {(error as Error)?.message ?? "Search failed."}
            </p>
          ) : data && data.length === 0 && query ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No events found for “{query}”.</p>
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
