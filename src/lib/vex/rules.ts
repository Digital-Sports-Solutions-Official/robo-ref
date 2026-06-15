// VEX rules for citing on violations/DQs, by program.
// Sources: V5RC "OVERRIDE" and VIQRC "Level Up" official Game Manuals (2026-2027).
// Descriptions are pulled from those manuals. The admin console can override these
// (stored in the `app_config` rules document); this file is the bundled fallback.

export type Program = "V5RC" | "VEXU" | "VIQRC";

export interface Rule {
  id: string;
  title: string;
  description: string;
}

export interface RuleCategory {
  code: string;
  label: string;
  rules: Rule[];
}

const V5RC_SG: Rule[] = [
  { id: "SG1", title: "Starting a Match", description: "Prior to the start of each Match, each Robot must be placed such that it meets all of the following criteria: a. No larger than 18” (457.2 mm) long by 18” (457.2 mm) wide by 18” (457.2 mm) tall. b.…" },
  { id: "SG2", title: "Horizontal expansion is limited", description: "Once the Match begins, Robots may expand horizontally beyond the starting size limit within the following criteria: a.…" },
  { id: "SG3", title: "Vertical expansion is limited", description: "Once the Match begins and until the Endgame period begins, Robots may expand vertically beyond the starting size limit, but no part of the Robot may exceed an overall height of 50” at any point during the Match (must always be able to fit w…" },
  { id: "SG4", title: "Keep Scoring Objects in the Field", description: "Teams may not remove Scoring Objects from the Field. A Scoring Object that leaves the Field during Match play, intentionally or unintentionally, will be returned to the Field in a location near where it left, in contact with the Field tiles…" },
  { id: "SG5", title: "Each Robot gets one Pin as a Preload", description: "Red Alliance Preloads are red/yellow Pins; blue Alliance Preloads are blue/yellow Pins. Prior to the start of each Match, each Preload must be placed such that it meets all of the following criteria: a.…" },
  { id: "SG6", title: "Possession is limited to a maximum of one Pin and one Cup", description: "Robots may not have Possession of more than one (1) Pin at once. Robots may not have Possession of more than (1) Cup at once.…" },
  { id: "SG7", title: "Don't cross the Autonomous Line, and don't interfere with opponents' actions", description: "During the Autonomous Period, Robots may not contact foam tiles, Scoring Objects, or Field Elements which are on the opposing Alliance’s side of the Autonomous Line. a.…" },
  { id: "SG8", title: "Engage with the Midfield and Autonomous Line during Auto at your own risk", description: "Any Robot that engages with the Midfield and/or Scoring Objects that begin the Match on the Autonomous Line should be aware that opponent Robots may also choose to do the same. Per GG12 and" },
  { id: "SG9", title: "Alliance Goals are protected", description: "Robots may not directly or indirectly interact with the opposing Alliance-colored Goals. This includes both Placing Scoring Objects and removing Placed Scoring Objects." },
  { id: "SG10", title: "Scoring Objects can't be removed from neutral or opponent-Alliance Goals", description: "Robots may only remove Placed Scoring Objects from a Goal if that Goal matches their Alliance color." },
  { id: "SG11", title: "Match Loads may be introduced during the Match under certain conditions", description: "For the purpose of this rule, “introduce” refers to the moment when a Drive Team Member has released a Scoring Object into a Loader. During this action, a Drive Team Member’s hands may temporarily break the plane of the Field Perimeter.…" },
  { id: "SG12", title: "Some rules change during the Endgame period", description: "1. Vertical expansion is limited to 18” for any Robot that is partially or entirely within the infinite 3D vertical projection of the Midfield. 2.…" },
];

