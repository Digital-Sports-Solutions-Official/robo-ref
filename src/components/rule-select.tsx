"use client";

import { useState } from "react";
import { RULE_CATEGORIES } from "@/lib/vex/rules";
import { cn } from "@/lib/utils";

export function RuleSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (rules: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((r) => r !== id) : [...value, id]);

  return (
    <div className="flex flex-col gap-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter rules (e.g. SG3, possession)"
        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
      />
      <div className="flex max-h-52 flex-col gap-3 overflow-y-auto pr-1">
        {RULE_CATEGORIES.map((cat) => {
          const rules = cat.rules.filter(
            (r) => !q || r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q),
          );
          if (rules.length === 0) return null;
          return (
            <div key={cat.code}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {cat.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rules.map((r) => {
                  const active = value.includes(r.id);
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => toggle(r.id)}
                      title={r.title}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-medium transition",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-foreground hover:bg-surface-muted",
                      )}
                    >
                      {r.id}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {value.length > 0 ? (
        <p className="text-xs text-muted-foreground">Selected: {value.join(", ")}</p>
      ) : null}
    </div>
  );
}
