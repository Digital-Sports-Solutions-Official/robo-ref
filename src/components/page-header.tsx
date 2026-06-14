"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle light/dark theme"
      className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition hover:bg-surface-muted"
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
  backHref,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  backHref?: string;
}) {
  const router = useRouter();
  const goBack = () => (backHref ? router.push(backHref) : router.back());
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
      <button
        onClick={goBack}
        aria-label="Back"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface transition hover:bg-surface-muted"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}