const V5RC_GG: Rule[] = [
  { id: "GG1", title: "Only Drive Team Members, and only in the Alliance Station", description: "During a Match, Robots may be operated only by that Team’s Drive Team Members and/or by software running on the Robot’s control system in accordance with R9 and GG11.…" },
  { id: "GG2", title: "A Team's Robot should attend every Match", description: "The Team’s Robot must be in the Alliance Station or on the Field for the Team’s assigned Match, even if the Robot is not functional.…" },
  { id: "GG3", title: "Robots on the Field must be ready to play", description: "When a Team puts their Robot on the Field, it must be prepared to play (e.g., battery charged, sized within the starting size constraint, includes only the correct Alliance-color license plates, etc.). a.…" },
  { id: "GG4", title: "Hands out of the Field", description: "During a Match, Drive Team Members are prohibited from making intentional contact with any Field Element, Robot, or Scoring Object that has been introduced to the Field, except for the contact specified in <GG4a> or while introducing Match…" },
  { id: "GG5", title: "Match replays are allowed, but rare", description: "Match replays (i.e., playing a Match over again from its start) must be agreed upon by both the Event Partner and Head Referee, and will only be issued in the most extreme circumstances.…" },
  { id: "GG6", title: "Disqualifications", description: "When a Team receives a Disqualification in a Qualification Match, they receive a score of zero (0) for the Match, as well as zero (0) Win Points, Autonomous Win Points, Autonomous Points, and Strength of Schedule Points. a.…" },
  { id: "GG7", title: "Time-outs", description: "Each Elimination Alliance gets one three-minute Time-out, which they may request during the Elimination Bracket. The Time-out will be served at the time of the Alliance’s next upcoming Match.…" },
  { id: "GG8", title: "Keep your Robots together", description: "Robots may not intentionally detach parts during the Match or leave mechanisms on the Field.…" },
  { id: "GG9", title: "Don't hook your Robot to the Field, and don't get Entangled", description: "Robots may not intentionally grasp, grapple, hook, attach to or otherwise Entangled with any Field Elements.…" },
  { id: "GG10", title: "The red Alliance may choose to place last", description: "The red Alliance has the right to place its Robots on the Field last in Qualification Matches and Elimination Matches.…" },
  { id: "GG11", title: "Controllers must stay connected to the Field", description: "Prior to the beginning of each Match, Drive Team Members must plug their V5 Controller into the Field’s control system.…" },
  { id: "GG12", title: "Autonomous means no humans", description: "This could include, but is not limited to: ● Activating any controls on their V5 Controllers ● Unplugging or otherwise manually interfering with the Field connection in any way ● Manually triggering sensors (including the Vision Sensor) in…" },
  { id: "GG13", title: "All rules still apply in the Autonomous Period", description: "a. For the purposes of this rule, “engages with” means any combination of: i. Contacting foam tiles within the Midfield ii. Contacting the Goal in the Midfield iii. Contacting Scoring Objects that begin the Match on the Autonomous Line b.…" },
  { id: "GG14", title: "Don't destroy other Robots. But, be prepared to encounter defense", description: "But, be prepared to encounter defense. Strategies aimed solely at the destruction, damage, tipping over, or Entanglement of opposing Robots are not part of the ethos of the VEX V5 Robotics Competition and are not allowed. a.…" },
  { id: "GG15", title: "Offensive Robots get the benefit of the doubt on judgment calls", description: "The Midfield and the Scoring Objects that begin on the Autonomous Line are intended to be utilized by both Alliances during the Autonomous Period. This will inevitably result in Robot-on-Robot interactions, both incidental and intentional.…" },
  { id: "GG16", title: "You can't force an opponent into a penalty", description: "Intentional strategies that cause an opponent to break a rule are not permitted, and will not result in a Violation for the opposing Alliance." },
  { id: "GG17", title: "No Holding for more than a 3-count", description: "A Robot may not Hold an opposing Robot for more than a 3-count during the Driver Controlled Period.…" },
  { id: "GG18", title: "Use Scoring Objects to play the game", description: "Scoring Objects may not be used to accomplish actions that would be otherwise illegal if they were attempted by Robot mechanisms.…" },
];

const V5RC_G: Rule[] = [
  { id: "G1", title: "Treat everyone with respect", description: "All Teams and other attendees are expected to conduct themselves in a respectful and professional manner while participating in or attending VEX V5 Robotics Competition events.…" },
  { id: "G2", title: "V5RC is a Student-centered program", description: "a. Designs and code provided by VEX Robotics: i. Teams may use Robot plans and code (e.g., Hero Bots, VEXcode configurations, etc.) provided by VEX Robotics, but are encouraged to use these Robots, mechanisms, and code only as a starting po…" },
  { id: "G3", title: "Use common sense", description: "When reading and applying the various rules in this document, please remember that common sense always applies in the VEX V5 Robotics Competition.…" },
  { id: "G4", title: "All work must represent the skill level of the Students on the Team", description: "All work must represent the skill level of the Students currently on the Team. Teachers, coaches, mentors, and peers can teach concepts, skills, and processes; demonstrate techniques; ask guiding questions; review/critique the Team’s work;…" },
  { id: "G5", title: "Each Student can only belong to one Team", description: "Each Team must include Drive Team Members, Coder(s), Designer(s), and Builder(s). Many also include Strategists and Notebooker(s).…" },
  { id: "G6", title: "There is a difference between accidentally and willfully violating a Robot rule", description: "Any Violation of Robot rules, accidental or intentional, will result in a Team being unable to play until they pass inspection (per <R2d>).…" },
];

