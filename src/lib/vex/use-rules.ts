"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { rulesForProgram as bundledRules, type Program, type RuleCategory } from "@/lib/vex/rules";

interface RulesDoc {
  programs: Record<string, { categories: RuleCategory[] }>;
}

/**
 * Active rule catalogs for a program. Reads the admin-editable `app_config` rules
 * document from Supabase (cached); falls back to the bundled manual catalogs.
 */
export function useRules(program: Program): RuleCategory[] {
  const { data } = useQuery({
    queryKey: ["rules-doc"],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<RulesDoc | null> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "rules")
        .maybeSingle();
      if (error || !data) return null;
      return data.value as RulesDoc;
    },
  });

  const fromDb = data?.programs?.[program]?.categories;
  return fromDb && fromDb.length ? fromDb : bundledRules(program);
}
