// VEX V5RC "OVERRIDE" (2026-2027) rules, for citing on violations/DQs.
// Source: official Game Manual quick reference (override-v-0.2).

export interface Rule {
  id: string;
  title: string;
}

export interface RuleCategory {
  code: "SG" | "GG" | "G" | "VUG";
  label: string;
  rules: Rule[];
}

export const RULE_CATEGORIES: RuleCategory[] = [
  {
    code: "SG",
    label: "Specific Game",
    rules: [
      { id: "SG1", title: "Starting a Match" },
      { id: "SG2", title: "Horizontal expansion is limited" },
      { id: "SG3", title: "Vertical expansion is limited" },
      { id: "SG4", title: "Keep Scoring Objects in the Field" },
      { id: "SG5", title: "Each Robot gets one Pin as a Preload" },
      { id: "SG6", title: "Possession is limited to a maximum of one Pin and one Cup" },
      { id: "SG7", title: "Don't cross the Autonomous Line, and don't interfere with opponents' actions" },
      { id: "SG8", title: "Engage with the Midfield and Autonomous Line during Auto at your own risk" },
      { id: "SG9", title: "Alliance Goals are protected" },
      { id: "SG10", title: "Scoring Objects can't be removed from neutral or opponent-Alliance Goals" },
      { id: "SG11", title: "Match Loads may be introduced during the Match under certain conditions" },
      { id: "SG12", title: "Some rules change during the Endgame period" },
    ],
  },
  {
    code: "GG",
    label: "General Game",
    rules: [
      { id: "GG1", title: "Only Drive Team Members, and only in the Alliance Station" },
      { id: "GG2", title: "A Team's Robot should attend every Match" },
      { id: "GG3", title: "Robots on the Field must be ready to play" },
      { id: "GG4", title: "Hands out of the Field" },
      { id: "GG5", title: "Match replays are allowed, but rare" },
      { id: "GG6", title: "Disqualifications" },
      { id: "GG7", title: "Time-outs" },
      { id: "GG8", title: "Keep your Robots together" },
      { id: "GG9", title: "Don't hook your Robot to the Field, and don't get Entangled" },
      { id: "GG10", title: "The red Alliance may choose to place last" },
      { id: "GG11", title: "Controllers must stay connected to the Field" },
      { id: "GG12", title: "Autonomous means no humans" },
      { id: "GG13", title: "All rules still apply in the Autonomous Period" },
      { id: "GG14", title: "Don't destroy other Robots. But, be prepared to encounter defense" },
      { id: "GG15", title: "Offensive Robots get the benefit of the doubt on judgment calls" },
      { id: "GG16", title: "You can't force an opponent into a penalty" },
      { id: "GG17", title: "No Holding for more than a 3-count" },
      { id: "GG18", title: "Use Scoring Objects to play the game" },
    ],
  },
  {
    code: "G",
    label: "General",
    rules: [
      { id: "G1", title: "Treat everyone with respect" },
      { id: "G2", title: "V5RC is a Student-centered program" },
      { id: "G3", title: "Use common sense" },
      { id: "G4", title: "All work must represent the skill level of the Students on the Team" },
      { id: "G5", title: "Each Student can only belong to one Team" },
      { id: "G6", title: "There is a difference between accidentally and willfully violating a Robot rule" },
    ],
  },
  {
    code: "VUG",
    label: "VEX U Game",
    rules: [
      { id: "VUG1", title: "Different Robot starting sizes" },
      { id: "VUG2", title: "Different Robot placement than rule GG10" },
      { id: "VUG3", title: "Some electronic devices may be moving at the beginning of the Match" },
      { id: "VUG4", title: "Different availability of Loaders" },
      { id: "VUG5", title: "Different scoring during the Autonomous Period" },
      { id: "VUG6", title: "Different Autonomous Win Point criteria" },
      { id: "VUG7", title: "Different expansion in the Midfield during the Endgame period" },
    ],
  },
];

export const ALL_RULES: Rule[] = RULE_CATEGORIES.flatMap((c) => c.rules);

const RULE_TITLE_BY_ID: Record<string, string> = Object.fromEntries(
  ALL_RULES.map((r) => [r.id, r.title]),
);

export function ruleTitle(id: string): string | undefined {
  return RULE_TITLE_BY_ID[id];
}