const VUG: Rule[] = [
  { id: "VUG1", title: "Different Robot starting sizes", description: "" },
  { id: "VUG2", title: "Different Robot placement than rule GG10", description: "" },
  { id: "VUG3", title: "Some electronic devices may be moving at the beginning of the Match", description: "" },
  { id: "VUG4", title: "Different availability of Loaders", description: "" },
  { id: "VUG5", title: "Different scoring during the Autonomous Period", description: "" },
  { id: "VUG6", title: "Different Autonomous Win Point criteria", description: "" },
  { id: "VUG7", title: "Different expansion in the Midfield during the Endgame period", description: "1-Team VUT2 Qualification Matches will be conducted in the same manner as in a V5RC Tournament VUT3 Elimination Matches will be conducted in the same manner, but without an Alliance Selection VUT4 The Autonomous Period at the beginning of e…" },
];

const IQ_SG: Rule[] = [
  { id: "SG1", title: "Starting a Match", description: "At the beginning of a Match, the Robot must be placed such that it meets all of the following criteria: a. Fit within an 11” wide x 20” long x 15” high (279mm x 508mm x 381mm) volume, as checked during inspection per R3. b.…" },
  { id: "SG2", title: "Horizontal expansion is limited", description: "Once the Match begins, Robots may expand horizontally up to a length of 24”. The Robot can never be larger than 11”x24”, and must always be able to fit within an 11”x24” rectangular horizontal footprint.…" },
  { id: "SG3", title: "Vertical expansion is unlimited", description: "Once the Match begins, Robots may expand vertically beyond the 15” starting size limit with no limits." },
  { id: "SG4", title: "Keep Scoring Objects in the Field", description: "Scoring Objects that leave the Field during a Match will not be returned to the Field, and cannot be reintroduced by the Loaders. a.…" },
  { id: "SG5", title: "Each Robot gets one yellow Bean Bag as a Preload", description: "Prior to the start of each Match, each Preload must be placed such that it meets all of the following criteria: a. Contacting exactly one Robot.…" },
  { id: "SG6", title: "Possession is limited to one (1) Bean Bag", description: "Possession and Plowing are limited to one (1) Bean Bag. A Robot cannot have greater-than-momentary Possession of and/or Plow more than one Bean Bag at once.…" },
  { id: "SG7", title: "Using the Load Zone", description: "Bean Bags may be Loaded one at a time through the Load Zone during the Match, and must meet all of the following criteria. a. Red and blue Bean Bags may only be Loaded into the Load Zone that matches the color of that Bean Bag. b.…" },
];

