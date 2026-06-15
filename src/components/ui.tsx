"use client";

import { useEffect } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Portal } from "@/components/portal";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-surface-muted text-foreground hover:bg-border",
  ghost: "bg-transparent text-foreground hover:bg-surface-muted",
  danger: "bg-danger text-white hover:opacity-90",
  outline: "bg-transparent text-foreground border border-border hover:bg-surface-muted",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-4 shadow-sm", className)} {...props} />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "danger" | "warning" | "success" }) {
  const tones = {
    default: "bg-surface-muted text-muted-foreground",
    danger: "bg-danger/15 text-danger",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success",
  } as const;
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      aria-label="Loading"
    />
  );
}

/** Locks page scrolling while `active` is true (restores on cleanup; nesting-safe). */
function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

/** Bottom sheet rendered at <body> via Portal (escapes backdrop-filter ancestors). */
export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useBodyScrollLock(open);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
        <div
          className="max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
          {children}
        </div>
      </div>
    </Portal>
  );
}

/** Centered modal rendered at <body> via Portal. */
export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useBodyScrollLock(open);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div
          className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}
