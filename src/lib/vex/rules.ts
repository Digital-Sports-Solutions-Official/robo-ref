// VEX rules for citing on violations/DQs, by program.
// Sources: V5RC "OVERRIDE" and VIQRC "Level Up" official Game Manuals (2026-2027).

export type Program = "V5RC" | "VEXU" | "VIQRC";

export interface Rule {
  id: string;
  title: string;
}

export interface RuleCategory {
  code: string;
  label: string;
  rules: Rule[];
}

// ---- V5RC / VEX U (OVERRIDE) ----
const V5RC_SG: Rule[] = [
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
];
const V5RC_GG: Rule[] = [
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
];
const V5RC_G: Rule[] = [
  { id: "G1", title: "Treat everyone with respect" },
  { id: "G2", title: "V5RC is a Student-centered program" },
  { id: "G3", title: "Use common sense" },
  { id: "G4", title: "All work must represent the skill level of the Students on the Team" },
  { id: "G5", title: "Each Student can only belong to one Team" },
  { id: "G6", title: "There is a difference between accidentally and willfully violating a Robot rule" },
];
const VUG: Rule[] = [
  { id: "VUG1", title: "Different Robot starting sizes" },
  { id: "VUG2", title: "Different Robot placement than rule GG10" },
  { id: "VUG3", title: "Some electronic devices may be moving at the beginning of the Match" },
  { id: "VUG4", title: "Different availability of Loaders" },
  { id: "VUG5", title: "Different scoring during the Autonomous Period" },
  { id: "VUG6", title: "Different Autonomous Win Point criteria" },
  { id: "VUG7", title: "Different expansion in the Midfield during the Endgame period" },
];

// ---- VEX IQ (Level Up) ----
const IQ_SG: Rule[] = [
  { id: "SG1", title: "Starting a Match" },
  { id: "SG2", title: "Horizontal expansion is limited" },
  { id: "SG3", title: "Vertical expansion is unlimited" },
  { id: "SG4", title: "Keep Scoring Objects in the Field" },
  { id: "SG5", title: "Each Robot gets one yellow Bean Bag as a Preload" },
  { id: "SG6", title: "Possession is limited to one (1) Bean Bag" },
  { id: "SG7", title: "Using the Load Zone" },
];
const IQ_GG: Rule[] = [
  { id: "GG1", title: "Drivers drive your Robot, and stay in the Driver Station" },
  { id: "GG2", title: "A Team's Robot should attend every Match" },
  { id: "GG3", title: "Robots on the Field must be ready to play" },
  { id: "GG4", title: "Hands out of the Field" },
  { id: "GG5", title: "Match Replays are allowed, but rare" },
  { id: "GG6", title: "Disqualifications" },
  { id: "GG7", title: "Time-outs" },
  { id: "GG8", title: "Keep your Robot together" },
  { id: "GG9", title: "Don't damage the Field" },
  { id: "GG10", title: "Handling the Robot mid-Match is allowed under certain circumstances" },
  { id: "GG11", title: "A Team's two Drivers switch controllers midway through the Match" },
  { id: "GG12", title: "Don't start before the timer, and stop moving at the end of the Match" },
  { id: "GG13", title: "Ending a Match early" },
  { id: "GG14", title: "Drive Team Members are permitted to appeal the Head Referee's ruling" },
];
const IQ_G: Rule[] = [
  { id: "G1", title: "Treat everyone with respect" },
  { id: "G2", title: "VIQRC is a Student-centered program" },
  { id: "G3", title: "Use common sense" },
  { id: "G4", title: "All work must represent the skill level of the Students on the Team" },
  { id: "G5", title: "Each Student can only belong to one Team" },
  { id: "G6", title: "There is a difference between accidentally and willfully violating a Robot rule" },
];

const V5RC_CATEGORIES: RuleCategory[] = [
  { code: "SG", label: "Specific Game", rules: V5RC_SG },
  { code: "GG", label: "General Game", rules: V5RC_GG },
  { code: "G", label: "General", rules: V5RC_G },
];

const VEXU_CATEGORIES: RuleCategory[] = [
  ...V5RC_CATEGORIES,
  { code: "VUG", label: "VEX U Game", rules: VUG },
];

const VIQRC_CATEGORIES: RuleCategory[] = [
  { code: "SG", label: "Specific Game", rules: IQ_SG },
  { code: "GG", label: "General Game", rules: IQ_GG },
  { code: "G", label: "General", rules: IQ_G },
];

export function rulesForProgram(program: Program): RuleCategory[] {
  if (program === "VIQRC") return VIQRC_CATEGORIES;
  if (program === "VEXU") return VEXU_CATEGORIES;
  return V5RC_CATEGORIES;
}

/** Map a VEX program (from the event) to our rule set. */
export function programFromEvent(input?: { code?: string | null; name?: string | null }): Program {
  const s = `${input?.code ?? ""} ${input?.name ?? ""}`.toUpperCase();
  if (s.includes("IQ")) return "VIQRC";
  if (s.includes("VEXU") || s.includes("VEX U") || s.includes("VURC") || s.includes("UNIVERSITY") || s.includes("COLLEGE")) {
    return "VEXU";
  }
  return "V5RC";
}

export function ruleTitle(id: string, program?: Program): string | undefined {
  const cats = program ? rulesForProgram(program) : [...VEXU_CATEGORIES, ...VIQRC_CATEGORIES];
  for (const c of cats) {
    const r = c.rules.find((x) => x.id === id);
    if (r) return r.title;
  }
  return undefined;
}