const IQ_GG: Rule[] = [
  { id: "GG1", title: "Drivers drive your Robot, and stay in the Driver Station", description: "During a Match, Robots may only be operated by that Team’s Drivers and/or software running on the Robot’s control system.…" },
  { id: "GG2", title: "A Team's Robot should attend every Match", description: "The Team’s Robot must be in the Driver Station or on the Field for the Team’s assigned Match, even if the Robot is not functional.…" },
  { id: "GG3", title: "Robots on the Field must be ready to play", description: "When a Team puts their Robot on the Field, it must be prepared to play (i.e., battery charged, sized within the starting size constraint, etc.). a. Robots must be placed on the Field promptly.…" },
  { id: "GG4", title: "Hands out of the Field", description: "During a Match, Drive Team Members are prohibited from making intentional contact with any Field Element, Robot, or Scoring Object that has been introduced to the Field, except for the allowances in GG10, RSC5, and SG7. a.…" },
  { id: "GG5", title: "Match Replays are allowed, but rare", description: "Match replays (i.e., playing a Match over again from its start) must be agreed upon by both the Event Partner and Head Referee, and will only be issued in the most extreme circumstances.…" },
  { id: "GG6", title: "Disqualifications", description: "A Team that is issued a Disqualification in a Qualification Match receives zero points for the Match. The other Team on their Alliance will still receive points for the Match. a.…" },
  { id: "GG7", title: "Time-outs", description: "There are no time-outs in VIQRC Tournaments." },
  { id: "GG8", title: "Keep your Robot together", description: "Robots may not intentionally detach parts or leave mechanisms on the Field during any Match. a.…" },
  { id: "GG9", title: "Don't damage the Field", description: "Robot interactions which damage the Field or any Field Elements are prohibited. For the purpose of this rule, “damage” is defined as anything which requires repair in order to begin the next Match, such as causing part of a Goal to detach f…" },
  { id: "GG10", title: "Handling the Robot mid-Match is allowed under certain circumstances", description: "If a Robot goes completely outside the playing Field, gets stuck, tips over, or otherwise requires assistance, the Drive Team Members may retrieve & reset their Robot with the Head Referee’s permission.…" },
  { id: "GG11", title: "A Team's two Drivers switch controllers midway through the Match", description: "In a given Match, up to two (2) Drivers may be in the Driver Station per Team. The two Drivers must switch their controller between thirty-five seconds (0:35 on the Match timer) and twenty-five seconds (0:25 on the Match timer) remaining in…" },
  { id: "GG12", title: "Don't start before the timer, and stop moving at the end of the Match", description: "Driver inputs and Robot may not begin before the Match timer starts, and must cease at the end of the Match, when the timer reaches 0:00. a.…" },
  { id: "GG13", title: "Ending a Match early", description: "If an Alliance wants to end a Qualification Match or a Finals Match early, both Teams must signal the referee by ceasing all Robot motion and placing their controllers on the ground.…" },
  { id: "GG14", title: "Drive Team Members are permitted to appeal the Head Referee's ruling", description: "If Drive Team Members wish to dispute a score or ruling, they must stay in the Driver Station until the Head Referee talks with them.…" },
];

const IQ_G: Rule[] = [
  { id: "G1", title: "Treat everyone with respect", description: "All Teams and other attendees are expected to conduct themselves in a respectful and professional manner while participating in or attending VEX IQ Robotics Competition events.…" },
  { id: "G2", title: "VIQRC is a Student-centered program", description: "Adults should not make decisions about the Team’s/Robot’s build, design, coding, documentation, or gameplay, and should not provide an unfair advantage by providing ‘help’ that is beyond the Students’ independent abilities.…" },
  { id: "G3", title: "Use common sense", description: "When reading and applying the various rules in this document, please remember that common sense always applies in the VEX IQ Robotics Competition.…" },
  { id: "G4", title: "All work must represent the skill level of the Students on the Team", description: "All work must represent the skill level of the Students currently on the Team. Teachers, coaches, mentors, and peers can teach concepts, skills, and processes; demonstrate techniques; ask guiding questions; review/critique the Team’s work;…" },
  { id: "G5", title: "Each Student can only belong to one Team", description: "Each Team must include Drive Team Members, Coder(s), Designer(s), and Builder(s). Many also include Strategists and Notebooker(s).…" },
  { id: "G6", title: "There is a difference between accidentally and willfully violating a Robot rule", description: "Any Violation of Robot rules, accidental or intentional, will result in a Team being unable to play until they pass inspection (per <R2d>).…" },
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

export function programFromEvent(input?: { code?: string | null; name?: string | null }): Program {
  const s = `${input?.code ?? ""} ${input?.name ?? ""}`.toUpperCase();
  if (s.includes("IQ")) return "VIQRC";
  if (s.includes("VEXU") || s.includes("VEX U") || s.includes("VURC") || s.includes("UNIVERSITY") || s.includes("COLLEGE")) {
    return "VEXU";
  }
  return "V5RC";
}

export function ruleInfo(id: string, program?: Program): Rule | undefined {
  const cats = program ? rulesForProgram(program) : [...VEXU_CATEGORIES, ...VIQRC_CATEGORIES];
  for (const c of cats) {
    const r = c.rules.find((x) => x.id === id);
    if (r) return r;
  }
  return undefined;
}

export function ruleTitle(id: string, program?: Program): string | undefined {
  return ruleInfo(id, program)?.title;
}
