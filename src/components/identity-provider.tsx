"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type IdentityValue = {
  userId: string | null;
  name: string;
  setName: (name: string) => void;
  ready: boolean;
  online: boolean;
};

const IdentityContext = createContext<IdentityValue | null>(null);
const NAME_KEY = "roboref.name";

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setNameState] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    (async () => {
      let storedName = "";
      try {
        storedName = localStorage.getItem(NAME_KEY) ?? "";
      } catch {
        /* ignore */
      }

      let uid: string | null = null;
      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        uid = session?.user?.id ?? null;
        if (!uid) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (!error) uid = data.user?.id ?? null;
        }
      }

      if (!active) return;
      setNameState(storedName);
      setUserId(uid);
      setReady(true);
    })();

    const sub = supabase?.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  const setName = (next: string) => {
    setNameState(next);
    try {
      localStorage.setItem(NAME_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <IdentityContext.Provider value={{ userId, name, setName, ready, online: Boolean(userId) }}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity must be used within IdentityProvider");
  return ctx;
}
