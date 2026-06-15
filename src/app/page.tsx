"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useIdentity } from "@/components/identity-provider";
import { RecentSessions } from "@/components/recent-sessions";

const GREETINGS: ((n: string) => string)[] = [
  (n) => `Welcome back, ${n}.`,
  (n) => `Good to see you, ${n}.`,
  (n) => `Ready to ref, ${n}?`,
  (n) => `Ready to rumble, ${n}?`,
  (n) => `Let's call some matches, ${n}.`,
  (n) => `Eyes on the field, ${n}.`,
  (n) => `Auton in 3, 2, 1...`,
  (n) => `Driver Control in 3, 2, 1...`,
  (n) => `Back in action, ${n}.`,
  (n) => `Remember ${n}, Team Experience.`,
  (n) => `Howdy, ${n}.`,
];

function RoboRefMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 250 300" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <path d="M225 300L225 275C225 247.386 202.614 225 175 225H75C47.3858 225 25 247.386 25 275L25 300" stroke="currentColor" strokeWidth="20" />
      <line x1="76" y1="300" x2="76" y2="233" stroke="currentColor" strokeWidth="20" />
      <line x1="126" y1="300" x2="126" y2="233" stroke="currentColor" strokeWidth="20" />
      <line x1="176" y1="300" x2="176" y2="233" stroke="currentColor" strokeWidth="20" />
      <rect x="-10" y="10" width="155" height="155" rx="15" transform="matrix(-1 0 0 1 192 50)" stroke="currentColor" strokeWidth="20" />
      <path d="M38 100V100C24.1929 100 13 111.193 13 125V150C13 163.807 24.1929 175 38 175V175V100Z" fill="currentColor" />
      <path d="M212 100V100C225.807 100 237 111.193 237 125V150C237 163.807 225.807 175 212 175V175V100Z" fill="currentColor" />
      <circle cx="17.5" cy="17.5" r="17.5" transform="matrix(-1 0 0 1 177 100)" fill="currentColor" />
      <circle cx="17.5" cy="17.5" r="17.5" transform="matrix(-1 0 0 1 107 100)" fill="currentColor" />
      <path d="M87 161.5C87 166.141 90.9509 170.592 97.9835 173.874C105.016 177.156 114.554 179 124.5 179C134.446 179 143.984 177.156 151.017 173.874C158.049 170.592 162 166.141 162 161.5L124.5 161.5H87Z" fill="currentColor" />
      <path d="M125 60L125 17" stroke="currentColor" strokeWidth="15" />
      <circle cx="124.5" cy="17.5" r="17.5" fill="currentColor" />
    </svg>
  );
}

function GearLink() {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition hover:bg-surface-muted"
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
  const [gi, setGi] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGi(Math.floor(Math.random() * GREETINGS.length));
    const id = setInterval(() => {
      setGi((prev) => {
        if (GREETINGS.length < 2) return prev;
        let next = prev;
        while (next === prev) next = Math.floor(Math.random() * GREETINGS.length);
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const greeting = name ? GREETINGS[gi](name) : "Welcome, stranger!";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <RoboRefMark className="h-14 w-auto shrink-0 text-foreground" />
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">RoboRef</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">{greeting}</p>
          </div>
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
