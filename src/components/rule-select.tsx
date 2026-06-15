"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui";
import type { Program, Rule } from "@/lib/vex/rules";
import { useRules } from "@/lib/vex/use-rules";
import { cn } from "@/lib/utils";

type Accent = "primary" | "red" | "blue";

const accentActive: Record<Accent, string> = {
  primary: "border-primary bg-primary/10 text-primary",
  red: "border-danger bg-danger/15 text-danger",
  blue: "border-primary bg-primary/15 text-primary",
};

function RuleChip({
  rule,
  current,
  prior,
  accent,
  onToggle,
  onDescribe,
}: {
  rule: Rule;
  current: number;
  prior: number;
  accent: Accent;
  onToggle: () => void;
  onDescribe: () => void;
}) {
  const timer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);

  function start() {
    longPressed.current = false;
    timer.current = window.setTimeout(() => {
      longPressed.current = true;
      onDescribe();
    }, 450);
  }
  function cancel() {
    if (timer.current) window.clearTimeout(timer.current);
  }
  function click() {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onToggle();
  }

  const total = prior + current;
  const active = current > 0;
  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onClick={click}
      onContextMenu={(e) => e.preventDefault()}
      title={rule.title}
      className={cn(
        "select-none rounded-md border px-2 py-1 text-xs font-medium transition",
        active
          ? accentActive[accent]
          : total > 0
            ? "border-warning bg-warning/15 text-warning"
            : "border-border text-foreground hover:bg-surface-muted",
      )}
    >
      {rule.id}
      {total > 0 ? <sup className="ml-0.5 font-bold underline">{total}</sup> : null}
    </button>
  );
}

export function RuleSelect({
  program,
  value,
  onChange,
  accent = "primary",
  priorCounts,
}: {
  program: Program;
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  accent?: Accent;
  priorCounts?: Record<string, number>;
}) {
  const [query, setQuery] = useState("");
  const [describe, setDescribe] = useState<Rule | null>(null);
  const q = query.trim().toLowerCase();
  const categories = useRules(program);

  function setCount(id: string, n: number) {
    const next = { ...value };
    if (n <= 0) delete next[id];
    else next[id] = n;
    onChange(next);
  }
  const toggle = (id: string) => setCount(id, (value[id] ?? 0) > 0 ? 0 : 1);

  const describedCount = describe ? value[describe.id] ?? 0 : 0;
  const describedPrior = describe ? priorCounts?.[describe.id] ?? 0 : 0;

  return (
    <div className="flex flex-col gap-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter rules by name or description"
        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
      />
      <div className="flex max-h-48 flex-col gap-3 overflow-y-auto pr-1">
        {categories.map((cat) => {
          const rules = cat.rules.filter(
            (r) =>
              !q ||
              r.id.toLowerCase().includes(q) ||
              r.title.toLowerCase().includes(q) ||
              r.description.toLowerCase().includes(q),
          );
          if (rules.length === 0) return null;
          return (
            <div key={cat.code}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {cat.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rules.map((r) => (
                  <RuleChip
                    key={r.id}
                    rule={r}
                    current={value[r.id] ?? 0}
                    prior={priorCounts?.[r.id] ?? 0}
                    accent={accent}
                    onToggle={() => toggle(r.id)}
                    onDescribe={() => setDescribe(r)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Tap to cite a rule. Press &amp; hold for its description and a multi-count. Yellow = prior count for this team.
      </p>

      <Modal open={describe !== null} onClose={() => setDescribe(null)}>
        {describe ? (
          <>
            <h2 className="text-base font-semibold">
              {describe.id} · {describe.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{describe.description || "No description available."}</p>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface-muted px-3 py-2">
              <span className="text-sm">
                Times this match
                {describedPrior > 0 ? <span className="ml-2 text-xs text-muted-foreground">({describedPrior} prior)</span> : null}
              </span>
              <span className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCount(describe.id, describedCount - 1)}
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border text-lg leading-none hover:bg-surface"
                >
                  −
                </button>
                <span className="w-5 text-center font-semibold">{describedCount}</span>
                <button
                  type="button"
                  onClick={() => setCount(describe.id, describedCount + 1)}
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border text-lg leading-none hover:bg-surface"
                >
                  +
                </button>
              </span>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
