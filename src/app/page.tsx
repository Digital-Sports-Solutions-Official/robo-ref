"use client";

import Link from "next/link";
import { useIdentity } from "@/components/identity-provider";
import { ThemeToggle } from "@/components/page-header";

function ActionCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <span>
        <span className="block text-lg font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{desc}</span>
      </span>
      <svg className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export default function HomePage() {
  const { name } = useIdentity();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">robo-ref</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {name ? `Welcome back, ${name}.` : "VEX referee anomaly log & match notes."}
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <ActionCard href="/events" title="Search Events" desc="Find an event and start a session" />
        <ActionCard href="/join" title="Join a Group" desc="Use a code to collaborate live with referees" />
        <ActionCard href="/settings" title="Settings" desc="Name, theme, report an issue, clear cache" />
      </div>

      <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">
        Offline-first · your log is stored on this device until you share it
      </p>
    </main>
  );
}
