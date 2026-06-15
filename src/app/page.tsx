"use client";

import Link from "next/link";
import { useIdentity } from "@/components/identity-provider";
import { RecentSessions } from "@/components/recent-sessions";

function GearLink() {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition hover:bg-surface-muted"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </Link>
  );
}

function ActionCard({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-stretch gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <span className="flex w-12 shrink-0 items-center justify-center self-stretch rounded-lg bg-surface-muted text-primary">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="block text-lg font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{desc}</span>
      </span>
      <span className="flex items-center">
        <svg className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}

const searchIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const joinIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M22 11h-6" />
  </svg>
);

export default function HomePage() {
  const { name } = useIdentity();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">roboRef</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {name ? `Welcome back, ${name}.` : "Welcome, stranger!"}
          </p>
        </div>
        <GearLink />
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <ActionCard href="/events" title="Search Events" desc="Find an event and start a session" icon={searchIcon} />
        <ActionCard href="/join" title="Join a Group" desc="Join live with a code" icon={joinIcon} />
      </div>

      <RecentSessions />

      <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">
        Your log is stored on this device until you share it
      </p>
    </main>
  );
}
