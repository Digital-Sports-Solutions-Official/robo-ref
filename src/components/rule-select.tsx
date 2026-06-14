"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui";
import { rulesForProgram, type Program, type Rule } from "@/lib/vex/rules";
import { cn } from "@/lib/utils";

type Accent = "primary" | "red" | "blue";

const accentActive: Record<Accent, string> = {
  primary: "border-primary bg-primary/10 text-primary",
  red: "border-danger bg-danger/15 text-danger",
  blue: "border-primary bg-primary/15 text-primary",
};

function RuleChip({
  rule,
  active,
  accent,
  onToggle,
  onDescribe,
}: {
  rule: Rule;
  active: boolean;
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
        active ? accentActive[accent] : "border-border text-foreground hover:bg-surface-muted",
      )}
    >
      {rule.id}
    </button>
  );
}

export function RuleSelect({
  program,
  value,
  onChange,
  accent = "primary",
}: {
  program: Program;
  value: string[];
  onChange: (rules: string[]) => void;
  accent?: Accent;
}) {
  const [query, setQuery] = useState("");
  const [describe, setDescribe] = useState<Rule | null>(null);
  const q = query.trim().toLowerCase();
  const categories = rulesForProgram(program);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((r) => r !== id) : [...value, id]);

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
            (r) => !q || r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q),
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
                    active={value.includes(r.id)}
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
      {value.length > 0 ? <p className="text-xs text-muted-foreground">Selected: {value.join(", ")}</p> : null}
      <p className="text-[11px] text-muted-foreground">Tip: press and hold a rule to read it.</p>

      <Modal open={describe !== null} onClose={() => setDescribe(null)}>
        {describe ? (
          <>
            <h2 className="text-base font-semibold">{describe.id}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{describe.title}</p>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
