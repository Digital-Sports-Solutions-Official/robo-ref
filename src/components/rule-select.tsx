"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui";
import type { Program, Rule } from "@/lib/vex/rules";
import { useRules } from "@/lib/vex/use-rules";
import { cn } from "@/lib/utils";

function RuleChip({
  rule,
  current,
  prior,
  onToggle,
  onDescribe,
}: {
  rule: Rule;
  current: number;
  prior: number;
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
        current > 0
          ? prior > 0
            ? "border-orange-500 bg-orange-500/20 text-orange-600 dark:border-orange-400 dark:text-orange-400"
            : "border-warning bg-warning/20 text-warning"
          : prior > 0
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
  priorCounts,
}: {
  program: Program;
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  priorCounts?: Record<string, number>;
}) {
  const [describe, setDescribe] = useState<Rule | null>(null);
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
      <div className="flex max-h-56 flex-col gap-3 overflow-y-auto pr-1">
        <p className="text-[11px] text-muted-foreground">
          Tap to cite a rule. Press &amp; hold for its description and a multi-count. Yellow = prior count for this team; orange = added on top of a prior.
        </p>
        {categories.map((cat) => (
          <div key={cat.code}>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {cat.rules.map((r) => (
                <RuleChip
                  key={r.id}
                  rule={r}
                  current={value[r.id] ?? 0}
                  prior={priorCounts?.[r.id] ?? 0}
                  onToggle={() => toggle(r.id)}
                  onDescribe={() => setDescribe(r)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {Object.keys(value).length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Cited: {Object.entries(value).map(([id, n]) => (n > 1 ? `${id} ×${n}` : id)).join(", ")}
        </p>
      ) : null}

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
                <button type="button" onClick={() => setCount(describe.id, describedCount - 1)} className="inline-flex size-7 items-center justify-center rounded-md border border-border text-lg leading-none hover:bg-surface">
                  −
                </button>
                <span className="w-5 text-center font-semibold">{describedCount}</span>
                <button type="button" onClick={() => setCount(describe.id, describedCount + 1)} className="inline-flex size-7 items-center justify-center rounded-md border border-border text-lg leading-none hover:bg-surface">
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
